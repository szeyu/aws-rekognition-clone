import express from "express";
import { detectFaces, getFaceImage, enrollFace, recognizeFace } from "./controllers/facesController";
import {
  listDetectedFaces,
  listEnrolledCustomers,
  getCustomerDetails,
  deleteDetectedFace,
  deleteEnrolledCustomer,
  deleteOrphanedFaces,
  getStats,
} from "./controllers/managementController";
import { upload } from "./middleware/upload";

const router = express.Router();

// Stakeholder-required API endpoints
router.post("/faces/detect", upload.single("file"), detectFaces);
router.get("/faces/:face_id", getFaceImage);
router.post("/faces/enroll", enrollFace);
router.post("/faces/recognize", recognizeFace);

// Management API endpoints
router.get("/management/faces", listDetectedFaces);
router.get("/management/customers", listEnrolledCustomers);
router.get("/management/customers/:customer_id", getCustomerDetails);
router.get("/management/stats", getStats);
router.delete("/management/faces/orphaned", deleteOrphanedFaces);
router.delete("/management/faces/:face_id", deleteDetectedFace);
router.delete("/management/customers/:customer_id", deleteEnrolledCustomer);

export default router;

