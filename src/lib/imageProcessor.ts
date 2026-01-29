/**
 * Resizes and crops an image to a square blob.
 * @param file The original image file.
 * @param size The target width/height (default 1080px).
 * @returns Promise resolving to a Blob.
 */
export const processImageToSquare = (file: File, size = 1080): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        console.log('[imageProcessor] Processing file:', file.name, 'size:', file.size, 'type:', file.type);

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        img.onload = () => {
            console.log('[imageProcessor] Image loaded:', img.width, 'x', img.height);

            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d', { alpha: false });

            if (!ctx) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Canvas context not available"));
                return;
            }

            // Calculate crop (Center Crop)
            const minDim = Math.min(img.width, img.height);
            const scale = size / minDim;
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (size - w) / 2;
            const y = (size - h) / 2;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);

            // Draw image centered and scaled to cover square
            ctx.drawImage(img, x, y, w, h);

            // iOS Fix: Use higher quality and explicit MIME type
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(objectUrl); // Cleanup

                if (blob && blob.size > 0) {
                    console.log('[imageProcessor] ✅ Blob created successfully:', blob.size, 'bytes');
                    resolve(blob);
                } else {
                    console.error('[imageProcessor] ❌ Canvas toBlob failed or empty blob');
                    reject(new Error("Canvas toBlob failed"));
                }
            }, 'image/jpeg', 0.92);
        };

        img.onerror = (err) => {
            console.error('[imageProcessor] ❌ Image load error:', err);
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image"));
        };
    });
};

/**
 * Resizes and crops an image to a square blob with manual adjustments.
 * @param file The original image file/blob.
 * @param crop The crop configuration (x, y, scale).
 * @param size The target width/height (default 1080px).
 * @returns Promise resolving to a Blob.
 */
export const processImageWithCrop = (file: File | Blob, crop: { x: number, y: number, scale: number, rotation?: number }, size = 1080): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        console.log('[imageProcessor] Processing with crop:', crop);

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        img.onload = () => {
            console.log('[imageProcessor] Image loaded for crop:', img.width, 'x', img.height);

            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d', { alpha: false });

            if (!ctx) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Canvas context not available"));
                return;
            }

            // Draw white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);

            const minDim = Math.min(img.width, img.height);
            // Base scale to cover the square
            const baseScale = size / minDim;

            // Final scale = baseScale * crop.scale
            const finalScale = baseScale * crop.scale;

            const w = img.width * finalScale;
            const h = img.height * finalScale;

            // Center position (Destination center)
            const centerX = size / 2;
            const centerY = size / 2;

            // Save context state
            ctx.save();

            // 1. Move to the center of where the image should be drawn
            //    (Canvas Center + Pan Offset is the new center of the image)
            ctx.translate(centerX + crop.x, centerY + crop.y);

            // 2. Rotate around this center
            if (crop.rotation) {
                ctx.rotate((crop.rotation * Math.PI) / 180);
            }

            // 3. Draw image centered at the origin (0,0 after translate)
            ctx.drawImage(img, -w / 2, -h / 2, w, h);

            // Restore context
            ctx.restore();

            // iOS Fix: Use higher quality and explicit MIME type
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(objectUrl);

                if (blob && blob.size > 0) {
                    console.log('[imageProcessor] ✅ Cropped blob created successfully:', blob.size, 'bytes');
                    resolve(blob);
                } else {
                    console.error('[imageProcessor] ❌ Canvas toBlob failed or empty blob');
                    reject(new Error("Canvas toBlob failed"));
                }
            }, 'image/jpeg', 0.92);
        };

        img.onerror = (err) => {
            console.error('[imageProcessor] ❌ Image load error:', err);
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image"));
        };
    });
};
