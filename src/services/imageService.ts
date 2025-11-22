import { promises as fs } from "fs";
import path from "path";
import { preprocessImage, computeEmbedding, detectAllFacesWithRetinaFace } from "../embedding";
import { NoFaceDetectedError } from "../utils/errors";

const PROJECT_DATA_DIR = process.env.PROJECT_DATA_DIR
  ? path.join(process.cwd(), process.env.PROJECT_DATA_DIR)
  : path.join(process.cwd(), "project_data");

/**
 * Resolve file path for reading/writing files
 *
 * NOTE: this function is ONLY used for internal operations 
 * (reading cropped faces from output/cropped_faces/).
 */
const resolvePath = (imagePath: string): string => {
  // Absolute paths are used as-is (e.g., /app/output/cropped_faces/face_0.jpg)
  if (path.isAbsolute(imagePath)) {
    return imagePath;
  }

  // Relative paths are resolved from current working directory
  return path.resolve(process.cwd(), imagePath);
};

export const readImageAsBase64 = async (imagePath: string): Promise<string> => {
  const absolutePath = resolvePath(imagePath);
  const fileBuffer = await fs.readFile(absolutePath);
  return fileBuffer.toString("base64");
};

export const ensureFaceDetected = async (imageBase64: string): Promise<void> => {
  const faces = await detectAllFacesWithRetinaFace(imageBase64);
  if (faces.length === 0) {
    throw new NoFaceDetectedError();
  }
};

export const embeddingFromBase64 = async (imageBase64: string): Promise<number[]> => {
  const tensor = await preprocessImage(imageBase64);
  return computeEmbedding(tensor);
};

export const saveImageToProjectData = async (imagePath: string, uuid: string): Promise<string> => {
  await fs.mkdir(PROJECT_DATA_DIR, { recursive: true });

  const absolutePath = resolvePath(imagePath);
  const fileBuffer = await fs.readFile(absolutePath);

  // Always save as .jpg regardless of original format
  const savedPath = path.join(PROJECT_DATA_DIR, `${uuid}.jpg`);
  await fs.writeFile(savedPath, fileBuffer);

  return savedPath;
};

export const prepareEmbeddingFromPath = async (imagePath: string) => {
  const imageBase64 = await readImageAsBase64(imagePath);
  await ensureFaceDetected(imageBase64);
  const embedding = await embeddingFromBase64(imageBase64);
  return { imageBase64, embedding };
};


