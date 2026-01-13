import React, { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reorder } from 'framer-motion';
import { processImageToSquare } from '@/lib/imageProcessor';
import { API_BASE_URL } from '@/lib/api';

interface ImageEditModalProps {
    files: File[];
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: (urls: string[]) => void;
}

interface ProcessingItem {
    id: string; // unique ID for reorder
    file: File;
    previewUrl: string; // Blob URL for preview
    blob: Blob | null; // Processed square blob
    status: 'pending' | 'processing' | 'ready' | 'uploading' | 'done' | 'error';
}

export const ImageEditModal = ({ files, isOpen, onClose, onUploadComplete }: ImageEditModalProps) => {
    const [items, setItems] = useState<ProcessingItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    // 1. Initial Processing (Crop to Square)
    useEffect(() => {
        if (isOpen && files.length > 0) {
            const processFiles = async () => {
                setIsProcessing(true);
                const newItems: ProcessingItem[] = [];

                for (const file of files) {
                    try {
                        const blob = await processImageToSquare(file);
                        newItems.push({
                            id: Math.random().toString(36).substr(2, 9),
                            file,
                            previewUrl: URL.createObjectURL(blob),
                            blob,
                            status: 'ready'
                        });
                    } catch (e) {
                        console.error("Failed to process image", file.name, e);
                    }
                }
                setItems(newItems);
                setIsProcessing(false);
            };
            processFiles();
        } else {
            setItems([]); // Reset when closed
        }
    }, [isOpen, files]);

    // Cleanup blob URLs
    useEffect(() => {
        return () => {
            items.forEach(item => URL.revokeObjectURL(item.previewUrl));
        };
    }, []);

    // 2. Upload Handler
    const handleConfirmUpload = async () => {
        setIsUploading(true);
        const uploadedUrls: string[] = [];
        let completed = 0;

        for (const item of items) {
            if (!item.blob) continue;

            try {
                const formData = new FormData();
                formData.append('file', item.blob, item.file.name); // Send the square blob

                const response = await fetch(`${API_BASE_URL}/api/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    uploadedUrls.push(data.url);
                } else {
                    console.error("Upload failed for", item.file.name);
                }
            } catch (e) {
                console.error("Upload network error", e);
            }

            completed++;
            setProgress((completed / items.length) * 100);
        }

        setIsUploading(false);
        onUploadComplete(uploadedUrls); // Send back valid URLs
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50 text-white">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                    <X className="w-6 h-6" />
                </button>
                <div className="font-bold text-lg">Edit Photos ({items.length})</div>
                <Button
                    onClick={handleConfirmUpload}
                    disabled={isProcessing || isUploading || items.length === 0}
                    className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90"
                >
                    {isUploading ? "Uploading..." : "Done"}
                </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-4">
                {isProcessing ? (
                    <div className="flex flex-col items-center gap-4 text-white/80">
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <p>Processing images...</p>
                    </div>
                ) : (
                    <div className="max-w-[100%] w-full flex flex-col items-center gap-6">
                        {/* Main Preview (Carousel style / Horizontal Scroll) */}
                        <div className="w-full text-center text-white/50 text-sm mb-2">
                            Drag to reorder
                        </div>

                        <Reorder.Group
                            axis="x"
                            values={items}
                            onReorder={setItems}
                            className="flex gap-4 overflow-x-auto p-4 w-full justify-start md:justify-center min-h-[300px] items-center no-scrollbar"
                        >
                            {items.map((item) => (
                                <Reorder.Item
                                    key={item.id}
                                    value={item}
                                    className="relative flex-shrink-0 w-[280px] h-[280px] bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-white/10"
                                    whileDrag={{ scale: 1.05 }}
                                >
                                    <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover pointer-events-none" />
                                    <div className="absolute top-2 right-2 bg-black/50 rounded-full w-6 h-6 flex items-center justify-center text-xs text-white">
                                        {items.indexOf(item) + 1}
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>

                        {/* Progress Bar Overlay */}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
                                <div className="w-64 space-y-2 text-center">
                                    <div className="text-white font-bold text-xl">Uploading... {Math.round(progress)}%</div>
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--color-primary)] transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
