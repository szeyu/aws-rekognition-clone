import { DetectedFace } from "../embedding";

/**
 * Calculate Intersection over Union (IoU) between two bounding boxes
 */
export const calculateIoU = (
  box1: { Left: number; Top: number; Width: number; Height: number },
  box2: { Left: number; Top: number; Width: number; Height: number }
): number => {
  // Calculate intersection coordinates
  const x1 = Math.max(box1.Left, box2.Left);
  const y1 = Math.max(box1.Top, box2.Top);
  const x2 = Math.min(box1.Left + box1.Width, box2.Left + box2.Width);
  const y2 = Math.min(box1.Top + box1.Height, box2.Top + box2.Height);

  // Calculate intersection area
  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersectionArea = intersectionWidth * intersectionHeight;

  // Calculate union area
  const box1Area = box1.Width * box1.Height;
  const box2Area = box2.Width * box2.Height;
  const unionArea = box1Area + box2Area - intersectionArea;

  // Return IoU
  return unionArea > 0 ? intersectionArea / unionArea : 0;
};

/**
 * Apply Non-Maximum Suppression (NMS) to filter overlapping detections
 * @param faces - Array of detected faces sorted by confidence (highest first)
 * @param iouThreshold - IoU threshold for considering boxes as overlapping (default: 0.3)
 * @returns Filtered array of faces with overlaps removed
 */
export const applyNMS = (
  faces: DetectedFace[],
  iouThreshold: number = 0.3
): DetectedFace[] => {
  if (faces.length === 0) return [];

  // Sort by confidence (highest first) - input should already be sorted by area
  // but we'll sort by confidence for NMS
  const sortedFaces = [...faces].sort((a, b) => b.Confidence - a.Confidence);

  const keepFaces: DetectedFace[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sortedFaces.length; i++) {
    if (suppressed.has(i)) continue;

    const currentFace = sortedFaces[i];
    keepFaces.push(currentFace);

    // Suppress overlapping boxes with lower confidence
    for (let j = i + 1; j < sortedFaces.length; j++) {
      if (suppressed.has(j)) continue;

      const iou = calculateIoU(
        currentFace.BoundingBox,
        sortedFaces[j].BoundingBox
      );

      // If boxes overlap significantly, suppress the one with lower confidence
      if (iou > iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  // Sort back by area (largest first) to maintain original sorting
  return keepFaces.sort((a, b) => b.Area - a.Area);
};
