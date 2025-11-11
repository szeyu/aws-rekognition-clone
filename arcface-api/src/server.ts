import express from "express";
import bodyParser from "body-parser";
import { connectDB } from "./db";
import router from "./routes";
import { initModels } from "./embedding";

const app = express();

app.use(bodyParser.json({ limit: "10mb" }));
app.use("/api", router);

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  await initModels();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start();
