import { Request, Response } from "express";
import { detectAllFacesWithRetinaFace } from "../embedding";
import { drawBoundingBoxes } from "../utils/visualizationUtils";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Visualize faces endpoint - Returns image with bounding boxes drawn and saves to output folder
 * POST /api/visualize-faces
 *
 * Request body:
 *   - image_base64: string (required) - Base64-encoded image
 *   - show_landmarks: boolean (optional) - Draw facial landmarks (default: true)
 *   - show_confidence: boolean (optional) - Show confidence percentage (default: true)
 *   - box_width: number (optional) - Line width for boxes (default: 3)
 *   - save_to_file: boolean (optional) - Save visualized image to output/<timestamp>/visualized-faces.jpg (default: true)
 *
 * Response:
 *   - image_base64: string - Base64 encoded image with boxes drawn
 *   - face_count: number - Number of faces detected
 *   - faces: DetectedFace[] - Array of detected faces with bounding boxes
 *   - output_path: string (optional) - Path where image was saved (if save_to_file is true)
 */
export const visualizeFaces = async (req: Request, res: Response) => {
  try {
    const defaultConfidence = parseFloat(
      process.env.FACE_DETECTION_CONFIDENCE_THRESHOLD || "0.6"
    );

    const {
      image_base64,
      show_landmarks = true,
      show_confidence = true,
      box_width = 3,
      save_to_file = true,
    } = req.body as {
      image_base64?: string;
      show_landmarks?: boolean;
      show_confidence?: boolean;
      box_width?: number;
      save_to_file?: boolean;
    };

    if (!image_base64) {
      return res.status(400).json({ error: "Missing image_base64" });
    }

    // Use provided base64 image
    const imageBase64 = image_base64;

    // Detect all faces in the image using RetinaFace
    const faces = await detectAllFacesWithRetinaFace(imageBase64, defaultConfidence);

    if (faces.length === 0) {
      return res.status(400).json({
        error: "no_face_detected",
        message: "No faces detected in the image",
      });
    }

    // Draw bounding boxes on the image
    const visualizedImage = await drawBoundingBoxes(imageBase64, faces, {
      showLandmarks: show_landmarks,
      showConfidence: show_confidence,
      boxWidth: box_width,
    });

    let outputPath: string | undefined;

    // Save to file if requested
    if (save_to_file) {
      const outputDir = path.join("output");

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // Save visualized image
      const filename = "visualized-faces.jpg";
      outputPath = path.join(outputDir, filename);

      // Convert base64 to buffer and save
      const buffer = Buffer.from(visualizedImage, "base64");
      await fs.writeFile(outputPath, buffer);
    }

    // Return the visualized image
    res.json({
      image_base64: visualizedImage,
      face_count: faces.length,
      faces: faces,
      output_path: outputPath,
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
};
