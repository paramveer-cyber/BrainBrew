import "dotenv/config";
import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import generatorRoutes from "./modules/generator/generator.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "https://brainbrew.pages.dev"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api", generatorRoutes);
app.use("/api/admin", adminRoutes);

app.get("/health", (_, res) => res.json({ status: "ok", ts: Date.now() }));
app.use((_, res) => res.status(404).json({ error: "Not found" }));

const server = createServer(app);
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`[testgen] server running on http://localhost:${PORT}`);
});
