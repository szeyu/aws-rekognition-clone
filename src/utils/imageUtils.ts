import { Jimp } from "jimp";

/**
 * Convert base64 encoded image to Jimp instance
 * This is a common operation used throughout the codebase
 */
export const base64ToJimp = async (base64: string): Promise<Awaited<ReturnType<typeof Jimp.read>>> => {
  const buffer = Buffer.from(base64, "base64");
  return await Jimp.read(buffer);
};

/**
 * Convert Buffer to Jimp instance
 * Used for processing uploaded files from multer
 */
export const bufferToJimp = async (buffer: Buffer): Promise<Awaited<ReturnType<typeof Jimp.read>>> => {
  return await Jimp.read(buffer);
};

/**
 * Convert Jimp instance to base64 string
 */
export const jimpToBase64 = async (image: Awaited<ReturnType<typeof Jimp.read>>): Promise<string> => {
  const buffer = await image.getBuffer("image/jpeg");
  return buffer.toString("base64");
};

/**
 * Get image dimensions from base64 encoded image
 */
export const getImageDimensions = async (
  base64: string
): Promise<{ width: number; height: number }> => {
  const image = await base64ToJimp(base64);
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
  const image = await base64ToJimp(base64);

  // Ensure coordinates are within image bounds
  const clampedX = Math.max(0, Math.min(x, image.bitmap.width - 1));
  const clampedY = Math.max(0, Math.min(y, image.bitmap.height - 1));
  const clampedW = Math.min(width, image.bitmap.width - clampedX);
  const clampedH = Math.min(height, image.bitmap.height - clampedY);

  // Crop the image
  image.crop({ x: clampedX, y: clampedY, w: clampedW, h: clampedH });

  // Convert to base64
  const croppedBuffer = await image.getBuffer("image/jpeg");
  return croppedBuffer.toString("base64");
};

/**
 * Scale down image if it exceeds maximum dimension
 * Maintains aspect ratio and improves processing performance
 * @param buffer - Image buffer from file upload
 * @param maxDimension - Maximum width or height (default: 1920)
 * @returns Scaled image as base64 string
 */
export const scaleDownImage = async (
  buffer: Buffer,
  maxDimension: number = 1920
): Promise<string> => {
  const image = await bufferToJimp(buffer);
  const { width, height } = image.bitmap;

  // Only scale down if image exceeds max dimension
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      image.resize({ w: maxDimension });
    } else {
      image.resize({ h: maxDimension });
    }
  }

  return jimpToBase64(image);
};
