
import { useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowLeft, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RankingService, RankingItem } from '@/services/RankingService';
import { Button } from '@/components/ui/button';
import React, { useRef } from 'react';




export const ManageRankingScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [originalItems, setOriginalItems] = useState<RankingItem[]>([]); // Source of truth

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // We track delete targets by ID
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const currentUser = { id: Number(localStorage.getItem("mimy_user_id") || 0) };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await RankingService.getAll(currentUser.id);
            setOriginalItems(data);
        } catch (e) {
            console.error(e);
            alert("Failed to load rankings");
        } finally {
            setLoading(false);
        }
    };

    // Since Framer Motion Reorder.Group doesn't support dragging between different Groups easily without complex setup,
    // and we want to change satisfaction level on drop.
    // A simpler approach for this "Tiered" UI is:
    // Render ONE SINGLE Reorder.Group list, but with visual separating Headers that are non-draggable.
    // When reorder happens, we check where items landed relative to headers.

    // Let's build a flattened list for Reorder.Group
    // Items: [ {type:'header', tier:2}, ...goodItems, {type:'header', tier:1}, ...okItems, ... ]

    // We separate items into 3 tiers to prevent dragging between them.
    // Tier 2 (Good), Tier 1 (Ok), Tier 0 (Bad)
    const [tier2Items, setTier2Items] = useState<RankingItem[]>([]);
    const [tier1Items, setTier1Items] = useState<RankingItem[]>([]);
    const [tier0Items, setTier0Items] = useState<RankingItem[]>([]);

    useEffect(() => {
        if (!loading) {
            setTier2Items(originalItems.filter(i => i.satisfaction_tier === 2));
            setTier1Items(originalItems.filter(i => i.satisfaction_tier === 1));
            setTier0Items(originalItems.filter(i => i.satisfaction_tier === 0));
        }
    }, [originalItems, loading]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any[] = [];
            let rankCounter = 1;

            // Concatenate all tiers in order: Tier 2 -> Tier 1 -> Tier 0
            // Since they can't change tiers, we just use the current tier value.

            [...tier2Items, ...tier1Items, ...tier0Items].forEach(item => {
                payload.push({
                    shop_id: item.shop_id,
                    rank: rankCounter++,
                    satisfaction_tier: item.satisfaction_tier // Keep original tier or enforce the list it's currently in? 
                    // Since we split by tier, item.satisfaction_tier *should* match the list it is in. 
                    // Actually, if we somehow started empty, users can't add items here anyway.
                });
            });

            await RankingService.reorder(currentUser.id, payload);
            alert(t('common.saved', 'Saved'));
        } catch (e) {
            console.error(e);
            alert("Failed to save order");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteTargetId === null) return;

        // Find the item to get shop_id
        let targetShopId: number | null = null;
        let foundInTier = -1;

        // Search in all tiers
        if (tier2Items.some(i => i.id === deleteTargetId)) {
            targetShopId = tier2Items.find(i => i.id === deleteTargetId)!.shop_id;
            foundInTier = 2;
        } else if (tier1Items.some(i => i.id === deleteTargetId)) {
            targetShopId = tier1Items.find(i => i.id === deleteTargetId)!.shop_id;
            foundInTier = 1;
        } else if (tier0Items.some(i => i.id === deleteTargetId)) {
            targetShopId = tier0Items.find(i => i.id === deleteTargetId)!.shop_id;
            foundInTier = 0;
        }

        if (!targetShopId) return;

        try {
            await RankingService.delete(targetShopId, currentUser.id);
            // Remove from UI
            if (foundInTier === 2) setTier2Items(prev => prev.filter(i => i.id !== deleteTargetId));
            if (foundInTier === 1) setTier1Items(prev => prev.filter(i => i.id !== deleteTargetId));
            if (foundInTier === 0) setTier0Items(prev => prev.filter(i => i.id !== deleteTargetId));

            setDeleteTargetId(null);
        } catch (e) {
            console.error(e);
            alert("Failed to delete");
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

    // We need to enable `dragListener={false}` on headers.

    return (
        <div className="flex flex-col h-full bg-background" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0px)' }}>
            {/* Header */}
            <div className="relative flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur z-10">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-bold">{t('profile.manage_ranking', 'Manage Ranking')}</h1>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary font-bold"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? '...' : t('common.save', 'Save')}
                </Button>
            </div>

            {/* Warning */}
            <div className="bg-orange-50 p-4 text-xs text-orange-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                    {t('profile.manage_ranking_warning', 'Deleting a ranking will also delete the associated review.')}
                </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Tier 2: Delicious */}
                {tier2Items.length > 0 && (
                    <div>
                        <div className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                            {t('write.basic.good', 'Delicious')}
                        </div>
                        <Reorder.Group axis="y" values={tier2Items} onReorder={setTier2Items} className="space-y-2">
                            {tier2Items.map(item => (
                                <DraggableRankingItem
                                    key={item.id}
                                    rankingItem={item}
                                    onDelete={(id) => setDeleteTargetId(id)}
                                />
                            ))}
                        </Reorder.Group>
                    </div>
                )}

                {/* Tier 1: Okay */}
                {tier1Items.length > 0 && (
                    <div>
                        <div className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                            {t('write.basic.ok', 'Okay')}
                        </div>
                        <Reorder.Group axis="y" values={tier1Items} onReorder={setTier1Items} className="space-y-2">
                            {tier1Items.map(item => (
                                <DraggableRankingItem
                                    key={item.id}
                                    rankingItem={item}
                                    onDelete={(id) => setDeleteTargetId(id)}
                                />
                            ))}
                        </Reorder.Group>
                    </div>
                )}

                {/* Tier 0: Bad */}
                {tier0Items.length > 0 && (
                    <div>
                        <div className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                            {t('write.basic.bad', 'Bad')}
                        </div>
                        <Reorder.Group axis="y" values={tier0Items} onReorder={setTier0Items} className="space-y-2">
                            {tier0Items.map(item => (
                                <DraggableRankingItem
                                    key={item.id}
                                    rankingItem={item}
                                    onDelete={(id) => setDeleteTargetId(id)}
                                />
                            ))}
                        </Reorder.Group>
                    </div>
                )}

            </div>

            {/* Delete Confirmation */}
            {deleteTargetId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl scale-100">
                        <h3 className="font-bold text-lg mb-2">{t('common.confirm_delete', 'Delete Ranking?')}</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            {t('profile.confirm_delete_ranking_desc', 'This action cannot be undone. The associated review will also be deleted.')}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl h-11"
                                onClick={() => setDeleteTargetId(null)}
                            >
                                {t('common.cancel', 'Cancel')}
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white"
                                onClick={handleDelete}
                            >
                                {t('common.delete', 'Delete')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-component for individual Draggable Items
// Sub-component for individual Draggable Items
interface DraggableRankingItemProps {
    rankingItem: RankingItem; // Changed prop signature
    onDelete: (id: number) => void;
}

const DraggableRankingItem = ({ rankingItem, onDelete }: DraggableRankingItemProps) => {
    const dragControls = useDragControls();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial touch point to detect movement
    const startPoint = useRef<{ x: number, y: number } | null>(null);
    const isDragging = useRef(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only trigger on primary button (left click or touch)
        if (e.button !== 0) return;

        // Store start point
        startPoint.current = { x: e.clientX, y: e.clientY };
        isDragging.current = false;

        // Start Long Press Timer
        timeoutRef.current = setTimeout(() => {
            if (!isDragging.current) {
                // Haptic feedback if available
                if (navigator.vibrate) navigator.vibrate(50);

                // Allow drag start
                dragControls.start(e as unknown as React.PointerEvent<Element>);
            }
        }, 500); // 500ms Long Press
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!startPoint.current) return;

        // Calculate distance moved
        const deltaX = Math.abs(e.clientX - startPoint.current.x);
        const deltaY = Math.abs(e.clientY - startPoint.current.y);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If moved more than 10px, cancel long press (it's a scroll or random move)
        if (distance > 10) {
            isDragging.current = true;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        }
    };

    const handlePointerUp = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        startPoint.current = null;
    };

    return (
        <Reorder.Item
            value={rankingItem} // Changed value to be the item itself
            dragListener={false}
            dragControls={dragControls}
            className="bg-card rounded-xl border p-3 flex items-center gap-3 select-none touch-pan-y shadow-sm active:shadow-md"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: 'pan-y' }} // Explicitly allow vertical scrolling
        >
            {/* Grip Handle - Immediate Drag */}
            <div
                className="cursor-grab active:cursor-grabbing p-1 -m-1"
                style={{ touchAction: 'none' }} // Critical: Prevent scroll on handle
                onPointerDown={(e) => {
                    // Start drag immediately
                    dragControls.start(e);
                    // Cancel the parent long press timer just in case
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }}
            >
                <GripVertical className="w-5 h-5 text-gray-400" />
            </div>

            {/* Thumb */}
            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                {rankingItem.shop.thumbnail_img ? (
                    <img src={rankingItem.shop.thumbnail_img} alt="" className="w-full h-full object-cover pointer-events-none" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">🏢</div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{rankingItem.shop.name}</div>
                <div className="text-xs text-gray-500 truncate">
                    {rankingItem.shop.category}
                </div>
            </div>

            {/* Delete */}
            <button
                onClick={(e) => {
                    e.stopPropagation(); // prevent drag selection if it bubbled
                    onDelete(rankingItem.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on delete button
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </Reorder.Item>
    );
};
