
import { useEffect, useState } from 'react';
import { Reorder } from 'framer-motion';
import { ArrowLeft, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RankingService, RankingItem } from '@/services/RankingService';
import { Button } from '@/components/ui/button';

export const ManageRankingScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [items, setItems] = useState<RankingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Deletion State
    const [deleteTarget, setDeleteTarget] = useState<RankingItem | null>(null);

    const currentUser = { id: Number(localStorage.getItem("mimy_user_id") || 0) }; // Mock auth hook usage

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await RankingService.getAll(currentUser.id);
            setItems(data);
            setIsDirty(false);
        } catch (e) {
            console.error(e);
            alert("Failed to load rankings");
        } finally {
            setLoading(false);
        }
    };

    // Handle Reorder
    const handleReorder = (newOrder: RankingItem[]) => {
        // Update ranks based on new index
        // Since we have tiers, reordering across tiers is tricky if we just use a flat list.
        // For simplicity, we'll assume the list is flat and we just update rank 1..N
        // BUT, our backend expects satisfaction_tier too.
        // If we drag a "Bad" item to "Good" section, should it update tier? 
        // User request: "순서 변경 및 삭제". Usually means global rank order. 
        // Let's implement global rank update regardless of tier? 
        // Actually, our ranking logic depends on tiers. 
        // Let's just update the 'rank' property sequentially 1..N and keep tier as is? No, index determines rank.
        // Or should we update tier based on position? 
        // Simplest MVP: Just reorder within same list. We will send back the new order.
        // Ideally we should group by tier, but a single Reorder.Group is requested for "Full List".

        setItems(newOrder);
        setIsDirty(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Recalculate ranks based on current index
            // Note: In our DB, lower rank = better.
            // Items at top = Rank 1.
            const payload = items.map((item, index) => ({
                shop_id: item.shop_id,
                rank: index + 1,
                satisfaction_tier: item.satisfaction_tier // Keep tier as is? Or should we infer? Let's keep as is for now as drag doesn't change tier implicitly.
            }));

            await RankingService.reorder(currentUser.id, payload);
            setIsDirty(false);
            // navigate(-1); // Go back or stay?
            alert(t('common.saved', 'Saved'));
        } catch (e) {
            console.error(e);
            alert("Failed to save order");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await RankingService.delete(deleteTarget.shop_id, currentUser.id);
            setItems(items.filter(i => i.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (e) {
            console.error(e);
            alert("Failed to delete");
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

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
                    disabled={!isDirty || saving}
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
            <div className="flex-1 overflow-y-auto p-4">
                <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-2">
                    {items.map((item) => (
                        <Reorder.Item key={item.id} value={item} className="bg-card rounded-xl border p-3 flex items-center gap-3 select-none touch-none">
                            <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />

                            {/* Rank Badge */}
                            <div className="w-8 flex-shrink-0 text-center font-bold text-gray-900 leading-none">
                                {items.indexOf(item) + 1}
                            </div>

                            {/* Thumb */}
                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                {item.shop.thumbnail_img ? (
                                    <img src={item.shop.thumbnail_img} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs">🏢</div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm truncate">{item.shop.name}</div>
                                <div className="text-xs text-gray-500 truncate">
                                    {getTierLabel(item.satisfaction_tier)} • {item.shop.category}
                                </div>
                            </div>

                            {/* Delete */}
                            <button
                                onClick={() => setDeleteTarget(item)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            </div>

            {/* Simple Delete Confirmation */}
            {deleteTarget && (
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
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white"
                                onClick={handleDelete}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function getTierLabel(tier: number) {
    switch (tier) {
        case 2: return "😋 Good";
        case 1: return "🙂 Ok";
        case 0: return "🙁 Bad";
        default: return "";
    }
}
