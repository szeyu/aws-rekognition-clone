/**
 * Shared type definitions for face detection and recognition
 */

export interface Landmark {
  Type: string;  // "eyeLeft", "eyeRight", "nose", "mouthLeft", "mouthRight"
  X: number;     // Normalized [0, 1]
  Y: number;     // Normalized [0, 1]
  PixelX: number;  // Absolute pixel position
  PixelY: number;  // Absolute pixel position
}

export interface DetectedFace {
  BoundingBox: {
    Left: number;
    Top: number;
    Width: number;
    Height: number;
  };
  Confidence: number;
  Area: number;
  PixelBoundingBox: {
    Left: number;
    Top: number;
    Width: number;
    Height: number;
  };
  Landmarks?: Landmark[];
}
