import { Request, Response } from "express";
import { promises as fs } from "fs";
import { listEmbeddings, getImageById, deleteEmbeddingById } from "../services/dbService";

export const listImages = async (req: Request, res: Response) => {
  try {
    // Parse limit from query string (default to 10)
    const limitStr = req.query.limit as string | undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;

    // Validate limit
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: "Invalid limit parameter" });
    }

    const rows = await listEmbeddings(limit);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
};

export const getImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const imagePath = await getImageById(id);
    if (!imagePath) return res.status(404).json({ error: "not found" });

    // Read the image file and convert to base64
    const imageBuffer = await fs.readFile(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    res.json({
      image_base64: imageBase64,
      saved_to: imagePath
    });
  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
};

export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    // Get image path before deleting from DB
    const imagePath = await getImageById(id);
    if (!imagePath) return res.status(404).json({ error: "not found" });

    // Delete from database
    const deleted = await deleteEmbeddingById(id);
    if (!deleted) return res.status(404).json({ error: "not found" });

    // Delete physical file
    try {
      await fs.unlink(imagePath);
    } catch (err) {
       
      console.warn(`Warning: Could not delete file ${imagePath}:`, err);
    }

    res.json({ deleted_id: id });
  } catch (err) {
     
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
};


