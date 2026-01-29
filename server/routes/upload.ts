import { Router } from "express";
import multer from "multer";
import { put } from "@vercel/blob";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", requireAuth, upload.single("file"), async (req, res) => {
    try {
        console.log("Upload request received");
        if (!req.file) {
            console.error("No file in request");
            return res.status(400).json({ error: "No file uploaded" });
        }
        console.log("File details:", {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Upload to Vercel Blob
        const blob = await put(req.file.originalname, req.file.buffer, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: true, // Prevent filename collisions
        });

        console.log("Upload success:", blob.url);
        res.json({ url: blob.url });
    } catch (error: any) {
        console.error("Upload error details:", error);
        if (error.cause) console.error("Cause:", error.cause);
        res.status(500).json({ error: "Upload failed", details: error.message });
    }
});

export default router;
