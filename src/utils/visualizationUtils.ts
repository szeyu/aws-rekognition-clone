import { Jimp } from "jimp";
import { DetectedFace, Landmark } from "../embedding";

/**
 * Draw bounding boxes and landmarks on an image
 * @param base64Image - Base64 encoded image
 * @param faces - Array of detected faces with bounding boxes
 * @param options - Drawing options
 * @returns Base64 encoded image with boxes drawn
 */
export const drawBoundingBoxes = async (
  base64Image: string,
  faces: DetectedFace[],
  options: {
    boxColor?: number; // Jimp color code (default: red)
    boxWidth?: number; // Line width (default: 3)
    showLandmarks?: boolean; // Draw facial landmarks (default: true)
    showConfidence?: boolean; // Show confidence percentage (default: true)
  } = {}
): Promise<string> => {
  const {
    boxColor = 0xff0000ff, // Red with full opacity
    boxWidth = 3,
    showLandmarks = true,
    showConfidence = true,
  } = options;

  // Decode base64 image
  const buffer = Buffer.from(base64Image, "base64");
  const image = await Jimp.read(buffer);

  // Draw each face
  for (const face of faces) {
    const { PixelBoundingBox, Landmarks, Confidence } = face;
    const { Left, Top, Width, Height } = PixelBoundingBox;

    // Draw bounding box
    drawRectangle(image, Left, Top, Width, Height, boxColor, boxWidth);

    // Draw landmarks if available and enabled
    if (showLandmarks && Landmarks) {
      drawLandmarks(image, Landmarks, 0x00ff00ff, 4); // Green landmarks
    }

    // Draw confidence text if enabled
    if (showConfidence) {
      const confidenceText = `${Confidence.toFixed(1)}%`;
      // Position text above the box
      const textX = Left;
      const textY = Math.max(0, Top - 15);

      // Draw text background (semi-transparent black rectangle)
      const textWidth = confidenceText.length * 8;
      const textHeight = 12;
      drawFilledRectangle(
        image,
        textX,
        textY,
        textWidth,
        textHeight,
        0x000000aa
      );

      // Note: Jimp doesn't have built-in text rendering with custom fonts easily
      // For production, consider using a library like node-canvas
      // For now, we'll just draw the background box
    }
  }

  // Convert back to base64
  const resultBuffer = await image.getBuffer("image/jpeg");
  return resultBuffer.toString("base64");
};

/**
 * Draw a rectangle on the image
 */
const drawRectangle = (
  image: Awaited<ReturnType<typeof Jimp.read>>,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  lineWidth: number
): void => {
  // Draw top line
  for (let i = 0; i < lineWidth; i++) {
    drawHorizontalLine(image, x, y + i, width, color);
  }
  // Draw bottom line
  for (let i = 0; i < lineWidth; i++) {
    drawHorizontalLine(image, x, y + height - i, width, color);
  }
  // Draw left line
  for (let i = 0; i < lineWidth; i++) {
    drawVerticalLine(image, x + i, y, height, color);
  }
  // Draw right line
  for (let i = 0; i < lineWidth; i++) {
    drawVerticalLine(image, x + width - i, y, height, color);
  }
};

/**
 * Draw a filled rectangle (for text backgrounds)
 */
const drawFilledRectangle = (
  image: Awaited<ReturnType<typeof Jimp.read>>,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number
): void => {
  const imgWidth = image.bitmap.width;
  const imgHeight = image.bitmap.height;

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const px = Math.floor(x + dx);
      const py = Math.floor(y + dy);
      if (px >= 0 && px < imgWidth && py >= 0 && py < imgHeight) {
        image.setPixelColor(color, px, py);
      }
    }
  }
};

/**
 * Draw facial landmarks
 */
const drawLandmarks = (
  image: Awaited<ReturnType<typeof Jimp.read>>,
  landmarks: Landmark[],
  color: number,
  size: number
): void => {
  for (const landmark of landmarks) {
    const { PixelX, PixelY } = landmark;
    // Draw a small circle for each landmark
    drawCircle(image, PixelX, PixelY, size, color);
  }
};

/**
 * Draw a circle (approximated with filled pixels)
 */
const drawCircle = (
  image: Awaited<ReturnType<typeof Jimp.read>>,
  centerX: number,
  centerY: number,
  radius: number,
  color: number
): void => {
  const imgWidth = image.bitmap.width;
  const imgHeight = image.bitmap.height;

  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y <= radius * radius) {
        const px = Math.floor(centerX + x);
        const py = Math.floor(centerY + y);
        if (px >= 0 && px < imgWidth && py >= 0 && py < imgHeight) {
          image.setPixelColor(color, px, py);
        }
      }
    }
  }
};

/**
 * Draw horizontal line
 */
const drawHorizontalLine = (
  image: Awaited<ReturnType<typeof Jimp.read>>,
  x: number,
  y: number,
  length: number,
  color: number
): void => {
  const imgWidth = image.bitmap.width;
  const imgHeight = image.bitmap.height;
  const py = Math.floor(y);

  if (py < 0 || py >= imgHeight) return;

  for (let i = 0; i < length; i++) {
    const px = Math.floor(x + i);
    if (px >= 0 && px < imgWidth) {
      image.setPixelColor(color, px, py);
    }
  }
};

/**
 * Draw vertical line
 */
const drawVerticalLine = (
  image: Awaited<ReturnType<typeof Jimp.read>>,
  x: number,
  y: number,
  length: number,
  color: number
): void => {
  const imgWidth = image.bitmap.width;
  const imgHeight = image.bitmap.height;
  const px = Math.floor(x);

  if (px < 0 || px >= imgWidth) return;

  for (let i = 0; i < length; i++) {
    const py = Math.floor(y + i);
    if (py >= 0 && py < imgHeight) {
      image.setPixelColor(color, px, py);
    }
  }
};
