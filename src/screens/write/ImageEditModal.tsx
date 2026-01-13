import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reorder, useDragControls } from 'framer-motion';
import { processImageToSquare, processImageWithCrop } from '@/lib/imageProcessor';
import { API_BASE_URL } from '@/lib/api';
import { Slider } from '@/components/ui/slider';

interface ImageEditModalProps {
    files: File[];
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: (urls: string[]) => void;
}

interface ProcessingItem {
    id: string;
    file: File;
    previewUrl: string;
    blob: Blob | null;
    status: 'pending' | 'processing' | 'ready' | 'uploading' | 'done' | 'error';
}

export const ImageEditModal = ({ files, isOpen, onClose, onUploadComplete }: ImageEditModalProps) => {
    const [items, setItems] = useState<ProcessingItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    // Edit State
    const [editingItem, setEditingItem] = useState<ProcessingItem | null>(null);

    // 1. Initial Processing
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
            setItems([]);
            setEditingItem(null);
        }
    }, [isOpen, files]);

    // Cleanup
    useEffect(() => {
        return () => {
            items.forEach(item => URL.revokeObjectURL(item.previewUrl));
        };
    }, []);

    const handleConfirmUpload = async () => {
        setIsUploading(true);
        const uploadedUrls: string[] = [];
        let completed = 0;

        for (const item of items) {
            if (!item.blob) continue;

            try {
                const formData = new FormData();
                formData.append('file', item.blob, item.file.name);

                const response = await fetch(`${API_BASE_URL}/api/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    uploadedUrls.push(data.url);
                }
            } catch (e) {
                console.error("Upload error", e);
            }

            completed++;
            setProgress((completed / items.length) * 100);
        }

        setIsUploading(false);
        onUploadComplete(uploadedUrls);
        onClose();
    };

    const handleSaveCrop = async (id: string, newBlob: Blob) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        // Revoke old url
        URL.revokeObjectURL(item.previewUrl);

        // Update item
        const newUrl = URL.createObjectURL(newBlob);
        setItems(prev => prev.map(i => i.id === id ? { ...i, blob: newBlob, previewUrl: newUrl } : i));
        setEditingItem(null);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
            {/* Main View */}
            {!editingItem && (
                <>
                    <div className="flex items-center justify-between p-4 bg-black/50 text-white z-10">
                        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                            <X className="w-6 h-6" />
                        </button>
                        <div className="font-bold text-lg">사진 편집 ({items.length})</div>
                        <Button
                            onClick={handleConfirmUpload}
                            disabled={isProcessing || isUploading || items.length === 0}
                            className="bg-primary text-white hover:bg-primary/90 h-9 px-4 rounded-full font-bold"
                        >
                            {isUploading ? "업로드 중..." : "완료"}
                        </Button>
                    </div>

                    <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-4 bg-[#111]">
                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-4 text-white/80">
                                <Loader2 className="w-10 h-10 animate-spin" />
                                <p>사진 불러오는 중...</p>
                            </div>
                        ) : (
                            <div className="w-full flex flex-col items-center gap-6 h-full justify-center">
                                <div className="text-white/50 text-sm mb-2 text-center">
                                    사진을 꾹 눌러서 순서를 변경하거나<br />터치해서 편집하세요
                                </div>

                                <Reorder.Group
                                    axis="x"
                                    values={items}
                                    onReorder={setItems}
                                    className="flex gap-4 overflow-x-auto p-4 w-full min-h-[320px] items-center no-scrollbar touch-pan-x"
                                    style={{ scrollBehavior: 'smooth' }}
                                >
                                    {items.map((item, index) => (
                                        <DraggableItem
                                            key={item.id}
                                            item={item}
                                            index={index}
                                            onClick={() => setEditingItem(item)}
                                        />
                                    ))}
                                </Reorder.Group>
                            </div>
                        )}

                        {/* Progress Overlay */}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                                <div className="w-64 space-y-4 text-center">
                                    <div className="text-white font-bold text-xl">업로드 중... {Math.round(progress)}%</div>
                                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Crop Editor Overlay */}
            {editingItem && (
                <CropEditor
                    item={editingItem}
                    onCancel={() => setEditingItem(null)}
                    onSave={handleSaveCrop}
                />
            )}
        </div>
    );
};

// --- Sub Components ---

const DraggableItem = ({ item, index, onClick }: { item: ProcessingItem, index: number, onClick: () => void }) => {
    const controls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        // Start long press timer
        timeoutRef.current = setTimeout(() => {
            setIsDragging(true);
            controls.start(e);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 300); // 300ms long press
    };

    const handlePointerUp = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsDragging(false);
    };

    const handlePointerMove = () => {
        // If moved significantly before timer, cancel timer (handled by browser usually but good to be safe)
        // Actually framer motion handles drag start, so if we don't call start, it won't drag.
        // But we want to allow Scrolling.
    };

    return (
        <Reorder.Item
            value={item}
            dragListener={false} // Disable auto drag to allow scroll
            dragControls={controls}
            className={`relative flex-shrink-0 w-[240px] h-[240px] rounded-xl overflow-hidden shadow-2xl border border-white/10 transition-transform ${isDragging ? 'scale-105 ring-2 ring-primary z-50' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={() => {
                // Only trigger click if not dragging
                if (!isDragging) onClick();
            }}
            style={{ touchAction: 'none' }}
        >
            <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover pointer-events-none select-none" />
            <div className="absolute top-2 right-2 bg-black/50 rounded-full w-6 h-6 flex items-center justify-center text-xs text-white">
                {index + 1}
            </div>
            {isDragging && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none">
                    <div className="text-white font-bold drop-shadow-md">이동 중</div>
                </div>
            )}
        </Reorder.Item>
    );
};

const CropEditor = ({ item, onCancel, onSave }: { item: ProcessingItem, onCancel: () => void, onSave: (id: string, blob: Blob) => void }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    // Limits
    const minScale = 1;
    const maxScale = 3;

    const handleSave = async () => {
        setIsProcessing(true);
        try {
            // Apply scale/position to create new blob
            // Note: position (x,y) are relative to the view.
            // Our processor expects crop params.
            // We need to pass 'scale' directly.
            // 'x' and 'y' from drag are pixels. We pass them as is.
            const newBlob = await processImageWithCrop(item.file, { x: position.x, y: position.y, scale }, 1080);
            onSave(item.id, newBlob);
        } catch (e) {
            console.error(e);
            alert("편집 저장 실패");
            setIsProcessing(false);
        }
    };

    // Simple pan logic
    const handlePan = (e: React.PointerEvent) => {
        if (e.buttons !== 1) return;
        setPosition(prev => ({
            x: prev.x + e.movementX,
            y: prev.y + e.movementY
        }));
    };

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center justify-between p-4 z-10">
                <button onClick={onCancel} className="p-2 text-white">
                    <X />
                </button>
                <div className="font-bold text-white">편집</div>
                <button onClick={handleSave} className="p-2 text-primary font-bold">
                    <Check />
                </button>
            </div>

            <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#111]" onPointerMove={handlePan}>
                <div className="relative w-[300px] h-[300px] border-2 border-white/20 overflow-hidden shadow-2xl">
                    <div
                        className="w-full h-full flex items-center justify-center cursor-move"
                        style={{
                            backgroundImage: `url(${item.previewUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                            transformOrigin: 'center',
                            transition: 'transform 0.05s linear'
                        }}
                    />
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-30">
                        <div className="absolute top-1/3 w-full h-px bg-white/50" />
                        <div className="absolute top-2/3 w-full h-px bg-white/50" />
                        <div className="absolute left-1/3 h-full w-px bg-white/50" />
                        <div className="absolute left-2/3 h-full w-px bg-white/50" />
                    </div>
                </div>
            </div>

            <div className="p-8 pb-12 bg-black/50">
                <div className="flex items-center gap-4">
                    <span className="text-xs text-white/50">축소</span>
                    <Slider
                        value={[scale]}
                        min={minScale}
                        max={maxScale}
                        step={0.01}
                        onValueChange={(vals) => setScale(vals[0])}
                        className="flex-1"
                    />
                    <span className="text-xs text-white/50">확대</span>
                </div>
                <div className="text-center mt-4">
                    <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }} className="text-xs text-white/50 flex items-center justify-center gap-1 mx-auto">
                        <RotateCcw size={12} /> 초기화
                    </button>
                </div>
            </div>

            {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
                    <Loader2 className="animate-spin text-white" />
                </div>
            )}
        </div>
    );
};
