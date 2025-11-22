import { promises as fs } from "fs";
import path from "path";
import { preprocessImage, computeEmbedding, detectAllFacesWithRetinaFace } from "../embedding";

const PROJECT_DATA_DIR = process.env.PROJECT_DATA_DIR
  ? path.join(process.cwd(), process.env.PROJECT_DATA_DIR)
  : path.join(process.cwd(), "project_data");

const resolvePath = (imagePath: string): string => {
  // If absolute path, check if it's a container path or host path
  if (path.isAbsolute(imagePath)) {
    // In Docker environment
    if (process.cwd() === "/app") {
      // If path is already inside container (starts with /app), use as-is
      // These are files created inside the container (like output/cropped_faces/)
      if (imagePath.startsWith("/app")) {
        return imagePath;
      }
      
      // Otherwise, it's a host absolute path - map it to the mounted host directory
      const hostHome = process.env.HOST_HOME || "";
      // If path starts with host home directory, strip it and prepend /host
      if (hostHome && imagePath.startsWith(hostHome)) {
        const relativePath = imagePath.slice(hostHome.length);
        return path.join("/host", relativePath);
      }
      // If path doesn't start with home, try direct mapping
      return path.join("/host", path.basename(imagePath));
    }
    // Running locally - use path as-is
    return imagePath;
  }
  
  // For relative paths, resolve against host mount in Docker
  if (process.cwd() === "/app") {
    const hostHome = process.env.HOST_HOME || "";
    const hostProjectDir = process.env.HOST_PROJECT_DIR || "";
    
    // Try to resolve relative to project directory first (for project files like examples/)
    if (hostProjectDir && hostHome && hostProjectDir.startsWith(hostHome)) {
      // Calculate project path relative to home: /Users/user/project -> project
      const projectRelativePath = hostProjectDir.slice(hostHome.length).replace(/^\//, "");
      const projectPath = path.join("/host", projectRelativePath, imagePath);
      return projectPath;
    }
    
    // Fallback: resolve relative to home directory root (for files like Downloads/)
    return path.join("/host", imagePath);
  }
  
  // Local development - regular path resolution
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
    const error = new Error("no_face_detected");
    // @ts-expect-error add custom property for easier handling
    error.code = "NO_FACE";
    throw error;
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


