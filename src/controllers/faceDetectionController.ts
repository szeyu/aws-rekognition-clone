import { Request, Response } from "express";
import { readImageAsBase64 } from "../services/imageService";
import { getImageDimensions, cropImageRegion } from "../utils/imageUtils";
import { detectAllFacesWithRetinaFace } from "../embedding";
import * as fs from "fs/promises";
import * as path from "path";

export interface FaceDetectionResponse {
  faces: Array<{
    boundingBox: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    confidence: number;
    landmarks?: Array<{
      type: string;
      x: number;
      y: number;
    }>;
  }>;
  faceCount: number;
  imageWidth: number;
  imageHeight: number;
  outputFolder?: string; // Present if save_crops is true
  croppedFaces?: string[]; // Present if save_crops is true
}

/**
 * Detect faces with RetinaFace
 * POST /api/detect-faces
 *
 * Request body:
 * - image_path: string - Path to image file
 * - save_crops: boolean (optional) - Save cropped faces to output/cropped_faces/
 * - confidence_threshold: number (optional) - Minimum confidence threshold (0-1), default 0.6
 *
 * Response:
 * - faces: Array of detected faces with bounding boxes and confidence scores
 * - faceCount: Number of faces detected
 * - imageWidth, imageHeight: Original image dimensions
 * - outputFolder: Path to output folder (if save_crops is true)
 * - croppedFaces: Array of cropped face file paths (if save_crops is true)
 */
export const detectFaces = async (req: Request, res: Response) => {
  try {
    const defaultConfidence = parseFloat(
      process.env.FACE_DETECTION_CONFIDENCE_THRESHOLD || "0.6"
    );

    const {
      image_path,
      save_crops = false,
      confidence_threshold = defaultConfidence,
    } = req.body as {
      image_path?: string;
      save_crops?: boolean;
      confidence_threshold?: number;
    };

    if (!image_path) {
      return res.status(400).json({ error: "Missing image_path" });
    }

    // Read image from file path
    const imageBase64 = await readImageAsBase64(image_path);

    // Get image dimensions
    const { width: imageWidth, height: imageHeight } =
      await getImageDimensions(imageBase64);

    // Detect faces using RetinaFace
    const detectedFaces = await detectAllFacesWithRetinaFace(
      imageBase64,
      confidence_threshold
    );

    // Faces are already filtered by confidence threshold in RetinaFace
    const filteredFaces = detectedFaces;

    // Format response
    const faces = filteredFaces.map((face) => ({
      boundingBox: {
        left: face.PixelBoundingBox.Left,
        top: face.PixelBoundingBox.Top,
        width: face.PixelBoundingBox.Width,
        height: face.PixelBoundingBox.Height,
      },
      confidence: face.Confidence / 100, // Normalize to 0-1
      landmarks: face.Landmarks?.map((landmark) => ({
        type: landmark.Type,
        x: landmark.PixelX,
        y: landmark.PixelY,
      })),
    }));

    const response: FaceDetectionResponse = {
      faces,
      faceCount: faces.length,
      imageWidth,
      imageHeight,
    };

    // Save cropped faces if requested
    if (save_crops && faces.length > 0) {
      const outputDir = path.join("output", "cropped_faces");

      // Clear and recreate output directory
      try {
        await fs.rm(outputDir, { recursive: true, force: true });
      } catch {
        // Ignore error if directory doesn't exist
      }
      await fs.mkdir(outputDir, { recursive: true });

      const croppedFaces: string[] = [];

      // Crop and save each face
      for (let i = 0; i < filteredFaces.length; i++) {
        const face = filteredFaces[i];
        const bbox = face.PixelBoundingBox;

        try {
          // Crop face from original image
          const croppedBase64 = await cropImageRegion(
            imageBase64,
            bbox.Left,
            bbox.Top,
            bbox.Width,
            bbox.Height
          );

          // Save cropped face
          const filename = `face_${i + 1}_conf_${(face.Confidence / 100).toFixed(2)}.jpg`;
          const filepath = path.join(outputDir, filename);

          // Convert base64 to buffer and save
          const buffer = Buffer.from(croppedBase64, "base64");
          await fs.writeFile(filepath, buffer);

          croppedFaces.push(filepath);
        } catch (err) {
          console.error(`Failed to crop face ${i + 1}:`, err);
        }
      }

      response.outputFolder = outputDir;
      response.croppedFaces = croppedFaces;
    }

    res.json(response);
  } catch (err: unknown) {
    console.error(err);

    const errorMessage = err instanceof Error ? err.message : undefined;
    if (
      (err && typeof err === "object" && "code" in err && err.code === "NO_FACE") ||
      errorMessage?.includes("no face")
    ) {
      return res.status(400).json({ error: "no_face_detected" });
    }

    res.status(500).json({ error: "internal error", message: errorMessage });
  }
};
