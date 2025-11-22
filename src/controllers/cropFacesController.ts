import { Request, Response } from "express";
import { readImageAsBase64 } from "../services/imageService";
import { cropAndSaveFaces } from "../services/cropFacesService";

/**
 * POST /api/crop-faces
 * Detects all faces in an image, crops them, and saves to output/cropped_faces/
 * Clears the cropped_faces directory before saving new faces
 */
export const cropFaces = async (req: Request, res: Response) => {
  try {
    const { image_path } = req.body as { image_path?: string };
    if (!image_path) {
      return res.status(400).json({ error: "Missing image_path" });
    }

    // Read image as base64
    const imageBase64 = await readImageAsBase64(image_path);

    // Detect faces, crop them, and save to output/cropped_faces/
    const faceCount = await cropAndSaveFaces(imageBase64);

    res.json({
      faces_detected: faceCount,
      message: `${faceCount} face(s) cropped and saved to output/cropped_faces/`
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "NO_FACE") {
      return res.status(400).json({ error: "no_face_detected" });
    }
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
};
