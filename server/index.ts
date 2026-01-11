import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./db";
import { users } from "./db/schema";
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

app.get("/health", (req, res) => {
    res.send("OK");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
