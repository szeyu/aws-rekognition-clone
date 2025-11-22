import express from "express";
import { storeEmbedding, compareEmbeddings, searchEmbeddings } from "./controllers/embeddingController";
import { listImages, getImage, deleteImage } from "./controllers/imageController";
import { detectFaces } from "./controllers/faceDetectionController";
import { visualizeFaces } from "./controllers/faceVisualizationController";
import { cropFaces } from "./controllers/cropFacesController";

const router = express.Router();

// Face detection and analysis
router.post("/detect-faces", detectFaces);
router.post("/visualize-faces", visualizeFaces);
router.post("/crop-faces", cropFaces);

// Face recognition endpoints
router.post("/store_embedding", storeEmbedding);
router.post("/compare", compareEmbeddings);
router.post("/search", searchEmbeddings);

// Image management
router.get("/image/:id", getImage);
router.get("/list", listImages);
router.delete("/item/:id", deleteImage);

export default router;

