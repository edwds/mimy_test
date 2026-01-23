/**
 * Resizes and crops an image to a square blob.
 * @param file The original image file.
 * @param size The target width/height (default 1080px).
 * @returns Promise resolving to a Blob.
 */
export const processImageToSquare = (file: File, size = 1080): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
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

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Canvas validation failed"));
                }
                URL.revokeObjectURL(img.src); // Cleanup
            }, 'image/jpeg', 0.9);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            reject(err);
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
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
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

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Canvas validation failed"));
                }
                URL.revokeObjectURL(img.src);
            }, 'image/jpeg', 0.9);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            reject(err);
        };
    });
};
