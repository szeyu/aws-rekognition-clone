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
  OUTPUT_DIR: "output",
  CROPPED_FACES_DIR: "output/cropped_faces",
  PROJECT_DATA_DIR: process.env.PROJECT_DATA_DIR || "project_data",
  MODELS_DIR: "models",
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
