/**
 * Custom error classes for face recognition operations
 */

export class NoFaceDetectedError extends Error {
  public readonly code = "NO_FACE";

  constructor(message = "no_face_detected") {
    super(message);
    this.name = "NoFaceDetectedError";
  }
}

/**
 * Type guard to check if an error is a NoFaceDetectedError
 */
export const isNoFaceError = (err: unknown): boolean => {
  if (err instanceof NoFaceDetectedError) return true;
  if (err && typeof err === "object" && "code" in err && err.code === "NO_FACE") return true;
  if (err instanceof Error && err.message?.includes("no face")) return true;
  return false;
};

/**
 * Get error message from unknown error type
 */
export const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "unknown error";
};
