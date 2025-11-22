import { Response } from "express";
import { isNoFaceError, getErrorMessage } from "./errors";

/**
 * Send error response for face detection/recognition operations
 */
export const sendErrorResponse = (res: Response, err: unknown): void => {
  // Handle NO_FACE errors
  if (isNoFaceError(err)) {
    res.status(400).json({ error: "no_face_detected" });
    return;
  }

  // Log error for debugging
  console.error(err);

  // Send generic error response
  const errorMessage = getErrorMessage(err);
  res.status(500).json({
    error: "internal error",
    message: process.env.NODE_ENV === "development" ? errorMessage : undefined
  });
};

/**
 * Validate required base64 image parameter
 */
export const validateBase64Image = (
  res: Response,
  image_base64: string | undefined,
  paramName = "image_base64"
): image_base64 is string => {
  if (!image_base64) {
    res.status(400).json({ error: `Missing ${paramName}` });
    return false;
  }
  return true;
};
