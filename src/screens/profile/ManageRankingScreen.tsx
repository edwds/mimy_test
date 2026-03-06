import { useEffect, useState, useMemo } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowLeft, Trash2, GripVertical, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RankingService, RankingItem, TIER_ORDER, TIER_NUM, TIER_LABEL, TIER_COLOR, TIER_FROM_NUM, RANKED_TIERS, type Satisfaction } from '@/services/RankingService';
import { Button } from '@/components/ui/button';
import React, { useRef } from 'react';
import { RelayRating } from '@/screens/relay/RelayScreen';
import { formatFoodKind } from '@/lib/foodKindMap';




export const ManageRankingScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [originalItems, setOriginalItems] = useState<RankingItem[]>([]); // Source of truth

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New ratings from RelayScreen (passed via router state)
    // useMemo to prevent new [] reference on every render (which would retrigger useEffect)
    const newRatings = useMemo(
        () => (location.state as { newRatings?: RelayRating[] } | null)?.newRatings || [],
        [location.state]
    );

    // We track delete targets by ID
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    // Reset all rankings
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);

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

    // FlattenedItem with optional isNew flag and newRating data for new items from relay
    type FlattenedItem =
        | { type: 'header', id: string, tier: number, tierName: Satisfaction, title: string }
        | { type: 'item', id: string, data: RankingItem, isNew?: false }
        | { type: 'item', id: string, data: null, isNew: true, newRating: RelayRating };

    const [flatList, setFlatList] = useState<FlattenedItem[]>([]);

    useEffect(() => {
        if (!loading) {
            const newFlatList: FlattenedItem[] = [];

            // Build 5-tier sections dynamically
            for (const tierName of TIER_ORDER) {
                const tierNum = TIER_NUM[tierName];
                const tierItems = originalItems.filter(i => i.satisfaction_tier === tierNum)
                    .sort((a, b) => a.rank - b.rank);
                const tierNewRatings = newRatings.filter(r => r.satisfaction === tierName);

                // Only show header if there are items or new ratings, or always for all tiers
                newFlatList.push({
                    type: 'header',
                    id: `header-${tierNum}`,
                    tier: tierNum,
                    tierName,
                    title: TIER_LABEL[tierName],
                });

                // Existing items
                tierItems.forEach(i => newFlatList.push({ type: 'item', id: String(i.id), data: i }));

                // New items at the bottom of this tier
                tierNewRatings.forEach(r => newFlatList.push({
                    type: 'item',
                    id: `new-${r.shopId}`,
                    data: null,
                    isNew: true,
                    newRating: r
                }));
            }

            setFlatList(newFlatList);
        }
    }, [originalItems, loading, newRatings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Separate new items from existing items
            const newItems: { shop_id: number; satisfaction: Satisfaction }[] = [];
            const reorderPayload: { shop_id: number; rank: number; satisfaction_tier: number }[] = [];
            let rankCounter = 1;
            let currentTier = TIER_NUM.goat; // Start with highest tier

            flatList.forEach(item => {
                if (item.type === 'header') {
                    currentTier = item.tier;
                } else if (item.isNew && item.newRating) {
                    // New item from relay - will be created first
                    // Use the tier from header position (user may have dragged to different tier)
                    const tierName = TIER_FROM_NUM[currentTier] ?? 'good';
                    newItems.push({
                        shop_id: item.newRating.shopId,
                        satisfaction: tierName
                    });
                    // Also add to reorder payload for final ordering
                    reorderPayload.push({
                        shop_id: item.newRating.shopId,
                        rank: rankCounter++,
                        satisfaction_tier: currentTier
                    });
                } else if (item.data) {
                    // Existing item
                    reorderPayload.push({
                        shop_id: item.data.shop_id,
                        rank: rankCounter++,
                        satisfaction_tier: currentTier
                    });
                }
            });

            // 1. First, create new items via batch (this creates them with default ordering)
            if (newItems.length > 0) {
                console.log('[ManageRanking] Creating new items:', newItems);
                await RankingService.batchCreate(newItems);
            }

            // 2. Then reorder everything (including newly created items)
            console.log('[ManageRanking] Reordering all items:', reorderPayload);
            await RankingService.reorder(reorderPayload);

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

        let targetShopId: number | undefined;

        // Find the item to get shop_id (only existing items have data)
        const targetItem = flatList.find(i =>
            i.type === 'item' && !i.isNew && i.data && i.data.id === deleteTargetId
        );
        if (targetItem && targetItem.type === 'item' && targetItem.data) {
            targetShopId = targetItem.data.shop_id;
        }

        if (!targetShopId) return;

        try {
            await RankingService.delete(targetShopId);
            // Remove from UI
            setFlatList(prev => prev.filter(i =>
                i.type !== 'item' || i.isNew || (i.data && i.data.id !== deleteTargetId)
            ));

            setDeleteTargetId(null);
        } catch (e) {
            console.error(e);
            alert("Failed to delete");
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

    const handleResetAll = async () => {
        setResetting(true);
        try {
            await RankingService.deleteAll();
            setShowResetConfirm(false);
            setOriginalItems([]);
            setFlatList([]);
        } catch (e) {
            console.error(e);
            alert("Failed to reset rankings");
        } finally {
            setResetting(false);
        }
    };

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

            {/* Reset button */}
            {originalItems.length > 0 && (
                <div className="px-4 pt-3">
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="text-sm text-red-500 hover:text-red-600 transition-colors"
                    >
                        {t('profile.manage.ranking.reset', '전체 랭킹 초기화')}
                    </button>
                </div>
            )}

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
                                    <div className={`text-lg font-bold border-b border-gray-100 pb-1 ${TIER_COLOR[item.tierName]}`}>
                                        {item.title}
                                        {RANKED_TIERS.includes(item.tierName) && (
                                            <span className="text-xs font-normal text-muted-foreground ml-2">
                                                {t('profile.manage.ranking.ranked_tier', '순위 비교')}
                                            </span>
                                        )}
                                    </div>
                                </Reorder.Item>
                            );
                        }

                        // Item (existing or new from relay)
                        return (
                            <DraggableRankingItem
                                key={item.id}
                                item={item}
                                isNew={item.isNew || false}
                                rankingItem={item.data}
                                newRating={item.isNew ? item.newRating : undefined}
                                onDelete={(id) => setDeleteTargetId(id)}
                                onRemoveNew={(shopId) => {
                                    // Remove new item from flatList (before save)
                                    setFlatList(prev => prev.filter(i =>
                                        i.type === 'header' || !('newRating' in i) || i.newRating?.shopId !== shopId
                                    ));
                                }}
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

            {/* Reset Confirmation */}
            {showResetConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl">
                        <h3 className="font-bold text-lg mb-2">{t('profile.manage.ranking.reset_title', '전체 랭킹을 초기화할까요?')}</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            {t('profile.manage.ranking.reset_desc', '모든 랭킹과 연결된 리뷰가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.')}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl h-11"
                                onClick={() => setShowResetConfirm(false)}
                                disabled={resetting}
                            >
                                {t('common.cancel', '취소')}
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white"
                                onClick={handleResetAll}
                                disabled={resetting}
                            >
                                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.manage.ranking.reset_confirm', '초기화')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Saving Overlay */}
            {saving && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-xl">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <div className="text-center">
                            <p className="font-bold text-lg">
                                {t('profile.manage.ranking.saving', '랭킹 저장 중...')}
                            </p>
                            {newRatings.length > 0 && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {t('profile.manage.ranking.saving_count', '{{count}}개의 새 항목 추가', { count: newRatings.length })}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-component for individual Draggable Items
interface DraggableRankingItemProps {
    item: any; // FlattenedItem wrapper required for Reorder to work properly if we pass value={item}
    isNew: boolean;
    rankingItem: RankingItem | null;
    newRating?: RelayRating;
    onDelete: (id: number) => void;
    onRemoveNew: (shopId: number) => void;
}

const DraggableRankingItem = ({ item, isNew, rankingItem, newRating, onDelete, onRemoveNew }: DraggableRankingItemProps) => {
    const dragControls = useDragControls();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial touch point to detect movement
    const startPoint = useRef<{ x: number, y: number } | null>(null);
    const isDragging = useRef(false);

    // Get shop info from either existing ranking or new rating
    const shopName = isNew ? newRating?.shop.name : rankingItem?.shop.name;
    const shopThumbnail = isNew ? newRating?.shop.thumbnail_img : rankingItem?.shop.thumbnail_img;
    const shopCategory = isNew ? formatFoodKind(newRating?.shop.food_kind) : rankingItem?.shop.category;

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
            value={item}
            dragListener={false}
            dragControls={dragControls}
            className={`bg-card rounded-xl border p-3 flex items-center gap-3 select-none touch-pan-y shadow-sm active:shadow-md ${isNew ? 'border-primary/30 bg-primary/5' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: 'pan-y' }}
        >
            {/* Grip Handle - Immediate Drag */}
            <div
                className="cursor-grab active:cursor-grabbing p-2 -m-2"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    dragControls.start(e);
                }}
            >
                <GripVertical className="w-5 h-5 text-gray-400" />
            </div>

            {/* Thumb */}
            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative">
                {shopThumbnail ? (
                    <img src={shopThumbnail} alt="" className="w-full h-full object-cover pointer-events-none" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">🏢</div>
                )}
                {isNew && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate flex items-center gap-1">
                    {shopName}
                    {isNew && <span className="text-xs text-primary font-normal">NEW</span>}
                </div>
                <div className="text-xs text-gray-500 truncate">
                    {shopCategory || ''}
                </div>
            </div>

            {/* Delete / Remove */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (isNew && newRating) {
                        onRemoveNew(newRating.shopId);
                    } else if (rankingItem) {
                        onDelete(rankingItem.id);
                    }
                }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </Reorder.Item>
    );
};
