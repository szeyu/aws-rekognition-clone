/**
 * Comprehensive Integration Test
 * Tests complete workflow: detect → enroll → recognize → manage → delete
 */

import request from 'supertest';
import { Express } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

let app: Express;
let xiTrumpFaceIds: { xi: string; trump: string };
let elonFaceId: string;
let customerIds: { XI: string; TRUMP: string; ELON_MUSK: string };

beforeAll(async () => {
  const serverModule = await import('../server.js');
  const { connectDB } = await import('../db.js');
  const { initModels } = await import('../embedding.js');
  const { s3Service } = await import('../services/s3Service.js');

  app = serverModule.app;
  await connectDB();
  await s3Service.ensureBucketExists();
  await initModels();
}, 60000);

describe('Full Workflow Integration Test', () => {
  describe('Step 1: Register Trump and Xi from xijingping_trump.jpeg', () => {
    it('should detect 2 faces in xijingping_trump.jpeg', async () => {
      const imagePath = path.join(process.cwd(), 'examples', 'xijingping_trump.jpeg');
      const imageBuffer = await fs.readFile(imagePath);

      const response = await request(app)
        .post('/api/faces/detect')
        .attach('file', imageBuffer, 'xijingping_trump.jpeg')
        .field('identifier', 'XI_TRUMP_REGISTRATION')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);

      xiTrumpFaceIds = {
        xi: response.body[0].face_id,
        trump: response.body[1].face_id,
      };

      console.log('Detected faces:', xiTrumpFaceIds);
    });

    it('should enroll XI customer', async () => {
      const response = await request(app)
        .post('/api/faces/enroll')
        .send({
          face_id: xiTrumpFaceIds.xi,
          customer_identifier: 'XI',
          customer_name: 'Xi Jinping',
        })
        .expect(200);

      expect(response.body.customer_identifier).toBe('XI');
      customerIds = { ...customerIds, XI: response.body.customer_id };
      console.log('Enrolled XI:', customerIds.XI);
    });

    it('should enroll TRUMP customer', async () => {
      const response = await request(app)
        .post('/api/faces/enroll')
        .send({
          face_id: xiTrumpFaceIds.trump,
          customer_identifier: 'TRUMP',
          customer_name: 'Donald Trump',
        })
        .expect(200);

      expect(response.body.customer_identifier).toBe('TRUMP');
      customerIds = { ...customerIds, TRUMP: response.body.customer_id };
      console.log('Enrolled TRUMP:', customerIds.TRUMP);
    });
  });

  describe('Step 2: Register Elon Musk from elon_musk_1.jpg', () => {
    it('should detect face in elon_musk_1.jpg', async () => {
      const imagePath = path.join(process.cwd(), 'examples', 'elon_musk_1.jpg');
      const imageBuffer = await fs.readFile(imagePath);

      const response = await request(app)
        .post('/api/faces/detect')
        .attach('file', imageBuffer, 'elon_musk_1.jpg')
        .field('identifier', 'ELON_REGISTRATION')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      elonFaceId = response.body[0].face_id;
      console.log('Detected Elon face:', elonFaceId);
    });

    it('should enroll ELON_MUSK customer', async () => {
      const response = await request(app)
        .post('/api/faces/enroll')
        .send({
          face_id: elonFaceId,
          customer_identifier: 'ELON_MUSK',
          customer_name: 'Elon Musk',
        })
        .expect(200);

      expect(response.body.customer_identifier).toBe('ELON_MUSK');
      customerIds = { ...customerIds, ELON_MUSK: response.body.customer_id };
      console.log('Enrolled ELON_MUSK:', customerIds.ELON_MUSK);
    });
  });

  describe('Step 3: Verify enrollments via list endpoints', () => {
    it('should list all 3 detected faces', async () => {
      const response = await request(app)
        .get('/api/management/faces')
        .expect(200);

      expect(response.body.total).toBeGreaterThanOrEqual(3);
      expect(response.body.faces.length).toBeGreaterThanOrEqual(3);
      console.log(`Total faces: ${response.body.total}`);
    });

    it('should list all 3 enrolled customers', async () => {
      const response = await request(app)
        .get('/api/management/customers')
        .expect(200);

      expect(response.body.total).toBeGreaterThanOrEqual(3);
      expect(response.body.customers.length).toBeGreaterThanOrEqual(3);

      const identifiers = response.body.customers.map((c: any) => c.customer_identifier);
      expect(identifiers).toContain('XI');
      expect(identifiers).toContain('TRUMP');
      expect(identifiers).toContain('ELON_MUSK');
      console.log('Enrolled customers:', identifiers);
    });

    it('should verify all 3 customers are enrolled', async () => {
      const response = await request(app)
        .get('/api/management/stats')
        .expect(200);

      expect(response.body.enrolled_customers).toBeGreaterThanOrEqual(3);
      expect(response.body.detected_faces).toBeGreaterThanOrEqual(3);
      console.log('Stats:', response.body);
    });
  });

  describe('Step 4: Test recognition with elon_musk_2.jpg', () => {
    let elonMusk2FaceId: string;

    it('should detect face in elon_musk_2.jpg', async () => {
      const imagePath = path.join(process.cwd(), 'examples', 'elon_musk_2.jpg');
      const imageBuffer = await fs.readFile(imagePath);

      const response = await request(app)
        .post('/api/faces/detect')
        .attach('file', imageBuffer, 'elon_musk_2.jpg')
        .field('identifier', 'ELON_TEST_2')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      elonMusk2FaceId = response.body[0].face_id;
    });

    it('should recognize ELON_MUSK as first result', async () => {
      const response = await request(app)
        .post('/api/faces/recognize')
        .send({ face_id: elonMusk2FaceId })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      // First result should be ELON_MUSK
      expect(response.body[0].customer_identifier).toBe('ELON_MUSK');
      expect(response.body[0].confidence_score).toBeGreaterThan(0.90);
      console.log('Top match:', response.body[0]);
    });
  });

  describe('Step 5: Test recognition with elon_musk_trump.jpg', () => {
    let elonTrumpFaces: { face1: string; face2: string };

    it('should detect 2 faces in elon_musk_trump.jpg', async () => {
      const imagePath = path.join(process.cwd(), 'examples', 'elon_musk_trump.jpg');
      const imageBuffer = await fs.readFile(imagePath);

      const response = await request(app)
        .post('/api/faces/detect')
        .attach('file', imageBuffer, 'elon_musk_trump.jpg')
        .field('identifier', 'ELON_TRUMP_TEST')
        .expect(200);

      expect(response.body.length).toBe(2);
      elonTrumpFaces = {
        face1: response.body[0].face_id,
        face2: response.body[1].face_id,
      };
    });

    it('should correctly recognize both faces', async () => {
      // Recognize face 1
      const face1Response = await request(app)
        .post('/api/faces/recognize')
        .send({ face_id: elonTrumpFaces.face1 })
        .expect(200);

      // Recognize face 2
      const face2Response = await request(app)
        .post('/api/faces/recognize')
        .send({ face_id: elonTrumpFaces.face2 })
        .expect(200);

      // Check that we got both Elon and Trump in results
      const allIdentifiers = [
        ...face1Response.body.map((r: any) => r.customer_identifier),
        ...face2Response.body.map((r: any) => r.customer_identifier),
      ];

      expect(allIdentifiers).toContain('ELON_MUSK');
      expect(allIdentifiers).toContain('TRUMP');
      console.log('Face 1 top match:', face1Response.body[0]?.customer_identifier);
      console.log('Face 2 top match:', face2Response.body[0]?.customer_identifier);
    });
  });

  describe('Step 6: Test recognition with xijingping_trump.jpeg again', () => {
    it('should correctly match both XI and TRUMP', async () => {
      // Recognize Xi face
      const xiResponse = await request(app)
        .post('/api/faces/recognize')
        .send({ face_id: xiTrumpFaceIds.xi })
        .expect(200);

      // Recognize Trump face
      const trumpResponse = await request(app)
        .post('/api/faces/recognize')
        .send({ face_id: xiTrumpFaceIds.trump })
        .expect(200);

      // Xi face should match XI customer
      const xiMatch = xiResponse.body.find((r: any) => r.customer_identifier === 'XI');
      expect(xiMatch).toBeDefined();
      expect(xiMatch.confidence_score).toBeGreaterThan(0.90);

      // Trump face should match TRUMP customer
      const trumpMatch = trumpResponse.body.find((r: any) => r.customer_identifier === 'TRUMP');
      expect(trumpMatch).toBeDefined();
      expect(trumpMatch.confidence_score).toBeGreaterThan(0.90);

      console.log('XI confidence:', xiMatch.confidence_score);
      console.log('TRUMP confidence:', trumpMatch.confidence_score);
    });
  });

  describe('Step 7: Test deletion - Xi face should fail (used by customer)', () => {
    it('should prevent deleting Xi face (enrolled customer exists)', async () => {
      const response = await request(app)
        .delete(`/api/management/faces/${xiTrumpFaceIds.xi}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('enrolled customers');
      console.log('Expected error:', response.body.message);
    });
  });

  describe('Step 8: Delete Trump customer then face', () => {
    it('should delete TRUMP customer', async () => {
      const response = await request(app)
        .delete(`/api/management/customers/${customerIds.TRUMP}`)
        .expect(200);

      expect(response.body.customer_identifier).toBe('TRUMP');
      console.log('Deleted TRUMP customer');
    });

    it('should now allow deleting Trump face', async () => {
      const response = await request(app)
        .delete(`/api/management/faces/${xiTrumpFaceIds.trump}`)
        .expect(200);

      expect(response.body.face_id).toBe(xiTrumpFaceIds.trump);
      console.log('Deleted Trump face');
    });
  });

  describe('Step 9: Delete Elon customer then face', () => {
    it('should delete ELON_MUSK customer', async () => {
      const response = await request(app)
        .delete(`/api/management/customers/${customerIds.ELON_MUSK}`)
        .expect(200);

      expect(response.body.customer_identifier).toBe('ELON_MUSK');
      console.log('Deleted ELON_MUSK customer');
    });

    it('should now allow deleting Elon face', async () => {
      const response = await request(app)
        .delete(`/api/management/faces/${elonFaceId}`)
        .expect(200);

      expect(response.body.face_id).toBe(elonFaceId);
      console.log('Deleted Elon face');
    });
  });

  describe('Step 10: Delete orphaned faces', () => {
    it('should show orphaned faces in stats', async () => {
      const response = await request(app)
        .get('/api/management/stats')
        .expect(200);

      expect(response.body.orphaned_faces).toBeGreaterThan(0);
      console.log('Orphaned faces:', response.body.orphaned_faces);
    });

    it('should delete all orphaned faces', async () => {
      const response = await request(app)
        .delete('/api/management/faces/orphaned')
        .expect(200);

      expect(response.body.deleted_count).toBeGreaterThan(0);
      console.log(`Deleted ${response.body.deleted_count} orphaned faces`);
    });

    it('should show 0 orphaned faces after cleanup', async () => {
      const response = await request(app)
        .get('/api/management/stats')
        .expect(200);

      expect(response.body.orphaned_faces).toBe(0);
      console.log('Final stats:', response.body);
    });
  });

  describe('Step 11: Cleanup - Delete remaining XI customer and face', () => {
    it('should delete XI customer', async () => {
      const response = await request(app)
        .delete(`/api/management/customers/${customerIds.XI}`)
        .expect(200);

      expect(response.body.customer_identifier).toBe('XI');
    });

    it('should delete Xi face', async () => {
      const response = await request(app)
        .delete(`/api/management/faces/${xiTrumpFaceIds.xi}`)
        .expect(200);

      expect(response.body.face_id).toBe(xiTrumpFaceIds.xi);
    });

    it('should verify all test data cleaned up', async () => {
      const response = await request(app)
        .get('/api/management/stats')
        .expect(200);

      console.log('Final cleanup stats:', response.body);
    });
  });
});
