import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import uploadRoutes from "./routes/upload.js";
import quizRoutes from "./routes/quiz.js";
import { QuizManager } from "./utils/quiz.js";

import shopRoutes from "./routes/shops.js";
import contentRoutes from "./routes/content.js";
import vsRoutes from "./routes/vs.js";
import hateRoutes from "./routes/hate.js";
import adminRoutes from "./routes/admin.js";
import shareRoutes from "./routes/share.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/vs", vsRoutes);
app.use("/api/hate", hateRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/share", shareRoutes);

import rankingRoutes from "./routes/ranking.js";
app.use("/api/ranking", rankingRoutes);

import importRoutes from "./routes/import.js";
app.use("/api/import", importRoutes);

app.get("/health", (_req, res) => {
    res.send("OK");
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, async () => {
        console.log(`Server running on port ${port}`);
        await QuizManager.getInstance().checkAndSeed().catch(console.error);
    });
}

export default app;
