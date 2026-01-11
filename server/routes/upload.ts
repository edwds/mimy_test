import { Router } from "express";
import multer from "multer";
import { put } from "@vercel/blob";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Upload to Vercel Blob
        const blob = await put(req.file.originalname, req.file.buffer, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        res.json({ url: blob.url });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Upload failed" });
    }
});

export default router;
