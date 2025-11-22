import { Request, Response } from "express";
import { promises as fs } from "fs";
import { listEmbeddings, getImageById, deleteEmbeddingById } from "../services/dbService";

export const listImages = async (req: Request, res: Response) => {
  const limitValue = parseInt((req.query.limit as string) ?? "10", 10);
  const limit = Number.isNaN(limitValue) ? 10 : limitValue;
  const rows = await listEmbeddings(limit);
  res.json(rows);
};

export const getImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const imagePath = await getImageById(id);
    if (!imagePath) return res.status(404).json({ error: "not found" });

    res.json({
      image_path: imagePath
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


