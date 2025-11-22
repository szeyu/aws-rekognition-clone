import { Request, Response } from "express";
import { cropAndSaveFaces } from "../services/cropFacesService";
import { sendErrorResponse, validateBase64Image } from "../utils/responseHelpers";

/**
 * POST /api/crop-faces
 * Detects all faces in an image, crops them, and saves to output/cropped_faces/
 * Clears the cropped_faces directory before saving new faces
 */
export const cropFaces = async (req: Request, res: Response) => {
  try {
    const { image_base64 } = req.body as { image_base64?: string };
    if (!validateBase64Image(res, image_base64)) return;

    // Use provided base64 image
    const imageBase64 = image_base64;

    // Detect faces, crop them, and save to output/cropped_faces/
    const faceCount = await cropAndSaveFaces(imageBase64);

    res.json({
      faces_detected: faceCount,
      message: `${faceCount} face(s) cropped and saved to output/cropped_faces/`
    });
  } catch (err: unknown) {
    sendErrorResponse(res, err);
  }
};
