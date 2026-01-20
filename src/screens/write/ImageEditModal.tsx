import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Check, RotateCcw, Trash2, Crop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reorder, useDragControls } from 'framer-motion';
import { processImageToSquare, processImageWithCrop } from '@/lib/imageProcessor';

import { Slider } from '@/components/ui/slider';

interface ImageEditModalProps {
    files: File[];
    isOpen: boolean;
    onClose: () => void;
    onEditingComplete: (files: File[], originalFirstFile?: File) => void;
}

interface ProcessingItem {
    id: string;
    file: File;
    previewUrl: string;
    blob: Blob | null;
    status: 'pending' | 'processing' | 'ready' | 'uploading' | 'done' | 'error';
}

export const ImageEditModal = ({ files, isOpen, onClose, onEditingComplete }: ImageEditModalProps) => {
    const [items, setItems] = useState<ProcessingItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(true);

    // Edit State
    const [editingItem, setEditingItem] = useState<ProcessingItem | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const containerRef = useRef<HTMLUListElement>(null);
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const moveItem = (index: number, direction: number) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= items.length) return;

        const newItems = [...items];
        const [movedItem] = newItems.splice(index, 1);
        newItems.splice(newIndex, 0, movedItem);
        setItems(newItems);

        // Ensure current item is selected
        setSelectedId(movedItem.id);

        // Scroll to the moved item
        // Scroll to the moved item
        setTimeout(() => {
            const el = itemRefs.current.get(movedItem.id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 250);
    };

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
            setSelectedId(null);
            itemRefs.current.clear();
        }
    }, [isOpen, files]);

    // Cleanup
    useEffect(() => {
        return () => {
            items.forEach(item => URL.revokeObjectURL(item.previewUrl));
        };
    }, []);

    const handleConfirm = () => {
        const finalFiles: File[] = items.map(item => {
            if (item.blob) {
                return new File([item.blob], item.file.name, { type: item.blob.type });
            }
            return item.file;
        });

        // Pass the original file of the first item to preserve EXIF data
        const originalFirstFile = items.length > 0 ? items[0].file : undefined;

        onEditingComplete(finalFiles, originalFirstFile);
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

    const handleDeleteItem = (id: string) => {
        const item = items.find(i => i.id === id);
        if (item) {
            URL.revokeObjectURL(item.previewUrl);
            setItems(prev => prev.filter(i => i.id !== id));
            setEditingItem(null);
            itemRefs.current.delete(id);
        }
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
                            onClick={handleConfirm}
                            disabled={isProcessing || items.length === 0}
                            className="bg-primary text-white hover:bg-primary/90 h-9 px-4 rounded-full font-bold"
                        >
                            완료
                        </Button>
                    </div>

                    <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center bg-[#111]">
                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-4 text-white/80">
                                <Loader2 className="w-10 h-10 animate-spin" />
                                <p>사진 불러오는 중...</p>
                            </div>
                        ) : (
                            <div className="w-full flex flex-col items-center h-full justify-center">
                                <div className="text-white/50 text-sm text-center">
                                    사진을 선택해서 편집하거나 순서를 변경하세요
                                </div>

                                <Reorder.Group
                                    ref={containerRef}
                                    axis="x"
                                    values={items}
                                    onReorder={setItems}
                                    className="flex gap-4 overflow-x-auto p-6 w-full min-h-[320px] items-center no-scrollbar touch-pan-x"
                                >
                                    {items.map((item, index) => (
                                        <DraggableItem
                                            key={item.id}
                                            domRef={(el) => {
                                                if (el) itemRefs.current.set(item.id, el);
                                                else itemRefs.current.delete(item.id);
                                            }}
                                            item={item}
                                            index={index}
                                            isSelected={selectedId === item.id}
                                            onSelect={() => setSelectedId(item.id)}
                                            onEdit={() => setEditingItem(item)}
                                            onDelete={() => handleDeleteItem(item.id)}
                                            onMoveLeft={() => moveItem(index, -1)}
                                            onMoveRight={() => moveItem(index, 1)}
                                            isFirst={index === 0}
                                            isLast={index === items.length - 1}
                                        />
                                    ))}
                                </Reorder.Group>
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
                    onDelete={() => handleDeleteItem(editingItem.id)}
                />
            )}
        </div>
    );
};

// --- Sub Components ---

const DraggableItem = ({
    item,
    index,
    domRef,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onMoveLeft,
    onMoveRight,
    isFirst,
    isLast
}: {
    item: ProcessingItem,
    index: number,
    domRef?: (element: any) => void,
    isSelected: boolean,
    onSelect: () => void,
    onEdit: () => void,
    onDelete: () => void,
    onMoveLeft: () => void,
    onMoveRight: () => void,
    isFirst: boolean,
    isLast: boolean
}) => {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            dragListener={false} // Disable auto drag to allow scroll
            dragControls={controls}
            className={`relative flex-shrink-0 w-[240px] h-[240px] rounded-xl overflow-hidden shadow-2xl border ${isSelected ? 'border-primary ring-2 ring-primary z-10' : 'border-white/10'}`}
            onClick={onSelect}
            style={{ touchAction: 'none' }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
        >
            <div ref={domRef} className="w-full h-full relative">
                <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover pointer-events-none select-none opacity-80" />

                {/* Index Badge */}
                <div className="absolute top-2 left-2 bg-black/50 rounded-full w-6 h-6 flex items-center justify-center text-xs text-white">
                    {index + 1}
                </div>

                {/* Delete Button (Top Right) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
                >
                    <X size={16} />
                </button>

                {/* Center Edit Button & Overlay (Visible when selected) */}
                {isSelected && (
                    <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center gap-4 pointer-events-none">
                        {/* Edit Button - Enable pointer events */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="pointer-events-auto bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 border border-white/20 transition-all active:scale-95"
                        >
                            <Crop size={16} />
                            편집
                        </button>

                    </div>
                )}

                {/* Reorder Buttons (Bottom) - Always visible or only selected? User said "image bottom < > buttons". Let's make them always visible or partially visible */}
                <div className="absolute bottom-0 left-0 right-0 p-2 flex justify-between items-end bg-gradient-to-t from-black/80 to-transparent pt-8">
                    <button
                        onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
                        disabled={isFirst}
                        className={`p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
                        disabled={isLast}
                        className={`p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors ${isLast ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

            </div>
        </Reorder.Item>
    );
};

import { ChevronLeft, ChevronRight } from 'lucide-react';

const CropEditor = ({ item, onCancel, onSave, onDelete }: { item: ProcessingItem, onCancel: () => void, onSave: (id: string, blob: Blob) => void, onDelete: () => void }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [originalUrl, setOriginalUrl] = useState<string>('');
    const [imgDims, setImgDims] = useState<{ w: number, h: number } | null>(null);

    // Constants
    const CROP_SIZE = 300;
    const OUTPUT_SIZE = 1080;
    const MIN_SCALE = 1;
    const MAX_SCALE = 3;

    // Load original image & dimensions
    useEffect(() => {
        const url = URL.createObjectURL(item.file);
        setOriginalUrl(url);

        const img = new Image();
        img.src = url;
        img.onload = () => {
            setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
        };

        return () => URL.revokeObjectURL(url);
    }, [item.file]);

    const handleSave = async () => {
        setIsProcessing(true);
        try {
            // Scale position from UI coords (300px base) to Output coords (1080px base)
            const ratio = OUTPUT_SIZE / CROP_SIZE;
            const scaledPos = {
                x: position.x * ratio,
                y: position.y * ratio,
                scale: scale
            };

            const newBlob = await processImageWithCrop(item.file, scaledPos, OUTPUT_SIZE);
            onSave(item.id, newBlob);
        } catch (e) {
            console.error(e);
            alert("편집 저장 실패");
            setIsProcessing(false);
        }
    };

    const getBoundaries = (currentScale: number) => {
        if (!imgDims) return { maxX: 0, maxY: 0 };
        const minDim = Math.min(imgDims.w, imgDims.h);
        const baseScale = CROP_SIZE / minDim;
        const W = imgDims.w * baseScale * currentScale;
        const H = imgDims.h * baseScale * currentScale;
        return {
            maxX: Math.max(0, (W - CROP_SIZE) / 2),
            maxY: Math.max(0, (H - CROP_SIZE) / 2)
        };
    };

    const handlePan = (e: React.PointerEvent) => {
        if (e.buttons !== 1) return;
        const { maxX, maxY } = getBoundaries(scale);

        setPosition(prev => ({
            x: Math.max(-maxX, Math.min(maxX, prev.x + e.movementX)),
            y: Math.max(-maxY, Math.min(maxY, prev.y + e.movementY))
        }));
    };

    // Calculate dimensions for standard "Cover" fit in 300px box
    const getRenderStyle = () => {
        if (!imgDims) return {};

        // Base scale to make shortest side = CROP_SIZE
        const minDim = Math.min(imgDims.w, imgDims.h);
        const baseScale = CROP_SIZE / minDim;

        // Apply user scale
        const currentScale = baseScale * scale;

        return {
            width: imgDims.w * currentScale,
            height: imgDims.h * currentScale,
            transform: `translate(${position.x}px, ${position.y}px)`, // Centered by flex, then offset
            transition: 'width 0.1s, height 0.1s' // Smooth zoom
        };
    };

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 z-10 bg-black/50 backdrop-blur-md">
                <button onClick={onCancel} className="p-2 text-white">
                    <X />
                </button>
                <div className="font-bold text-white">편집</div>
                <button onClick={handleSave} className="p-2 text-primary font-bold">
                    <Check />
                </button>
            </div>

            {/* Editor Area */}
            <div
                className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#111] touch-none"
                onPointerMove={handlePan}
            >
                {/* Image Layer - Centered by Flex */}
                {originalUrl && imgDims && (
                    <img
                        src={originalUrl}
                        alt="Edit Target"
                        style={getRenderStyle()}
                        className="object-cover pointer-events-none select-none max-w-none max-h-none"
                        draggable={false}
                    />
                )}

                {/* Overlay Layer - Fixed Center Crop Box */}
                <div
                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                >
                    <div
                        style={{ width: CROP_SIZE, height: CROP_SIZE }}
                        className="border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
                    >
                        {/* Grid Lines */}
                        <div className="absolute inset-0 opacity-50">
                            <div className="absolute top-1/3 w-full h-px bg-white/50" />
                            <div className="absolute top-2/3 w-full h-px bg-white/50" />
                            <div className="absolute left-1/3 h-full w-px bg-white/50" />
                            <div className="absolute left-2/3 h-full w-px bg-white/50" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-8 pb-12 bg-black/90 z-10">
                <div className="flex items-center gap-4">
                    <span className="text-xs text-white/50">축소</span>
                    <Slider
                        value={[scale]}
                        min={MIN_SCALE}
                        max={MAX_SCALE}
                        step={0.01}
                        onValueChange={(vals) => {
                            const newScale = vals[0];
                            setScale(newScale);
                            // Re-clamp position for new scale
                            const { maxX, maxY } = getBoundaries(newScale);
                            setPosition(prev => ({
                                x: Math.max(-maxX, Math.min(maxX, prev.x)),
                                y: Math.max(-maxY, Math.min(maxY, prev.y))
                            }));
                        }}
                        className="flex-1"
                    />
                    <span className="text-xs text-white/50">확대</span>
                </div>
                <div className="flex justify-between items-center mt-4 px-4">
                    <button
                        onClick={onCancel}
                        className="text-white/50 flex flex-col items-center gap-1 text-[10px] hover:text-white transition-colors"
                    >
                        <X size={20} /> 취소
                    </button>
                    <button
                        onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
                        className="text-white/50 flex flex-col items-center gap-1 text-[10px] hover:text-white transition-colors"
                    >
                        <RotateCcw size={20} /> 초기화
                    </button>
                    <button
                        onClick={onDelete}
                        className="text-red-400/80 flex flex-col items-center gap-1 text-[10px] hover:text-red-400 transition-colors"
                    >
                        <Trash2 size={20} /> 삭제
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
