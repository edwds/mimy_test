import { Router } from "express";
import multer from "multer";
import { put } from "@vercel/blob";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
    try {
        console.log("[Upload] Request received");

        if (!req.file) {
            console.error("[Upload] ❌ No file in request");
            return res.status(400).json({ error: "No file uploaded" });
        }

        console.log("[Upload] File details:", {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            bufferLength: req.file.buffer?.length
        });

        // Validate file
        if (!req.file.buffer || req.file.buffer.length === 0) {
            console.error("[Upload] ❌ Empty file buffer");
            return res.status(400).json({ error: "Empty file" });
        }

        if (!req.file.mimetype.startsWith('image/')) {
            console.error("[Upload] ❌ Invalid file type:", req.file.mimetype);
            return res.status(400).json({ error: "Invalid file type" });
        }

        // iOS Fix: Normalize filename
        const filename = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');

        // Upload to Vercel Blob
        const blob = await put(filename, req.file.buffer, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: true,
            contentType: req.file.mimetype
        });

        console.log("[Upload] ✅ Success:", blob.url);
        res.json({ url: blob.url });
    } catch (error: any) {
        console.error("[Upload] ❌ Error:", error);
        if (error.cause) console.error("[Upload] Cause:", error.cause);
        res.status(500).json({ error: "Upload failed", details: error.message });
    }
});

// Base64 upload endpoint for iOS/native apps
router.post("/base64", async (req, res) => {
    try {
        console.log("[Upload] Base64 upload request received");

        const { filename, mimetype, data } = req.body;

        if (!filename || !mimetype || !data) {
            console.error("[Upload] ❌ Missing required fields");
            return res.status(400).json({ error: "Missing filename, mimetype, or data" });
        }

        console.log("[Upload] File details:", {
            filename,
            mimetype,
            dataLength: data.length
        });

        // Validate mimetype
        if (!mimetype.startsWith('image/')) {
            console.error("[Upload] ❌ Invalid file type:", mimetype);
            return res.status(400).json({ error: "Invalid file type" });
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(data, 'base64');
        console.log("[Upload] Buffer created, size:", buffer.length);

        if (buffer.length === 0) {
            console.error("[Upload] ❌ Empty buffer");
            return res.status(400).json({ error: "Empty file" });
        }

        // Normalize filename
        const normalizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

        // Upload to Vercel Blob
        const blob = await put(normalizedFilename, buffer, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: true,
            contentType: mimetype
        });

        console.log("[Upload] ✅ Success:", blob.url);
        res.json({ url: blob.url });
    } catch (error: any) {
        console.error("[Upload] ❌ Error:", error);
        if (error.cause) console.error("[Upload] Cause:", error.cause);
        res.status(500).json({ error: "Upload failed", details: error.message });
    }
});

export default router;
