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
    onEditingComplete: (files: File[], originalFirstFile?: File, imgTexts?: string[]) => void;
}

interface ProcessingItem {
    id: string;
    file: File;
    previewUrl: string;
    blob: Blob | null;
    status: 'pending' | 'processing' | 'ready' | 'uploading' | 'done' | 'error';
    imgText?: string;
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
        // Extract texts
        const imgTexts = items.map(i => i.imgText || "");

        onEditingComplete(finalFiles, originalFirstFile, imgTexts);
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
                    <div
                        className="flex items-center justify-between px-4 pb-4 bg-black/50 text-white z-10"
                        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
                    >
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
                            <div className="w-full flex flex-col items-center h-full justify-center pb-20">
                                <div className="text-white/50 text-base text-center">
                                    사진을 크롭하거나 순서를 변경할 수 있어요
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
                                            onTextChange={(val) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, imgText: val } : i))}
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
    onTextChange,
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
    onTextChange: (val: string) => void,
    isFirst: boolean,
    isLast: boolean
}) => {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            dragListener={false} // Disable auto drag to allow scroll
            dragControls={controls}
            className={`relative flex-shrink-0 flex flex-col items-center gap-2`}
            onClick={onSelect}
            style={{ touchAction: 'pan-x' }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
        >
            <div className={`relative w-[240px] h-[240px] rounded-xl overflow-hidden shadow-2xl border ${isSelected ? 'border-primary ring-2 ring-primary z-10' : 'border-white/10'}`}>
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

                    {/* Reorder Buttons (Bottom) */}
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
            </div>

            {/* Attached Caption Input */}
            <input
                type="text"
                maxLength={20}
                placeholder="메뉴 이름을 적어주세요"
                value={item.imgText || ''}
                onChange={(e) => onTextChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent py-2 text-center text-white/50 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
            />
        </Reorder.Item>
    );
};

import { ChevronLeft, ChevronRight } from 'lucide-react';

const CropEditor = ({ item, onCancel, onSave, onDelete }: { item: ProcessingItem, onCancel: () => void, onSave: (id: string, blob: Blob) => void, onDelete: () => void }) => {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [originalUrl, setOriginalUrl] = useState<string>('');
    const [imgDims, setImgDims] = useState<{ w: number, h: number } | null>(null);

    // Zoom/Pan Refs
    const pinchStartDist = useRef<number | null>(null);
    const startScaleRef = useRef<number>(1);



    // Constants
    const CROP_SIZE = 300;
    const OUTPUT_SIZE = 1080;
    const MIN_SCALE = 1;
    const MAX_SCALE = 5; // Allow more zoom for rotation compensation

    const updateScale = (newScale: number) => {
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        setScale(newScale);

        // Re-clamp position for new scale
        const { maxX, maxY } = getBoundaries(newScale);
        setPosition(prev => ({
            x: Math.max(-maxX, Math.min(maxX, prev.x)),
            y: Math.max(-maxY, Math.min(maxY, prev.y))
        }));
    };

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
                scale: scale,
                rotation: rotation
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



    // --- Touch Handlers (Mobile Pinch) ---
    const getTouchDist = (t1: React.Touch, t2: React.Touch) => {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            pinchStartDist.current = getTouchDist(e.touches[0], e.touches[1]);
            startScaleRef.current = scale;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDist.current !== null) {
            const currentDist = getTouchDist(e.touches[0], e.touches[1]);
            const ratio = currentDist / pinchStartDist.current;
            updateScale(startScaleRef.current * ratio);
        }
    };

    // --- Mouse Handlers (PC Pan) ---
    const isDraggingRef = useRef(false);
    const lastMousePos = useRef<{ x: number, y: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDraggingRef.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDraggingRef.current && lastMousePos.current) {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;

            const { maxX, maxY } = getBoundaries(scale);

            setPosition(prev => ({
                x: Math.max(-maxX, Math.min(maxX, prev.x + dx)),
                y: Math.max(-maxY, Math.min(maxY, prev.y + dy))
            }));

            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        lastMousePos.current = null;
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
            transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
            transition: 'width 0.1s, height 0.1s, transform 0.1s'
        };
    };

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 pb-4 z-10 bg-black/50 backdrop-blur-md"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
            >
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
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
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
                    <span className="text-xs text-white/50 w-8 text-right">-45°</span>
                    <div className="relative flex-1 py-4">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/50 z-0" />
                        <Slider
                            value={[rotation]}
                            min={-45}
                            max={45}
                            step={1}
                            onValueChange={(vals) => {
                                let val = vals[0];
                                if (Math.abs(val) < 3) val = 0;
                                setRotation(val);
                            }}
                            className="relative z-10"
                        />
                    </div>
                    <span className="text-xs text-white/50 w-8">45°</span>
                </div>
                <div className="flex justify-between items-center mt-4 px-4">
                    <button
                        onClick={onCancel}
                        className="text-white/50 flex flex-col items-center gap-1 text-[10px] hover:text-white transition-colors"
                    >
                        <X size={20} /> 취소
                    </button>
                    <button
                        onClick={() => { setScale(1); setRotation(0); setPosition({ x: 0, y: 0 }); }}
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
