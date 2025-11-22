import { z } from "zod";

/**
 * Base64 image string schema
 * Must be a non-empty string
 */
const base64ImageSchema = z.string().min(1, "Image data cannot be empty");

/**
 * Schema for /api/detect-faces endpoint
 */
export const detectFacesSchema = z.object({
  image_base64: base64ImageSchema,
  save_crops: z.boolean().optional(),
  confidence_threshold: z
    .number()
    .min(0, "Confidence threshold must be between 0 and 1")
    .max(1, "Confidence threshold must be between 0 and 1")
    .optional(),
});

/**
 * Schema for /api/visualize-faces endpoint
 */
export const visualizeFacesSchema = z.object({
  image_base64: base64ImageSchema,
  show_landmarks: z.boolean().optional(),
  show_confidence: z.boolean().optional(),
  box_width: z.number().positive().optional(),
  save_to_file: z.boolean().optional(),
});

/**
 * Schema for /api/crop-faces endpoint
 */
export const cropFacesSchema = z.object({
  image_base64: base64ImageSchema,
});

/**
 * Schema for /api/store_embedding endpoint
 */
export const storeEmbeddingSchema = z.object({
  image_base64: base64ImageSchema,
});

/**
 * Schema for /api/compare endpoint
 */
export const compareEmbeddingsSchema = z.object({
  image_base64_A: base64ImageSchema,
  image_base64_B: base64ImageSchema,
});

/**
 * Schema for /api/search endpoint
 */
export const searchEmbeddingsSchema = z.object({
  image_base64: base64ImageSchema,
  top_k: z
    .number()
    .int("top_k must be an integer")
    .positive("top_k must be positive"),
});
