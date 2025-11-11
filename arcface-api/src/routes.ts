import express from "express";
import { client, vectorToSql } from "./db";
import { preprocessImage, computeEmbedding } from "./embedding";

const router = express.Router();

router.post("/store_embedding", async (req, res) => {
  try {
    const { image_base64 } = req.body as { image_base64?: string };
    if (!image_base64) return res.status(400).json({ error: "Missing image_base64" });

    const tensor = await preprocessImage(image_base64);
    const embedding = await computeEmbedding(tensor);

    const result = await client.query(
      "INSERT INTO face_embeddings (embedding, image_base64) VALUES ($1, $2) RETURNING id",
      [vectorToSql(embedding), image_base64]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

router.post("/compare", async (req, res) => {
  try {
    const { image_base64_A, image_base64_B } = req.body as {
      image_base64_A?: string;
      image_base64_B?: string;
    };
    if (!image_base64_A || !image_base64_B) return res.status(400).json({ error: "Missing images" });

    const embA = await computeEmbedding(await preprocessImage(image_base64_A));
    const embB = await computeEmbedding(await preprocessImage(image_base64_B));

    // cosine similarity
    const dot = embA.reduce((acc, v, i) => acc + v * embB[i], 0);
    const normA = Math.sqrt(embA.reduce((acc, v) => acc + v * v, 0));
    const normB = Math.sqrt(embB.reduce((acc, v) => acc + v * v, 0));
    const cosine = dot / (normA * normB);

    // euclidean distance
    const euclidean = Math.sqrt(embA.reduce((acc, v, i) => acc + (v - embB[i]) ** 2, 0));

    res.json({ cosine, euclidean });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

router.post("/search", async (req, res) => {
  try {
    const { image_base64, top_k } = req.body as { image_base64?: string; top_k?: number | string };
    if (!image_base64 || top_k === undefined) return res.status(400).json({ error: "Missing params" });

    const limit = Number(top_k);
    if (!Number.isFinite(limit) || limit <= 0) {
      return res.status(400).json({ error: "Invalid top_k" });
    }

    const embedding = await computeEmbedding(await preprocessImage(image_base64));
    const result = await client.query(
      "SELECT id, 1 - (embedding <=> $1) as cosine FROM face_embeddings ORDER BY embedding <-> $1 LIMIT $2",
      [vectorToSql(embedding), limit]
    );
    res.json(result.rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

router.get("/image/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await client.query("SELECT image_base64 FROM face_embeddings WHERE id=$1", [id]);
  if (!result.rows.length) return res.status(404).json({ error: "not found" });
  res.json({ image_base64: result.rows[0].image_base64 });
});

router.get("/list", async (req, res) => {
  const limitValue = parseInt((req.query.limit as string) ?? "10", 10);
  const limit = Number.isNaN(limitValue) ? 10 : limitValue;
  const result = await client.query(
    "SELECT id, created_at FROM face_embeddings ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  res.json(result.rows);
});

router.delete("/item/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await client.query("DELETE FROM face_embeddings WHERE id=$1 RETURNING id", [id]);
  if (!result.rows.length) return res.status(404).json({ error: "not found" });
  res.json({ deleted_id: id });
});

export default router;


