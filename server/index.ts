import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import uploadRoutes from "./routes/upload";
import quizRoutes from "./routes/quiz";
import { QuizManager } from "./utils/quiz";

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
