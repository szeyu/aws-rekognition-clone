import { Jimp } from "jimp";

/**
 * Get image dimensions from base64 encoded image
 */
export const getImageDimensions = async (
  base64: string
): Promise<{ width: number; height: number }> => {
  const buffer = Buffer.from(base64, "base64");
  const image = await Jimp.read(buffer);
  return {
    width: image.bitmap.width,
    height: image.bitmap.height,
  };
};

/**
 * Crop a region from an image and return as base64
 */
export const cropImageRegion = async (
  base64: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> => {
  const buffer = Buffer.from(base64, "base64");
  const image = await Jimp.read(buffer);

  // Ensure coordinates are within image bounds
  const clampedX = Math.max(0, Math.min(x, image.bitmap.width - 1));
  const clampedY = Math.max(0, Math.min(y, image.bitmap.height - 1));
  const clampedW = Math.min(width, image.bitmap.width - clampedX);
  const clampedH = Math.min(height, image.bitmap.height - clampedY);

  // Crop the image
  await image.crop({ x: clampedX, y: clampedY, w: clampedW, h: clampedH });

  // Convert to base64
  const croppedBuffer = await image.getBuffer("image/jpeg");
  return croppedBuffer.toString("base64");
};
