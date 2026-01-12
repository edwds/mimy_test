import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import uploadRoutes from "./routes/upload";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/health", (_req, res) => {
    res.send("OK");
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

export default app;
