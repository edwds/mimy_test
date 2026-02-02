import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Check, RotateCcw, Trash2, Crop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reorder, useDragControls } from 'framer-motion';
import { processImageToSquare, processImageWithCrop } from '@/lib/imageProcessor';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
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
    const [keyboardHeight, setKeyboardHeight] = useState(0);

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

    // Keyboard Height Tracking for iOS
    useEffect(() => {
        if (isOpen && Capacitor.isNativePlatform()) {
            let keyboardWillShowListener: any;
            let keyboardWillHideListener: any;

            const setupListeners = async () => {
                keyboardWillShowListener = await Keyboard.addListener('keyboardWillShow', (info) => {
                    console.log('[ImageEditModal] Keyboard will show:', info.keyboardHeight);
                    setKeyboardHeight(info.keyboardHeight);
                });

                keyboardWillHideListener = await Keyboard.addListener('keyboardWillHide', () => {
                    console.log('[ImageEditModal] Keyboard will hide');
                    setKeyboardHeight(0);
                });
            };

            setupListeners();

            return () => {
                keyboardWillShowListener?.remove();
                keyboardWillHideListener?.remove();
            };
        }
    }, [isOpen]);

    // Cleanup
    useEffect(() => {
        return () => {
            items.forEach(item => URL.revokeObjectURL(item.previewUrl));
        };
    }, []);

    const handleConfirm = () => {
        console.log('[ImageEditModal] handleConfirm called, items:', items.length);

        const finalFiles: File[] = items.map((item, index) => {
            if (item.blob) {
                console.log('[ImageEditModal] Converting blob to File for item', index, 'blob size:', item.blob.size);
                // iOS Fix: Normalize filename and explicitly set MIME type
                const normalizedName = `image_${Date.now()}_${index}.jpg`;
                const file = new File([item.blob], normalizedName, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                console.log('[ImageEditModal] Created File:', file.name, 'size:', file.size, 'type:', file.type);
                return file;
            }
            console.log('[ImageEditModal] Using original file for item', index);
            return item.file;
        });

        console.log('[ImageEditModal] Final files:', finalFiles.length);
        finalFiles.forEach((f, i) => {
            console.log(`  [${i}]: ${f.name}, ${f.size} bytes, ${f.type}`);
        });

        // Pass the original file of the first item to preserve EXIF data
        const originalFirstFile = items.length > 0 ? items[0].file : undefined;
        // Extract texts
        const imgTexts = items.map(i => i.imgText || "");

        console.log('[ImageEditModal] Calling onEditingComplete with', finalFiles.length, 'files');
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
                            <div
                                className="w-full flex flex-col items-center h-full justify-center pb-20"
                                style={{ paddingBottom: keyboardHeight ? `${keyboardHeight + 20}px` : '80px' }}
                            >
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
                                            containerRef={containerRef}
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
    isLast,
    containerRef
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
    isLast: boolean,
    containerRef?: React.RefObject<HTMLUListElement | null>
}) => {
    const controls = useDragControls();
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <Reorder.Item
            value={item}
            dragListener={false} // Disable auto drag to allow scroll
            dragControls={controls}
            className={`draggable-item relative flex-shrink-0 flex flex-col items-center gap-2`}
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
                ref={inputRef}
                type="text"
                maxLength={40}
                placeholder="메뉴 이름을 적어주세요"
                value={item.imgText || ''}
                onChange={(e) => onTextChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => {
                    // iOS: Scroll to this input when keyboard appears
                    if (Capacitor.isNativePlatform()) {
                        setTimeout(() => {
                            const itemElement = e.target.closest('.draggable-item') as HTMLElement;
                            if (itemElement && containerRef?.current) {
                                itemElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                            }
                        }, 300);
                    }
                }}
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
    const [isGesturing, setIsGesturing] = useState(false);
    const [originalUrl, setOriginalUrl] = useState<string>('');
    const [imgDims, setImgDims] = useState<{ w: number, h: number } | null>(null);

    // Zoom/Pan Refs (Gesture logic)
    const pinchStartDist = useRef<number | null>(null);
    const startScaleRef = useRef<number>(1);

    // State Tracking Refs (To avoid stale closures)
    const latestScale = useRef(scale);
    const latestPosition = useRef(position);

    // Sync refs with state
    useEffect(() => {
        latestScale.current = scale;
        latestPosition.current = position;
    }, [scale, position]);

    // Constants
    const CROP_SIZE = 300;
    const OUTPUT_SIZE = 1080;
    const MIN_SCALE = 1;
    const MAX_SCALE = 5; // Allow more zoom for rotation compensation

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



    // --- Touch Handlers (Mobile Pinch & Pan) ---
    const lastTouchPos = useRef<{ x: number, y: number } | null>(null);
    const pinchStartCenter = useRef<{ x: number, y: number } | null>(null);
    const startPanRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

    const getTouchDist = (t1: React.Touch, t2: React.Touch) => {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (t1: React.Touch, t2: React.Touch) => {
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
        };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsGesturing(true);
        if (e.touches.length === 2) {
            // Pinch Start
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            pinchStartDist.current = getTouchDist(t1, t2);
            pinchStartCenter.current = getTouchCenter(t1, t2);

            // Use latest ref values instead of closure state
            startScaleRef.current = latestScale.current;
            startPanRef.current = latestPosition.current;
        } else if (e.touches.length === 1) {
            // Pan Start
            lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDist.current !== null && pinchStartCenter.current !== null) {
            // 2-Finger Pinch w/ Pan Pivot
            const t1 = e.touches[0];
            const t2 = e.touches[1];

            // 1. Scale
            const currentDist = getTouchDist(t1, t2);
            const ratio = currentDist / pinchStartDist.current;
            const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, startScaleRef.current * ratio));

            // 2. Pivot Pan
            // Simplified logic compared to Viewer since we just update x/y directly
            // Goal: Keep startCenter relative to image constant

            // This is complex because 'position' acts as offset.
            // Let's rely on simple scaling for now, but adding Pivot Pan is better.
            // However, ImageEditModal uses simple transform. 
            // Pivot logic:
            // Delta Center = CurrentCenter - StartCenter
            // Effective Pan = StartPan + DeltaCenter - (StartCenter relative to Image * (ScaleRatio - 1))?

            // Let's implement the simpler center-based logic similar to Viewer if possible, 
            // but for now, the user complained it's "strange". Usually missing Pivot is the cause.

            // NOTE: Re-using the logic from ImageViewer might require container ref for exact coords.
            // Let's assume user accepts standard pinch zoom if Pan works well.
            // But to fix "strange", I'll add the visual center follow.

            const currentCenter = getTouchCenter(t1, t2);
            // Delta movement of the center point
            const dx = currentCenter.x - pinchStartCenter.current.x;
            const dy = currentCenter.y - pinchStartCenter.current.y;

            // Apply scale
            setScale(newScale);

            // Apply Pan (Move with the pinch center) + Start Position
            // (Note: True pivot zoom requires compensating for scale expansion away from center. 
            //  Without that physics, it feels "slippery". But adding just Pan-follow is a huge improvement over static.)

            const { maxX, maxY } = getBoundaries(newScale);
            setPosition(() => ({
                x: Math.max(-maxX, Math.min(maxX, startPanRef.current.x + dx)),
                y: Math.max(-maxY, Math.min(maxY, startPanRef.current.y + dy))
            }));

        } else if (e.touches.length === 1 && lastTouchPos.current) {
            // 1-Finger Pan
            const dx = e.touches[0].clientX - lastTouchPos.current.x;
            const dy = e.touches[0].clientY - lastTouchPos.current.y;

            const currentScale = latestScale.current;
            const { maxX, maxY } = getBoundaries(currentScale);

            const nextPos = {
                x: Math.max(-maxX, Math.min(maxX, latestPosition.current.x + dx)),
                y: Math.max(-maxY, Math.min(maxY, latestPosition.current.y + dy))
            };

            setPosition(nextPos);
            latestPosition.current = nextPos; // Sync immediately

            lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length < 2) {
            pinchStartDist.current = null;
            pinchStartCenter.current = null;
        }
        if (e.touches.length === 0) {
            lastTouchPos.current = null;
            setIsGesturing(false);
        }
    };

    // --- Mouse Handlers (PC Pan) ---
    const isDraggingRef = useRef(false);
    const lastMousePos = useRef<{ x: number, y: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDraggingRef.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        setIsGesturing(true);
        e.preventDefault();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDraggingRef.current && lastMousePos.current) {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;

            const currentScale = latestScale.current;
            const { maxX, maxY } = getBoundaries(currentScale);

            const nextPos = {
                x: Math.max(-maxX, Math.min(maxX, latestPosition.current.x + dx)),
                y: Math.max(-maxY, Math.min(maxY, latestPosition.current.y + dy))
            };

            setPosition(nextPos);
            latestPosition.current = nextPos; // Sync immediately

            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        lastMousePos.current = null;
        setIsGesturing(false);
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
            transition: isGesturing ? 'none' : 'width 0.1s, height 0.1s, transform 0.1s'
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
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
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
