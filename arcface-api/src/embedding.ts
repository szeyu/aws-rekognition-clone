import ort = require("onnxruntime-node");
import { Jimp } from "jimp";

const SCRFD_MODEL = "./models/scrfd.onnx";
const ARC_FACE_MODEL = "./models/arcface.onnx";

let scrfdSession: any;
let arcfaceSession: any;

export const initModels = async () => {
  scrfdSession = await ort.InferenceSession.create(SCRFD_MODEL);
  arcfaceSession = await ort.InferenceSession.create(ARC_FACE_MODEL);
};

// helper: decode base64 to tensor
export const preprocessImage = async (base64: string) => {
  const buffer = Buffer.from(base64, "base64");
  const image = await Jimp.read(buffer);
  await image.resize({ w: 112, h: 112 }); // ArcFace input size

  // Jimp is RGBA; we will extract RGB and normalize per channel
  const data = new Float32Array(3 * 112 * 112);
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

// NOTE: SCRFD detection simplified for single face
export const detectFace = async (_base64: string) => {
  // For simplicity, assume image already roughly cropped and has exactly one face.
  // If you later enable detection, run scrfdSession with input tensor and parse boxes.
  return true;
};

export const computeEmbedding = async (preprocessed: Float32Array) => {
  const tensor = new ort.Tensor("float32", preprocessed, [1, 3, 112, 112]);
  const results = await arcfaceSession.run({ data: tensor });
  const firstKey = Object.keys(results)[0];
  const embedding = results[firstKey].data as Float32Array;
  return Array.from(embedding);
};


