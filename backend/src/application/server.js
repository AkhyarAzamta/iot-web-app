import express from "express";
import cors from "cors";
import { errorHandler } from "../middleware/error.js";
import { router } from "../routes/api.js";
export const app = express();
import path from 'path';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));
app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello Gaes!" });
});

app.use(router);
app.use(errorHandler);