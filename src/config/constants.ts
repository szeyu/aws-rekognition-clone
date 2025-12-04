/**
 * Configuration constants for face recognition system
 */

// ArcFace Model Constants
export const ARCFACE_INPUT_SIZE = 112;
export const ARCFACE_EMBEDDING_DIM = 512;

// RetinaFace Model Constants
export const RETINAFACE_IMAGE_SIZES = {
  MOBILE: 640,
  RESNET50: 840,
} as const;

export const RETINAFACE_STRIDES = [8, 16, 32] as const;

// Detection Thresholds
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
export const DEFAULT_NMS_THRESHOLD = 0.4;
export const DEFAULT_VIS_THRESHOLD = 0.6;

// RetinaFace Detection Parameters
export const RETINAFACE = {
  CONFIDENCE_THRESHOLD: 0.02, // Initial detection threshold before filtering
  NMS_THRESHOLD: 0.4,         // Non-Maximum Suppression threshold
  VIS_THRESHOLD: 0.8,         // Final visibility threshold (can be overridden by env var)
  TOP_K: 5000,                // Maximum detections to keep before NMS
  KEEP_TOP_K: 750,            // Maximum detections to keep after NMS
} as const;

// Directory Paths
export const PATHS = {
  TEMP_DIR: "/tmp/facevector",                          // Temporary processing inside Docker
  CROPPED_FACES_DIR: "/tmp/facevector/cropped_faces",   // Temporary cropped faces
  MODELS_DIR: "models",                                  // ONNX models directory
} as const;

// S3 Storage Configuration
export const S3_CONFIG = {
  BUCKET: process.env.S3_BUCKET || "facevector-engine",
  ORIGINALS_PREFIX: "originals/",
  FACES_PREFIX: "faces/",
} as const;

// Model File Paths
export const MODEL_PATHS = {
  ARCFACE: "./models/arcface.onnx",
  RETINAFACE: "./models/retinaface_resnet50.onnx",
} as const;

/**
 * Get default confidence threshold from environment or use default
 */
export const getDefaultConfidenceThreshold = (): number => {
  return parseFloat(
    process.env.FACE_DETECTION_CONFIDENCE_THRESHOLD || String(DEFAULT_CONFIDENCE_THRESHOLD)
  );
};
