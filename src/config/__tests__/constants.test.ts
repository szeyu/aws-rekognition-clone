import { vi } from 'vitest';
import {
  ARCFACE_INPUT_SIZE,
  ARCFACE_EMBEDDING_DIM,
  RETINAFACE_IMAGE_SIZES,
  RETINAFACE_STRIDES,
  DEFAULT_CONFIDENCE_THRESHOLD,
  PATHS,
  MODEL_PATHS,
  getDefaultConfidenceThreshold,
} from '../constants';

describe('Constants', () => {
  describe('ArcFace Constants', () => {
    it('should have correct input size', () => {
      expect(ARCFACE_INPUT_SIZE).toBe(112);
    });

    it('should have correct embedding dimension', () => {
      expect(ARCFACE_EMBEDDING_DIM).toBe(512);
    });
  });

  describe('RetinaFace Constants', () => {
    it('should have correct image sizes', () => {
      expect(RETINAFACE_IMAGE_SIZES.MOBILE).toBe(640);
      expect(RETINAFACE_IMAGE_SIZES.RESNET50).toBe(840);
    });

    it('should have correct strides', () => {
      expect(RETINAFACE_STRIDES).toEqual([8, 16, 32]);
    });
  });

  describe('Threshold Constants', () => {
    it('should have default confidence threshold', () => {
      expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.6);
    });
  });

  describe('Path Constants', () => {
    it('should have output directory', () => {
      expect(PATHS.OUTPUT_DIR).toBe('output');
    });

    it('should have cropped faces directory', () => {
      expect(PATHS.CROPPED_FACES_DIR).toBe('output/cropped_faces');
    });

    it('should have models directory', () => {
      expect(PATHS.MODELS_DIR).toBe('models');
    });
  });

  describe('Model Paths', () => {
    it('should have ArcFace model path', () => {
      expect(MODEL_PATHS.ARCFACE).toBe('./models/arcface.onnx');
    });

    it('should have RetinaFace model path', () => {
      expect(MODEL_PATHS.RETINAFACE).toBe('./models/retinaface_resnet50.onnx');
    });
  });

  describe('getDefaultConfidenceThreshold', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return default value when env var not set', () => {
      delete process.env.FACE_DETECTION_CONFIDENCE_THRESHOLD;
      const threshold = getDefaultConfidenceThreshold();
      expect(threshold).toBe(0.6);
    });

    it('should return env var value when set', () => {
      process.env.FACE_DETECTION_CONFIDENCE_THRESHOLD = '0.8';
      const threshold = getDefaultConfidenceThreshold();
      expect(threshold).toBe(0.8);
    });

    it('should parse float values correctly', () => {
      process.env.FACE_DETECTION_CONFIDENCE_THRESHOLD = '0.75';
      const threshold = getDefaultConfidenceThreshold();
      expect(threshold).toBe(0.75);
    });
  });
});
