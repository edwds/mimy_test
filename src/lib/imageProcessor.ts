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
