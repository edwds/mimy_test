import { useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowLeft, GripVertical, Loader2, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/context/OnboardingContext';
import { RankingService } from '@/services/RankingService';
import { formatFoodKind } from '@/lib/foodKindMap';

type FlattenedItem =
    | { type: 'header'; id: string; tier: number; title: string }
    | { type: 'item'; id: string; shopId: number; name: string; food_kind: string | null; thumbnail_img: string | null; tier: number };

export const OnboardingRanking = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { ratings } = useOnboarding();
    const [flatList, setFlatList] = useState<FlattenedItem[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (ratings.length === 0) {
            navigate('/onboarding/analysis', { replace: true });
            return;
        }

        const goodRatings = ratings.filter(r => r.satisfaction === 'good');
        const okRatings = ratings.filter(r => r.satisfaction === 'ok');
        const badRatings = ratings.filter(r => r.satisfaction === 'bad');

        const list: FlattenedItem[] = [];

        list.push({ type: 'header', id: 'header-2', tier: 2, title: t('write.basic.good', '맛있어') });
        goodRatings.forEach(r => list.push({
            type: 'item',
            id: `item-${r.shopId}`,
            shopId: r.shopId,
            name: r.shop.name,
            food_kind: r.shop.food_kind,
            thumbnail_img: r.shop.thumbnail_img,
            tier: 2,
        }));

        list.push({ type: 'header', id: 'header-1', tier: 1, title: t('write.basic.ok', '괜찮아') });
        okRatings.forEach(r => list.push({
            type: 'item',
            id: `item-${r.shopId}`,
            shopId: r.shopId,
            name: r.shop.name,
            food_kind: r.shop.food_kind,
            thumbnail_img: r.shop.thumbnail_img,
            tier: 1,
        }));

        list.push({ type: 'header', id: 'header-0', tier: 0, title: t('write.basic.bad', '별로') });
        badRatings.forEach(r => list.push({
            type: 'item',
            id: `item-${r.shopId}`,
            shopId: r.shopId,
            name: r.shop.name,
            food_kind: r.shop.food_kind,
            thumbnail_img: r.shop.thumbnail_img,
            tier: 0,
        }));

        setFlatList(list);
    }, [ratings, t]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Build batch create items
            const batchItems: { shop_id: number; satisfaction: 'good' | 'ok' | 'bad' }[] = [];
            const reorderPayload: { shop_id: number; rank: number; satisfaction_tier: number }[] = [];
            let rankCounter = 1;
            let currentTier = 2;

            flatList.forEach(item => {
                if (item.type === 'header') {
                    currentTier = item.tier;
                } else {
                    const satisfaction = currentTier === 2 ? 'good' : currentTier === 1 ? 'ok' : 'bad';
                    batchItems.push({ shop_id: item.shopId, satisfaction });
                    reorderPayload.push({
                        shop_id: item.shopId,
                        rank: rankCounter++,
                        satisfaction_tier: currentTier,
                    });
                }
            });

            // 1. Batch create
            if (batchItems.length > 0) {
                await RankingService.batchCreate(batchItems);
            }

            // 2. Reorder
            if (reorderPayload.length > 0) {
                await RankingService.reorder(reorderPayload);
            }

            navigate('/onboarding/analysis');
        } catch (error) {
            console.error('Failed to save ranking:', error);
            alert(t('common.error', '저장에 실패했어요'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-0 pb-safe-offset-6">
            {/* Header */}
            <div className="flex items-center px-4 py-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="flex-1 text-center text-lg font-bold pr-8">
                    {t('onboarding.ranking.title', { defaultValue: '순위 정리' })}
                </h1>
            </div>

            {/* Instructions */}
            <div className="px-6 pb-3">
                <p className="text-sm text-muted-foreground">
                    {t('onboarding.ranking.instruction', { defaultValue: '드래그해서 순서를 조정해보세요' })}
                </p>
            </div>

            {/* Ranking List */}
            <div className="flex-1 overflow-y-auto px-4">
                <Reorder.Group
                    axis="y"
                    values={flatList}
                    onReorder={setFlatList}
                    className="space-y-1"
                >
                    {flatList.map(item => (
                        item.type === 'header' ? (
                            <Reorder.Item
                                key={item.id}
                                value={item}
                                dragListener={false}
                                className="pt-4 pb-2 px-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${
                                        item.tier === 2 ? 'text-orange-500' :
                                        item.tier === 1 ? 'text-yellow-500' :
                                        'text-gray-400'
                                    }`}>
                                        {item.title}
                                    </span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>
                            </Reorder.Item>
                        ) : (
                            <RankingItemRow key={item.id} item={item} />
                        )
                    ))}
                </Reorder.Group>
            </div>

            {/* Save Button */}
            <div className="px-6 pt-3 pb-4">
                <Button
                    size="lg"
                    className="w-full text-lg py-6 rounded-full"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('common.saving', { defaultValue: '저장 중...' })}
                        </span>
                    ) : (
                        t('onboarding.ranking.save_button', { defaultValue: '저장하고 분석받기' })
                    )}
                </Button>
            </div>

            {/* Saving Overlay */}
            {saving && (
                <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm font-medium">{t('common.saving', { defaultValue: '저장 중...' })}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// Separate component for drag handle
const RankingItemRow = ({ item }: { item: FlattenedItem & { type: 'item' } }) => {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            dragControls={controls}
            dragListener={false}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border shadow-sm"
        >
            <button
                onPointerDown={(e) => controls.start(e)}
                className="touch-none p-1 cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="w-5 h-5 text-muted-foreground/40" />
            </button>

            {item.thumbnail_img ? (
                <img
                    src={item.thumbnail_img}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
            ) : (
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-muted-foreground" />
                </div>
            )}

            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                {item.food_kind && (
                    <p className="text-xs text-muted-foreground">{formatFoodKind(item.food_kind)}</p>
                )}
            </div>
        </Reorder.Item>
    );
};
