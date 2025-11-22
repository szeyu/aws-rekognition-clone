import { detectAllFacesWithRetinaFace, Landmark } from "../embedding";
import { getImageDimensions, cropImageRegion } from "../utils/imageUtils";
import {
  NormalizedBoundingBox,
  PixelBoundingBox,
  normalizedToPixel,
} from "../utils/boundingBoxUtils";

/**
 * Face detail with bounding box information
 */
export interface FaceDetail {
  BoundingBox: NormalizedBoundingBox;
  Confidence: number;
  Area: number;
  PixelBoundingBox: PixelBoundingBox;
  Landmarks?: Landmark[];
  CroppedFaceBase64?: string;
}

/**
 * Face detection result
 */
export interface FaceDetectionResult {
  FaceDetails: FaceDetail[];
  FaceCount: number;
  ImageWidth: number;
  ImageHeight: number;
}

/**
 * Detect all faces in an image
 * @param imageBase64 - Base64 encoded image
 * @param includeCroppedFaces - Whether to include cropped face images
 * @returns Face detection result with bounding boxes
 */
export const detectFacesInImage = async (
  imageBase64: string,
  includeCroppedFaces: boolean = false
): Promise<FaceDetectionResult> => {
  // Get image dimensions
  const { width: imageWidth, height: imageHeight } =
    await getImageDimensions(imageBase64);

  // Detect all faces using RetinaFace
  const detectedFaces = await detectAllFacesWithRetinaFace(imageBase64, 0.6);

  // Process each detected face
  const faceDetails = await Promise.all(
    detectedFaces.map(async (face) => {
      const detail: FaceDetail = {
        BoundingBox: face.BoundingBox,
        Confidence: face.Confidence,
        Area: face.Area,
        PixelBoundingBox: face.PixelBoundingBox,
        Landmarks: face.Landmarks,
      };

      // Optionally crop face from image
      if (includeCroppedFaces) {
        const pixelBox = normalizedToPixel(
          face.BoundingBox,
          imageWidth,
          imageHeight
        );
        const croppedBase64 = await cropImageRegion(
          imageBase64,
          pixelBox.Left,
          pixelBox.Top,
          pixelBox.Width,
          pixelBox.Height
        );
        detail.CroppedFaceBase64 = `data:image/jpeg;base64,${croppedBase64}`;
      }

      return detail;
    })
  );

  return {
    FaceDetails: faceDetails,
    FaceCount: faceDetails.length,
    ImageWidth: imageWidth,
    ImageHeight: imageHeight,
  };
};

/**
 * Get the largest face from detection result
 * @param result - Face detection result
 * @returns The face detail with largest area, or null if no faces
 */
export const getLargestFace = (
  result: FaceDetectionResult
): FaceDetail | null => {
  if (result.FaceCount === 0) return null;
  return result.FaceDetails[0]; // Already sorted by area
};

/**
 * Filter faces by minimum confidence
 * @param result - Face detection result
 * @param minConfidence - Minimum confidence threshold (0-100)
 * @returns Filtered face detection result
 */
export const filterFacesByConfidence = (
  result: FaceDetectionResult,
  minConfidence: number
): FaceDetectionResult => {
  const filteredFaces = result.FaceDetails.filter(
    (face) => face.Confidence >= minConfidence
  );

  return {
    ...result,
    FaceDetails: filteredFaces,
    FaceCount: filteredFaces.length,
  };
};

/**
 * Filter faces by minimum area
 * @param result - Face detection result
 * @param minArea - Minimum area as fraction of image (0-1)
 * @returns Filtered face detection result
 */
export const filterFacesByArea = (
  result: FaceDetectionResult,
  minArea: number
): FaceDetectionResult => {
  const filteredFaces = result.FaceDetails.filter(
    (face) => face.Area >= minArea
  );

  return {
    ...result,
    FaceDetails: filteredFaces,
    FaceCount: filteredFaces.length,
  };
};
