import ort = require("onnxruntime-node");
import { Jimp } from "jimp";

// RetinaFace model configurations
export const cfg_mnet = {
  name: "mobilenet0.25",
  min_sizes: [[16, 32], [64, 128], [256, 512]],
  steps: [8, 16, 32],
  variance: [0.1, 0.2],
  clip: false,
  image_size: 640,
};

export const cfg_re50 = {
  name: "Resnet50",
  min_sizes: [[16, 32], [64, 128], [256, 512]],
  steps: [8, 16, 32],
  variance: [0.1, 0.2],
  clip: false,
  image_size: 840,
};

// RetinaFace detection parameters
const CONFIDENCE_THRESHOLD = 0.02;
const TOP_K = 5000;
const NMS_THRESHOLD = 0.4;
const KEEP_TOP_K = 750;
const VIS_THRESHOLD = 0.6;

type InferenceSession = Awaited<ReturnType<typeof ort.InferenceSession.create>>;
let retinaSession: InferenceSession | null = null;
let retinaConfig: typeof cfg_mnet | typeof cfg_re50 = cfg_re50;

/**
 * Initialize RetinaFace model
 * @param modelPath - Path to RetinaFace ONNX model
 * @param arch - Architecture: 'resnet50' or 'mobile0.25'
 */
export const initRetinaFaceModel = async (
  modelPath: string,
  arch: "resnet50" | "mobile0.25" = "resnet50"
) => {
  retinaSession = await ort.InferenceSession.create(modelPath);
  retinaConfig = arch === "resnet50" ? cfg_re50 : cfg_mnet;
  console.log(`✓ RetinaFace ${arch} model loaded successfully`);
};

/**
 * Check if RetinaFace model is available
 */
export const isRetinaFaceModelAvailable = (): boolean => {
  return retinaSession !== undefined && retinaSession !== null;
};

/**
 * Prior Box generator for RetinaFace
 */
class PriorBox {
  private min_sizes: number[][];
  private steps: number[];
  private image_size: [number, number];
  private feature_maps: [number, number][];

  constructor(cfg: typeof cfg_mnet | typeof cfg_re50, image_size: [number, number]) {
    this.min_sizes = cfg.min_sizes;
    this.steps = cfg.steps;
    this.image_size = image_size;
    this.feature_maps = this.steps.map((step) => [
      Math.ceil(this.image_size[0] / step),
      Math.ceil(this.image_size[1] / step),
    ]);
  }

  forward(): number[][] {
    const anchors: number[] = [];
    for (let k = 0; k < this.feature_maps.length; k++) {
      const f = this.feature_maps[k];
      const min_sizes = this.min_sizes[k];

      for (let i = 0; i < f[0]; i++) {
        for (let j = 0; j < f[1]; j++) {
          for (const min_size of min_sizes) {
            const s_kx = min_size / this.image_size[1];
            const s_ky = min_size / this.image_size[0];
            const dense_cx = (j + 0.5) * this.steps[k] / this.image_size[1];
            const dense_cy = (i + 0.5) * this.steps[k] / this.image_size[0];

            anchors.push(dense_cx, dense_cy, s_kx, s_ky);
          }
        }
      }
    }

    // Reshape to [num_anchors, 4]
    const result: number[][] = [];
    for (let i = 0; i < anchors.length; i += 4) {
      result.push([anchors[i], anchors[i + 1], anchors[i + 2], anchors[i + 3]]);
    }
    return result;
  }
}

/**
 * Decode bounding boxes from predictions
 */
function decode(loc: number[][], priors: number[][], variances: number[]): number[][] {
  const boxes: number[][] = [];

  for (let i = 0; i < priors.length; i++) {
    const prior = priors[i];
    const l = loc[i];

    // Center
    const cx = prior[0] + l[0] * variances[0] * prior[2];
    const cy = prior[1] + l[1] * variances[0] * prior[3];

    // Size
    const w = prior[2] * Math.exp(l[2] * variances[1]);
    const h = prior[3] * Math.exp(l[3] * variances[1]);

    // Convert to [x1, y1, x2, y2]
    const x1 = cx - w / 2;
    const y1 = cy - h / 2;
    const x2 = cx + w / 2;
    const y2 = cy + h / 2;

    boxes.push([x1, y1, x2, y2]);
  }

  return boxes;
}

/**
 * Decode landmarks from predictions
 */
function decodeLandmarks(pre: number[][], priors: number[][], variances: number[]): number[][] {
  const landmarks: number[][] = [];

  for (let i = 0; i < priors.length; i++) {
    const prior = priors[i];
    const p = pre[i];

    const landm: number[] = [];
    for (let j = 0; j < 5; j++) {
      const x = prior[0] + p[j * 2] * variances[0] * prior[2];
      const y = prior[1] + p[j * 2 + 1] * variances[0] * prior[3];
      landm.push(x, y);
    }
    landmarks.push(landm);
  }

  return landmarks;
}

/**
 * Non-Maximum Suppression
 */
function nms(dets: number[][], threshold: number): number[] {
  const x1 = dets.map((d) => d[0]);
  const y1 = dets.map((d) => d[1]);
  const x2 = dets.map((d) => d[2]);
  const y2 = dets.map((d) => d[3]);
  const scores = dets.map((d) => d[4]);

  const areas = dets.map((d, i) => (x2[i] - x1[i] + 1) * (y2[i] - y1[i] + 1));
  const order = scores
    .map((score, idx) => ({ score, idx }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.idx);

  const keep: number[] = [];
  const suppressed = new Set<number>();

  for (const i of order) {
    if (suppressed.has(i)) continue;
    keep.push(i);

    for (const j of order) {
      if (i === j || suppressed.has(j)) continue;

      const xx1 = Math.max(x1[i], x1[j]);
      const yy1 = Math.max(y1[i], y1[j]);
      const xx2 = Math.min(x2[i], x2[j]);
      const yy2 = Math.min(y2[i], y2[j]);

      const w = Math.max(0.0, xx2 - xx1 + 1);
      const h = Math.max(0.0, yy2 - yy1 + 1);
      const inter = w * h;
      const ovr = inter / (areas[i] + areas[j] - inter);

      if (ovr > threshold) {
        suppressed.add(j);
      }
    }
  }

  return keep;
}

/**
 * Preprocess image for RetinaFace detection
 * Subtracts mean RGB values and transposes to CHW format
 */
export const preprocessForRetinaFace = async (
  base64: string,
  targetSize?: number
): Promise<{ data: Float32Array; originalWidth: number; originalHeight: number }> => {
  const buffer = Buffer.from(base64, "base64");
  const image = await Jimp.read(buffer);
  const originalWidth = image.bitmap.width;
  const originalHeight = image.bitmap.height;

  // Resize if target size is specified
  if (targetSize) {
    await image.resize({ w: targetSize, h: targetSize });
  }

  const { width, height, data: bitmapData } = image.bitmap;
  const inputData = new Float32Array(3 * width * height);

  // RGB mean values for RetinaFace
  const meanValues = [104, 117, 123];

  // Convert to CHW format and subtract mean
  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4 + c;
        const pixelValue = bitmapData[idx] - meanValues[c];
        inputData[c * width * height + y * width + x] = pixelValue;
      }
    }
  }

  return { data: inputData, originalWidth, originalHeight };
};

export interface RetinaFaceDetection {
  bbox: number[]; // [x1, y1, x2, y2]
  confidence: number;
  landmarks: number[][]; // [[x1, y1], [x2, y2], [x3, y3], [x4, y4], [x5, y5]]
}

/**
 * Extract model outputs (loc, conf, landms) from ONNX session outputs
 */
interface ModelOutputs {
  loc: Float32Array;
  conf: Float32Array;
  landms: Float32Array;
}

const extractModelOutputs = (outputs: Record<string, InstanceType<typeof ort.Tensor>>): ModelOutputs => {
  const outputKeys = Object.keys(outputs);
  let loc: Float32Array | undefined;
  let conf: Float32Array | undefined;
  let landms: Float32Array | undefined;

  // Find outputs by shape
  // - loc: [1, num_anchors, 4] - bounding box deltas
  // - conf: [1, num_anchors, 2] - background/face scores
  // - landms: [1, num_anchors, 10] - 5 landmark points (x, y) × 5
  for (const key of outputKeys) {
    const tensor = outputs[key];
    const dims = tensor.dims;

    if (dims.length === 3 && dims[2] === 4) {
      loc = tensor.data as Float32Array;
    } else if (dims.length === 3 && dims[2] === 2) {
      conf = tensor.data as Float32Array;
    } else if (dims.length === 3 && dims[2] === 10) {
      landms = tensor.data as Float32Array;
    }
  }

  if (!loc || !conf || !landms) {
    throw new Error("Failed to extract RetinaFace outputs");
  }

  return { loc, conf, landms };
};

/**
 * Convert flat Float32Arrays to 2D number arrays
 */
interface ConvertedArrays {
  locArray: number[][];
  confArray: number[][];
  landmsArray: number[][];
  scores: number[];
}

const convertFlatArraysTo2D = (
  { loc, conf, landms }: ModelOutputs,
  numAnchors: number
): ConvertedArrays => {
  const locArray: number[][] = [];
  const confArray: number[][] = [];
  const landmsArray: number[][] = [];

  for (let i = 0; i < numAnchors; i++) {
    locArray.push([
      loc[i * 4],
      loc[i * 4 + 1],
      loc[i * 4 + 2],
      loc[i * 4 + 3],
    ]);
    confArray.push([conf[i * 2], conf[i * 2 + 1]]);
    landmsArray.push([
      landms[i * 10],
      landms[i * 10 + 1],
      landms[i * 10 + 2],
      landms[i * 10 + 3],
      landms[i * 10 + 4],
      landms[i * 10 + 5],
      landms[i * 10 + 6],
      landms[i * 10 + 7],
      landms[i * 10 + 8],
      landms[i * 10 + 9],
    ]);
  }

  // Extract scores (face probability from confidence array)
  const scores = confArray.map((c) => c[1]);

  return { locArray, confArray, landmsArray, scores };
};

/**
 * Scale boxes and landmarks to pixel coordinates
 */
interface ScaledData {
  scaledBoxes: number[][];
  scaledLandmarks: number[][];
}

const scaleToPixelCoordinates = (
  boxes: number[][],
  landmarks: number[][],
  originalWidth: number,
  originalHeight: number
): ScaledData => {
  const scale = [originalWidth, originalHeight, originalWidth, originalHeight];
  const scaledBoxes = boxes.map((box) => [
    box[0] * scale[0],
    box[1] * scale[1],
    box[2] * scale[2],
    box[3] * scale[3],
  ]);

  const scale1 = Array(10).fill(0).map((_, i) =>
    i % 2 === 0 ? originalWidth : originalHeight
  );
  const scaledLandmarks = landmarks.map((landm) =>
    landm.map((val, i) => val * scale1[i])
  );

  return { scaledBoxes, scaledLandmarks };
};

/**
 * Filter detections by confidence threshold and sort by score
 */
interface FilteredData {
  boxes: number[][];
  scores: number[];
  landmarks: number[][];
}

const filterAndSortByConfidence = (
  scaledBoxes: number[][],
  scores: number[],
  scaledLandmarks: number[][]
): FilteredData => {
  // Filter by confidence threshold
  const indices: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > CONFIDENCE_THRESHOLD) {
      indices.push(i);
    }
  }

  let filteredBoxes = indices.map((i) => scaledBoxes[i]);
  let filteredScores = indices.map((i) => scores[i]);
  let filteredLandmarks = indices.map((i) => scaledLandmarks[i]);

  // Sort by score (descending)
  const sortedIndices = filteredScores
    .map((score, idx) => ({ score, idx }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.idx);

  // Keep top-K before NMS
  const topK = sortedIndices.slice(0, TOP_K);
  filteredBoxes = topK.map((i) => filteredBoxes[i]);
  filteredScores = topK.map((i) => filteredScores[i]);
  filteredLandmarks = topK.map((i) => filteredLandmarks[i]);

  return {
    boxes: filteredBoxes,
    scores: filteredScores,
    landmarks: filteredLandmarks,
  };
};

/**
 * Apply Non-Maximum Suppression and return final indices
 */
const applyNonMaximumSuppression = (
  boxes: number[][],
  scores: number[]
): number[] => {
  // Prepare for NMS: combine boxes and scores
  const dets = boxes.map((box, i) => [...box, scores[i]]);

  // Apply NMS
  const keep = nms(dets, NMS_THRESHOLD);

  // Keep top-K after NMS
  return keep.slice(0, KEEP_TOP_K);
};

/**
 * Format final detection results
 */
const formatDetectionResults = (
  indices: number[],
  boxes: number[][],
  scores: number[],
  landmarks: number[][],
  visThreshold: number
): RetinaFaceDetection[] => {
  const detections: RetinaFaceDetection[] = [];

  for (const idx of indices) {
    const confidence = scores[idx];
    if (confidence >= visThreshold) {
      const bbox = boxes[idx];
      const landm = landmarks[idx];

      detections.push({
        bbox: bbox,
        confidence: confidence,
        landmarks: [
          [landm[0], landm[1]], // left eye
          [landm[2], landm[3]], // right eye
          [landm[4], landm[5]], // nose
          [landm[6], landm[7]], // left mouth
          [landm[8], landm[9]], // right mouth
        ],
      });
    }
  }

  return detections;
};

/**
 * Detect faces using RetinaFace
 * @param base64 - Base64 encoded image
 * @param visThreshold - Visibility threshold for filtering detections (default: 0.6)
 * @returns Array of face detections with bounding boxes, confidence scores, and landmarks
 */
export const detectFacesRetinaFace = async (
  base64: string,
  visThreshold: number = VIS_THRESHOLD
): Promise<RetinaFaceDetection[]> => {
  if (!retinaSession) {
    throw new Error("RetinaFace model not initialized");
  }

  const imageSize = retinaConfig.image_size;
  const { data: inputData, originalWidth, originalHeight } =
    await preprocessForRetinaFace(base64, imageSize);

  // Step 1: Run inference
  const tensor = new ort.Tensor("float32", inputData, [1, 3, imageSize, imageSize]);
  const outputs = await retinaSession.run({ "input0": tensor });

  // Step 2: Extract model outputs
  const modelOutputs = extractModelOutputs(outputs);

  // Step 3: Generate prior boxes
  const priorbox = new PriorBox(retinaConfig, [imageSize, imageSize]);
  const priors = priorbox.forward();

  // Step 4: Convert flat arrays to 2D arrays
  const { locArray, landmsArray, scores } = convertFlatArraysTo2D(
    modelOutputs,
    priors.length
  );

  // Step 5: Decode boxes and landmarks
  const boxes = decode(locArray, priors, retinaConfig.variance);
  const landmarks = decodeLandmarks(landmsArray, priors, retinaConfig.variance);

  // Step 6: Scale to pixel coordinates
  const { scaledBoxes, scaledLandmarks } = scaleToPixelCoordinates(
    boxes,
    landmarks,
    originalWidth,
    originalHeight
  );

  // Step 7: Filter by confidence and sort
  const { boxes: filteredBoxes, scores: filteredScores, landmarks: filteredLandmarks } =
    filterAndSortByConfidence(scaledBoxes, scores, scaledLandmarks);

  // Step 8: Apply Non-Maximum Suppression
  const finalIndices = applyNonMaximumSuppression(filteredBoxes, filteredScores);

  // Step 9: Format and return final results
  return formatDetectionResults(
    finalIndices,
    filteredBoxes,
    filteredScores,
    filteredLandmarks,
    visThreshold
  );
};

/**
 * Convert RetinaFace detections to the standard DetectedFace format
 */
export interface DetectedFace {
  BoundingBox: {
    Left: number;
    Top: number;
    Width: number;
    Height: number;
  };
  Confidence: number;
  Area: number;
  PixelBoundingBox: {
    Left: number;
    Top: number;
    Width: number;
    Height: number;
  };
  Landmarks?: Array<{
    Type: string;
    X: number;
    Y: number;
    PixelX: number;
    PixelY: number;
  }>;
}

export const convertRetinaFaceToDetectedFace = (
  detection: RetinaFaceDetection,
  imageWidth: number,
  imageHeight: number
): DetectedFace => {
  const [x1, y1, x2, y2] = detection.bbox;
  const width = x2 - x1;
  const height = y2 - y1;

  const landmarkTypes = ["eyeLeft", "eyeRight", "nose", "mouthLeft", "mouthRight"];
  const landmarks = detection.landmarks.map(([x, y], i) => ({
    Type: landmarkTypes[i],
    X: x / imageWidth,
    Y: y / imageHeight,
    PixelX: Math.round(x),
    PixelY: Math.round(y),
  }));

  return {
    BoundingBox: {
      Left: x1 / imageWidth,
      Top: y1 / imageHeight,
      Width: width / imageWidth,
      Height: height / imageHeight,
    },
    Confidence: detection.confidence * 100,
    Area: (width / imageWidth) * (height / imageHeight),
    PixelBoundingBox: {
      Left: Math.round(x1),
      Top: Math.round(y1),
      Width: Math.round(width),
      Height: Math.round(height),
    },
    Landmarks: landmarks,
  };
};
