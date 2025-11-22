import { Request, Response } from "express";
import { randomUUID } from "crypto";
import {
  readImageAsBase64,
  embeddingFromBase64,
  ensureFaceDetected,
  saveImageToProjectData
} from "../services/imageService";
import { insertEmbedding, searchSimilarEmbeddings } from "../services/dbService";
import { getCroppedFacePaths, cropAndSaveFaces } from "../services/cropFacesService";
import { sendErrorResponse, validateBase64Image } from "../utils/responseHelpers";
import { getErrorMessage } from "../utils/errors";

export const storeEmbedding = async (req: Request, res: Response) => {
  try {
    const { image_base64 } = req.body as { image_base64?: string };
    if (!validateBase64Image(res, image_base64)) return;

    // Step 1: Validate input is base64
    const imageBase64 = image_base64;

    // Step 2: Detect faces using RetinaFace and crop to output/cropped_faces/
    // This clears the folder and saves all detected faces
    const faceCount = await cropAndSaveFaces(imageBase64);

    // Step 3: Get all cropped face paths
    const facePaths = await getCroppedFacePaths();

    const results: Array<{ face: string; id: string }> = [];
    const errors: Array<{ face: string; error: string }> = [];

    // Step 4: Loop through each cropped face and store embedding
    for (let i = 0; i < facePaths.length; i++) {
      const facePath = facePaths[i];
      const faceName = `face_${i}`;

      try {
        // Read cropped face as base64
        const faceBase64 = await readImageAsBase64(facePath);

        // Generate UUID for this face
        const uuid = randomUUID();

        // Save cropped face to project_data
        const savedPath = await saveImageToProjectData(facePath, uuid);

        // Compute embedding (no face detection needed - already cropped)
        const embedding = await embeddingFromBase64(faceBase64);

        // Insert into DB
        const id = await insertEmbedding(embedding, savedPath, uuid);

        results.push({ face: faceName, id });
      } catch (err: unknown) {
        errors.push({ face: faceName, error: getErrorMessage(err) });
      }
    }

    res.json({
      total_faces: faceCount,
      stored: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err: unknown) {
    sendErrorResponse(res, err);
  }
};

export const compareEmbeddings = async (req: Request, res: Response) => {
  try {
    const { image_base64_A, image_base64_B } = req.body as {
      image_base64_A?: string;
      image_base64_B?: string;
    };
    if (!validateBase64Image(res, image_base64_A, "image_base64_A")) return;
    if (!validateBase64Image(res, image_base64_B, "image_base64_B")) return;

    // Validate faces exist and compute embeddings
    await Promise.all([
      ensureFaceDetected(image_base64_A),
      ensureFaceDetected(image_base64_B)
    ]);

    const [embA, embB] = await Promise.all([
      embeddingFromBase64(image_base64_A),
      embeddingFromBase64(image_base64_B)
    ]);

    // cosine similarity
    const dot = embA.reduce((acc, v, i) => acc + v * embB[i], 0);
    const normA = Math.sqrt(embA.reduce((acc, v) => acc + v * v, 0));
    const normB = Math.sqrt(embB.reduce((acc, v) => acc + v * v, 0));
    const cosine = dot / (normA * normB);

    // euclidean distance
    const euclidean = Math.sqrt(embA.reduce((acc, v, i) => acc + (v - embB[i]) ** 2, 0));

    res.json({ cosine, euclidean });
  } catch (err: unknown) {
    sendErrorResponse(res, err);
  }
};

export const searchEmbeddings = async (req: Request, res: Response) => {
  try {
    const { image_base64, top_k } = req.body as { image_base64?: string; top_k?: number | string };
    if (!validateBase64Image(res, image_base64)) return;
    if (top_k === undefined) {
      return res.status(400).json({ error: "Missing top_k" });
    }

    const limit = Number(top_k);
    if (!Number.isFinite(limit) || limit <= 0) {
      return res.status(400).json({ error: "Invalid top_k" });
    }

    // Step 1: Validate input is base64
    const imageBase64 = image_base64;

    // Step 2: Detect faces using RetinaFace and crop to output/cropped_faces/
    // This clears the folder and saves all detected faces
    const faceCount = await cropAndSaveFaces(imageBase64);

    // Step 3: Get all cropped face paths
    const facePaths = await getCroppedFacePaths();

    const results: Array<{ face: string; matches: Array<{ id: string; cosine: number }> }> = [];
    const errors: Array<{ face: string; error: string }> = [];

    // Step 4: Loop through each cropped face and search for similar embeddings
    for (let i = 0; i < facePaths.length; i++) {
      const facePath = facePaths[i];
      const faceName = `face_${i}`;

      try {
        // Read cropped face as base64
        const faceBase64 = await readImageAsBase64(facePath);

        // Compute embedding from cropped face
        const embedding = await embeddingFromBase64(faceBase64);

        // Search for similar embeddings
        const matches = await searchSimilarEmbeddings(embedding, limit);

        results.push({ face: faceName, matches });
      } catch (err: unknown) {
        errors.push({ face: faceName, error: getErrorMessage(err) });
      }
    }

    res.json({
      total_faces: faceCount,
      searched: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err: unknown) {
    sendErrorResponse(res, err);
  }
};
