/**
 * Bounding box in normalized coordinates (0-1)
 */
export interface NormalizedBoundingBox {
  Left: number;
  Top: number;
  Width: number;
  Height: number;
}

/**
 * Bounding box in pixel coordinates
 */
export interface PixelBoundingBox {
  Left: number;
  Top: number;
  Width: number;
  Height: number;
}

/**
 * Convert normalized bounding box (0-1) to pixel coordinates
 */
export const normalizedToPixel = (
  normalized: NormalizedBoundingBox,
  imageWidth: number,
  imageHeight: number
): PixelBoundingBox => {
  return {
    Left: Math.round(normalized.Left * imageWidth),
    Top: Math.round(normalized.Top * imageHeight),
    Width: Math.round(normalized.Width * imageWidth),
    Height: Math.round(normalized.Height * imageHeight),
  };
};

/**
 * Convert pixel bounding box to normalized coordinates (0-1)
 */
export const pixelToNormalized = (
  pixel: PixelBoundingBox,
  imageWidth: number,
  imageHeight: number
): NormalizedBoundingBox => {
  return {
    Left: pixel.Left / imageWidth,
    Top: pixel.Top / imageHeight,
    Width: pixel.Width / imageWidth,
    Height: pixel.Height / imageHeight,
  };
};

/**
 * Calculate area of normalized bounding box
 */
export const calculateArea = (bbox: NormalizedBoundingBox): number => {
  return bbox.Width * bbox.Height;
};

/**
 * Check if bounding box is within valid bounds
 */
export const isValidBoundingBox = (bbox: NormalizedBoundingBox): boolean => {
  return (
    bbox.Left >= 0 &&
    bbox.Top >= 0 &&
    bbox.Width > 0 &&
    bbox.Height > 0 &&
    bbox.Left + bbox.Width <= 1 &&
    bbox.Top + bbox.Height <= 1
  );
};
