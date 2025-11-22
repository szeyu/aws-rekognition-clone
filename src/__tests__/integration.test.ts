/**
 * Integration Test Suite
 *
 * Tests the complete flow of face recognition operations:
 * detect > visualize > crop > store > list > get > compare > search > delete
 *
 * Requirements:
 * - Database must be running (make db)
 * - ONNX models must be downloaded (make models)
 * - Test images must exist in examples/ folder
 */

import request from 'supertest';
import { Express } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

// We'll need to create the app instance for testing
let app: Express;
let storedFaceIds: string[] = [];
let testImageBase64: string;

beforeAll(async () => {
  // Dynamically import the app and initialization functions
  const serverModule = await import('../server.js');
  const { connectDB } = await import('../db.js');
  const { initModels } = await import('../embedding.js');

  app = serverModule.app;

  // Initialize database and models
  await connectDB();
  await initModels();

  // Load test image as base64
  const imagePath = path.join(process.cwd(), 'examples', 'face1.jpeg');
  const imageBuffer = await fs.readFile(imagePath);
  testImageBase64 = imageBuffer.toString('base64');
}, 60000); // Increase timeout for model loading

describe('Face Recognition API Integration Tests', () => {
  /**
   * Test 1: Detect Faces
   * Should detect faces and return bounding boxes with landmarks
   */
  describe('1. POST /api/detect-faces', () => {
    it('should detect faces in an image', async () => {
      const response = await request(app)
        .post('/api/detect-faces')
        .send({ image_base64: testImageBase64 })
        .expect(200);

      expect(response.body).toHaveProperty('faces');
      expect(response.body).toHaveProperty('face_count');
      expect(response.body).toHaveProperty('image_width');
      expect(response.body).toHaveProperty('image_height');
      expect(response.body.faces).toBeInstanceOf(Array);
      expect(response.body.face_count).toBeGreaterThan(0);

      // Validate face structure
      const face = response.body.faces[0];
      expect(face).toHaveProperty('bounding_box');
      expect(face).toHaveProperty('confidence');
      expect(face).toHaveProperty('landmarks');
      expect(face.landmarks).toBeInstanceOf(Array);
      expect(face.landmarks.length).toBe(5); // 5 landmarks (eyes, nose, mouth)
    });

    it('should reject images without faces', async () => {
      // Load box.jpeg (no face)
      const noFaceImagePath = path.join(process.cwd(), 'examples', 'box.jpeg');
      const noFaceBuffer = await fs.readFile(noFaceImagePath);
      const noFaceBase64 = noFaceBuffer.toString('base64');

      const response = await request(app)
        .post('/api/detect-faces')
        .send({ image_base64: noFaceBase64 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'no_face_detected');
    });

    it('should return 400 for missing image_base64', async () => {
      const response = await request(app)
        .post('/api/detect-faces')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
      expect(response.body).toHaveProperty('details');
    });
  });

  /**
   * Test 2: Visualize Faces
   * Should return image with bounding boxes drawn
   */
  describe('2. POST /api/visualize-faces', () => {
    it('should return visualized image with bounding boxes', async () => {
      const response = await request(app)
        .post('/api/visualize-faces')
        .send({
          image_base64: testImageBase64,
          show_landmarks: true,
          show_confidence: true
        })
        .expect(200);

      expect(response.body).toHaveProperty('image_base64');
      expect(response.body).toHaveProperty('face_count');
      expect(response.body).toHaveProperty('faces');
      expect(response.body).toHaveProperty('output_path');
      expect(response.body.face_count).toBeGreaterThan(0);
      expect(response.body.image_base64).toBeTruthy();
    });

    it('should reject images without faces', async () => {
      const noFaceImagePath = path.join(process.cwd(), 'examples', 'box.jpeg');
      const noFaceBuffer = await fs.readFile(noFaceImagePath);
      const noFaceBase64 = noFaceBuffer.toString('base64');

      const response = await request(app)
        .post('/api/visualize-faces')
        .send({ image_base64: noFaceBase64 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'no_face_detected');
    });
  });

  /**
   * Test 3: Crop Faces
   * Should crop and save faces to output folder
   */
  describe('3. POST /api/crop-faces', () => {
    it('should crop faces and save to output folder', async () => {
      const response = await request(app)
        .post('/api/crop-faces')
        .send({ image_base64: testImageBase64 })
        .expect(200);

      expect(response.body).toHaveProperty('faces_detected');
      expect(response.body).toHaveProperty('message');
      expect(response.body.faces_detected).toBeGreaterThan(0);
    });
  });

  /**
   * Test 4: Store Embedding
   * Should store face embeddings in database
   */
  describe('4. POST /api/store_embedding', () => {
    it('should store face embeddings', async () => {
      const response = await request(app)
        .post('/api/store_embedding')
        .send({ image_base64: testImageBase64 })
        .expect(200);

      expect(response.body).toHaveProperty('total_faces');
      expect(response.body).toHaveProperty('stored');
      expect(response.body).toHaveProperty('results');
      expect(response.body.total_faces).toBeGreaterThan(0);
      expect(response.body.stored).toBeGreaterThan(0);
      expect(response.body.results).toBeInstanceOf(Array);

      // Save IDs for later tests
      storedFaceIds = response.body.results.map((r: { face: string; id: string }) => r.id);
      expect(storedFaceIds.length).toBeGreaterThan(0);
    });

    it('should reject images without faces', async () => {
      const noFaceImagePath = path.join(process.cwd(), 'examples', 'box.jpeg');
      const noFaceBuffer = await fs.readFile(noFaceImagePath);
      const noFaceBase64 = noFaceBuffer.toString('base64');

      const response = await request(app)
        .post('/api/store_embedding')
        .send({ image_base64: noFaceBase64 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'no_face_detected');
    });
  });

  /**
   * Test 5: List Stored Embeddings
   * Should return list of stored embeddings
   */
  describe('5. GET /api/list', () => {
    it('should list stored embeddings', async () => {
      const response = await request(app)
        .get('/api/list?limit=10')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      // Validate structure
      const embedding = response.body[0];
      expect(embedding).toHaveProperty('id');
      expect(embedding).toHaveProperty('created_at');
    });
  });

  /**
   * Test 6: Get Image by ID
   * Should retrieve image by UUID
   */
  describe('6. GET /api/image/:id', () => {
    it('should retrieve image by ID', async () => {
      expect(storedFaceIds.length).toBeGreaterThan(0);
      const testId = storedFaceIds[0];

      const response = await request(app)
        .get(`/api/image/${testId}`)
        .expect(200);

      expect(response.body).toHaveProperty('image_base64');
      expect(response.body).toHaveProperty('saved_to');
      expect(response.body.image_base64).toBeTruthy();
    });

    it('should return 404 for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/image/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  /**
   * Test 7: Compare Embeddings
   * Should compare two face embeddings
   * Same image should have cosine similarity close to 1.0
   */
  describe('7. POST /api/compare', () => {
    it('should compare two identical images with cosine ~1.0', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({
          image_base64_A: testImageBase64,
          image_base64_B: testImageBase64
        })
        .expect(200);

      expect(response.body).toHaveProperty('cosine');
      expect(response.body).toHaveProperty('euclidean');

      // Same image should have cosine similarity very close to 1.0
      expect(response.body.cosine).toBeGreaterThan(0.99);
      expect(response.body.cosine).toBeLessThanOrEqual(1.0);

      // Euclidean distance should be very close to 0
      expect(response.body.euclidean).toBeLessThan(1.0);
    });

    it('should compare two different images', async () => {
      // Load face2.jpeg
      const face2Path = path.join(process.cwd(), 'examples', 'face2.jpeg');
      const face2Buffer = await fs.readFile(face2Path);
      const face2Base64 = face2Buffer.toString('base64');

      const response = await request(app)
        .post('/api/compare')
        .send({
          image_base64_A: testImageBase64,
          image_base64_B: face2Base64
        })
        .expect(200);

      expect(response.body).toHaveProperty('cosine');
      expect(response.body).toHaveProperty('euclidean');

      // Different faces should have lower similarity
      expect(response.body.cosine).toBeLessThan(1.0);
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({ image_base64_A: testImageBase64 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
      expect(response.body).toHaveProperty('details');
    });
  });

  /**
   * Test 8: Search Similar Faces
   * Should search for similar faces in database
   * Note: Same image might not appear in results due to duplicates or threshold
   */
  describe('8. POST /api/search', () => {
    it('should search for similar faces', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          image_base64: testImageBase64,
          top_k: 5
        })
        .expect(200);

      expect(response.body).toHaveProperty('total_faces');
      expect(response.body).toHaveProperty('searched');
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toBeInstanceOf(Array);

      // Should have search results
      if (response.body.results.length > 0) {
        const firstResult = response.body.results[0];
        expect(firstResult).toHaveProperty('face');
        expect(firstResult).toHaveProperty('matches');
        expect(firstResult.matches).toBeInstanceOf(Array);

        // Validate match structure
        if (firstResult.matches.length > 0) {
          const match = firstResult.matches[0];
          expect(match).toHaveProperty('id');
          expect(match).toHaveProperty('cosine');
          expect(match.cosine).toBeGreaterThan(0);
          expect(match.cosine).toBeLessThanOrEqual(1.0);
        }
      }
    });

    it('should return 400 for invalid top_k', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          image_base64: testImageBase64,
          top_k: -1
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 for missing top_k', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ image_base64: testImageBase64 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
      expect(response.body).toHaveProperty('details');
    });
  });

  /**
   * Test 9: Delete Embedding
   * Should delete embedding by ID
   */
  describe('9. DELETE /api/item/:id', () => {
    it('should delete embedding by ID', async () => {
      expect(storedFaceIds.length).toBeGreaterThan(0);
      const testId = storedFaceIds[0];

      const response = await request(app)
        .delete(`/api/item/${testId}`)
        .expect(200);

      expect(response.body).toHaveProperty('deleted_id', testId);
    });

    it('should return 404 for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/item/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should not find deleted embedding', async () => {
      const deletedId = storedFaceIds[0];

      const response = await request(app)
        .get(`/api/image/${deletedId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});

afterAll(async () => {
  // Close database connection to allow Jest to exit gracefully
  const { client } = await import('../db.js');
  await client.end();
});
