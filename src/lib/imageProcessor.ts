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
export const processImageWithCrop = (file: File | Blob, crop: { x: number, y: number, scale: number }, size = 1080): Promise<Blob> => {
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

            // User's crop values are relative to the "preview" container size usually.
            // We need to map them to the actual image size.
            // However, usually crop UIs work by showing the image in a container and giving offsets.
            // A simple approach:
            // The user sees the image at 'scale' within a square box.
            // 'x' and 'y' are the offsets of the image center relative to the box center, or similar.
            // Let's assume standard CSS transform values: translate(x, y) scale(scale).

            // To reproduce exactly what the user saw in a 1080x1080 canvas:
            // 1. Center logic.
            // 2. Apply scale.
            // 3. Apply translation.

            // However, the input image likely has different aspect ratio.
            // The "base" fit was "cover" or "contain".
            // Let's assume the UI initialized with "contain" or "cover" and the user adjusted from there.

            // Let's standardize: 
            // The input crop parameters (x, y, scale) are percentages or pixels relative to the *output size*.
            // e.g. x=0, y=0, scale=1 means centered, covering the square.

            // Strategy:
            // Draw image into canvas with transforms.

            const minDim = Math.min(img.width, img.height);
            // Base scale to cover the square
            const baseScale = size / minDim;

            // Final scale = baseScale * crop.scale
            const finalScale = baseScale * crop.scale;

            const w = img.width * finalScale;
            const h = img.height * finalScale;

            // Center position
            const centerX = size / 2;
            const centerY = size / 2;

            // Apply offset (x, y are in pixels relative to the 1080px canvas)
            const drawX = centerX - (w / 2) + crop.x;
            const drawY = centerY - (h / 2) + crop.y;

            ctx.drawImage(img, drawX, drawY, w, h);

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
