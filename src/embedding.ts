import ort = require("onnxruntime-node");
import { Jimp } from "jimp";
import { ARCFACE_INPUT_SIZE, MODEL_PATHS } from "./config/constants";

type InferenceSession = Awaited<ReturnType<typeof ort.InferenceSession.create>>;
let arcfaceSession: InferenceSession | null = null;

export const initModels = async () => {
  arcfaceSession = await ort.InferenceSession.create(MODEL_PATHS.ARCFACE);

  // Load RetinaFace model (required)
  const { initRetinaFaceModel } = await import("./retinaface.js");
  await initRetinaFaceModel(MODEL_PATHS.RETINAFACE, "resnet50");
};

// helper: decode base64 to tensor
export const preprocessImage = async (base64: string) => {
  const buffer = Buffer.from(base64, "base64");
  const image = await Jimp.read(buffer);
  await image.resize({ w: ARCFACE_INPUT_SIZE, h: ARCFACE_INPUT_SIZE });

  // Jimp is RGBA; we will extract RGB and normalize per channel
  const data = new Float32Array(3 * ARCFACE_INPUT_SIZE * ARCFACE_INPUT_SIZE);
  let ptr = 0;
  const { width, height, data: bitmapData } = image.bitmap;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) * 4;
      data[ptr++] = (bitmapData[idx] / 255.0 - 0.5) / 0.5; // R
      data[ptr++] = (bitmapData[idx + 1] / 255.0 - 0.5) / 0.5; // G
      data[ptr++] = (bitmapData[idx + 2] / 255.0 - 0.5) / 0.5; // B
    }
  }
  return data;
};


export interface Landmark {
  Type: string;  // "eyeLeft", "eyeRight", "nose", "mouthLeft", "mouthRight"
  X: number;     // Normalized [0, 1]
  Y: number;     // Normalized [0, 1]
  PixelX: number;  // Absolute pixel position
  PixelY: number;  // Absolute pixel position
}

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
  Landmarks?: Landmark[];
}

export const computeEmbedding = async (preprocessed: Float32Array) => {
  if (!arcfaceSession) {
    throw new Error("ArcFace model not initialized");
  }
  const tensor = new ort.Tensor("float32", preprocessed, [1, 3, ARCFACE_INPUT_SIZE, ARCFACE_INPUT_SIZE]);
  const results = await arcfaceSession.run({ data: tensor });
  const firstKey = Object.keys(results)[0];
  const embedding = results[firstKey].data as Float32Array;
  return Array.from(embedding);
};

/**
 * Detect all faces using RetinaFace (alternative to SCRFD)
 * Returns faces with same interface as detectAllFaces
 */
export const detectAllFacesWithRetinaFace = async (base64: string, visThreshold: number = 0.6): Promise<DetectedFace[]> => {
  const {
    isRetinaFaceModelAvailable,
    detectFacesRetinaFace,
    convertRetinaFaceToDetectedFace
  } = await import("./retinaface.js");

  if (!isRetinaFaceModelAvailable()) {
    throw new Error("RetinaFace model not initialized");
  }

  // Get original image dimensions
  const buffer = Buffer.from(base64, "base64");
  const originalImage = await Jimp.read(buffer);
  const originalWidth = originalImage.bitmap.width;
  const originalHeight = originalImage.bitmap.height;

  // Detect faces using RetinaFace
  const detections = await detectFacesRetinaFace(base64, visThreshold);

  // Convert to standard DetectedFace format
  const detectedFaces = detections.map((detection: { bbox: number[]; confidence: number; landmarks: number[][] }) =>
    convertRetinaFaceToDetectedFace(detection, originalWidth, originalHeight)
  );

  // Sort by area (largest first) - same as SCRFD
  detectedFaces.sort((a: DetectedFace, b: DetectedFace) => b.Area - a.Area);

  return detectedFaces;
};


