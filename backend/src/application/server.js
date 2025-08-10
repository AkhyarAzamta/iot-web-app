import express from "express";
import cors from "cors";
import { errorHandler } from "../middleware/error.js";
import { router } from "../routes/api.js";
export const app = express();
import path from 'path';

app.use((req, res, next) => {
  // Set the Access-Control-Allow-Origin header to the specific origin
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
  // Set the Access-Control-Allow-Credentials header to true
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // Optionally, allow specific methods and headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));
app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello Gaes!" });
});

app.use(router);
app.use(errorHandler);