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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await RankingService.getAll();
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

    // We separate items into tiers visually but need a single Reorder.Group to allow dragging between them.
    // Logic: Flatten the list into [Header2, ...items2, Header1, ...items1, Header0, ...items0]
    // User can drag items anywhere.
    // On Save, we infer the tier based on which header the item is UNDER.

    type FlattenedItem =
        | { type: 'header', id: string, tier: number, title: string }
        | { type: 'item', id: string, data: RankingItem };

    const [flatList, setFlatList] = useState<FlattenedItem[]>([]);

    useEffect(() => {
        if (!loading) {
            const newFlatList: FlattenedItem[] = [];

            // Tier 2 (Delicious)
            newFlatList.push({ type: 'header', id: 'header-2', tier: 2, title: t('write.basic.good', 'Delicious') });
            originalItems.filter(i => i.satisfaction_tier === 2)
                .sort((a, b) => a.rank - b.rank)
                .forEach(i => newFlatList.push({ type: 'item', id: String(i.id), data: i }));

            // Tier 1 (Okay)
            newFlatList.push({ type: 'header', id: 'header-1', tier: 1, title: t('write.basic.ok', 'Okay') });
            originalItems.filter(i => i.satisfaction_tier === 1)
                .sort((a, b) => a.rank - b.rank)
                .forEach(i => newFlatList.push({ type: 'item', id: String(i.id), data: i }));

            // Tier 0 (Bad)
            newFlatList.push({ type: 'header', id: 'header-0', tier: 0, title: t('write.basic.bad', 'Bad') });
            originalItems.filter(i => i.satisfaction_tier === 0)
                .sort((a, b) => a.rank - b.rank)
                .forEach(i => newFlatList.push({ type: 'item', id: String(i.id), data: i }));

            setFlatList(newFlatList);
        }
    }, [originalItems, loading, t]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any[] = [];
            let rankCounter = 1;

            // Concatenate all tiers in order: Tier 2 -> Tier 1 -> Tier 0
            // Since they can't change tiers, we just use the current tier value.

            let currentTier = 2; // Default to top tier if above first header

            flatList.forEach(item => {
                if (item.type === 'header') {
                    currentTier = item.tier;
                } else {
                    payload.push({
                        shop_id: item.data.shop_id,
                        rank: rankCounter++,
                        satisfaction_tier: currentTier
                    });
                }
            });

            await RankingService.reorder(payload);
            alert(t('common.saved', 'Saved'));
            navigate(-1); // Back on success
        } catch (e) {
            console.error(e);
            alert("Failed to save order");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteTargetId === null) return;

        let targetShopId: number | undefined; // Define targetShopId here

        // Find the item to get shop_id
        const targetItem = flatList.find(i => i.type === 'item' && i.data.id === deleteTargetId);
        if (targetItem && targetItem.type === 'item') {
            targetShopId = targetItem.data.shop_id;
        }

        if (!targetShopId) return;

        try {
            await RankingService.delete(targetShopId);
            // Remove from UI
            setFlatList(prev => prev.filter(i => i.type !== 'item' || i.data.id !== deleteTargetId));

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
                <h1 className="text-lg font-bold">{t('profile.menu.manage_ranking', 'Manage Ranking')}</h1>
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
                    {t('profile.manage.ranking.warning', 'Deleting a ranking will also delete the associated review.')}
                </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                <Reorder.Group axis="y" values={flatList} onReorder={setFlatList} className="space-y-2">
                    {flatList.map(item => {
                        if (item.type === 'header') {
                            return (
                                <Reorder.Item
                                    key={item.id}
                                    value={item}
                                    dragListener={false}
                                    className="pt-4 pb-2"
                                >
                                    <div className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1">
                                        {item.title}
                                    </div>
                                </Reorder.Item>
                            );
                        }

                        // Item
                        return (
                            <DraggableRankingItem
                                key={item.id}
                                item={item} // Pass the wrapper too
                                rankingItem={item.data}
                                onDelete={(id) => setDeleteTargetId(id)}
                            />
                        );
                    })}
                </Reorder.Group>

            </div>

            {/* Delete Confirmation */}
            {deleteTargetId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl scale-100">
                        <h3 className="font-bold text-lg mb-2">{t('profile.manage.ranking.confirm_delete', 'Delete Ranking?')}</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            {t('profile.manage.ranking.confirm_delete_desc', 'This action cannot be undone. The associated review will also be deleted.')}
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
    item: any; // FlattenedItem wrapper required for Reorder to work properly if we pass value={item}
    rankingItem: RankingItem;
    onDelete: (id: number) => void;
}

const DraggableRankingItem = ({ item, rankingItem, onDelete }: DraggableRankingItemProps) => {
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
            value={item} // Changed back to item so Reorder tracks the FlattenedItem

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
