import express from "express";
import { storeEmbedding, compareEmbeddings, searchEmbeddings } from "./controllers/embeddingController";
import { listImages, getImage, deleteImage } from "./controllers/imageController";
import { detectFaces } from "./controllers/faceDetectionController";
import { visualizeFaces } from "./controllers/faceVisualizationController";
import { cropFaces } from "./controllers/cropFacesController";
import { validateBody } from "./middleware/validation";
import {
  detectFacesSchema,
  visualizeFacesSchema,
  cropFacesSchema,
  storeEmbeddingSchema,
  compareEmbeddingsSchema,
  searchEmbeddingsSchema,
} from "./schemas/requestSchemas";

const router = express.Router();

// Face detection and analysis (with validation)
router.post("/detect-faces", validateBody(detectFacesSchema), detectFaces);
router.post("/visualize-faces", validateBody(visualizeFacesSchema), visualizeFaces);
router.post("/crop-faces", validateBody(cropFacesSchema), cropFaces);

// Face recognition endpoints (with validation)
router.post("/store_embedding", validateBody(storeEmbeddingSchema), storeEmbedding);
router.post("/compare", validateBody(compareEmbeddingsSchema), compareEmbeddings);
router.post("/search", validateBody(searchEmbeddingsSchema), searchEmbeddings);

// Image management
router.get("/image/:id", getImage);
router.get("/list", listImages);
router.delete("/item/:id", deleteImage);

export default router;

