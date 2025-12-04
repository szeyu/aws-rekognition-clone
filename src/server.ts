#!/usr/bin/env node
import express from "express";
import { connectDB } from "./db";
import router from "./routes";
import { initModels } from "./embedding";
import { s3Service } from "./services/s3Service";

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log when response is finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 500 ? "\x1b[31m" : // Red for 5xx
                       res.statusCode >= 400 ? "\x1b[33m" : // Yellow for 4xx
                       res.statusCode >= 300 ? "\x1b[36m" : // Cyan for 3xx
                       "\x1b[32m"; // Green for 2xx
    const reset = "\x1b[0m";

    console.log(
      `${req.method} ${req.originalUrl} ${statusColor}${res.statusCode}${reset} ${duration}ms`
    );
  });

  next();
});

app.use(express.json({ limit: "10mb" }));
app.use("/api", router);

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  await s3Service.ensureBucketExists();
  await initModels();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  start();
}

// Export app for testing
export { app };
