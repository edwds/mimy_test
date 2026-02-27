import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import notificationRoutes from "./routes/notifications.js";
import bannerRoutes from "./routes/banners.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration with credentials support
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://mimytest.vercel.app', 'https://www.mimytest.vercel.app', 'capacitor://localhost', 'ionic://localhost']
        : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173', 'capacitor://localhost', 'ionic://localhost'],
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser()); // Parse cookies
app.use(express.json({ limit: '10mb' }));

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
app.use("/api/notifications", notificationRoutes);
app.use("/api/banners", bannerRoutes);

import rankingRoutes from "./routes/ranking.js";
app.use("/api/ranking", rankingRoutes);

import importRoutes from "./routes/import.js";
app.use("/api/import", importRoutes);

import affiliationRoutes from "./routes/affiliation.js";
app.use("/api/affiliation", affiliationRoutes);

import termsRoutes from "./routes/terms.js";
app.use("/api/terms", termsRoutes);

import relayRoutes from "./routes/relay.js";
app.use("/api/relay", relayRoutes);

import onboardingRoutes from "./routes/onboarding.js";
app.use("/api/onboarding", onboardingRoutes);


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
