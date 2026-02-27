import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Search, Loader2, Store } from 'lucide-react';
import { useOnboarding, type OnboardingShop } from '@/context/OnboardingContext';
import { OnboardingService, type ShopMatch } from '@/services/OnboardingService';
import { authFetch } from '@/lib/authFetch';
import { API_BASE_URL } from '@/lib/api';
import { formatFoodKind } from '@/lib/foodKindMap';

export const ShopMatchConfirm = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { extractedNames, setConfirmedShops } = useOnboarding();

    const [matches, setMatches] = useState<ShopMatch[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchingFor, setSearchingFor] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (extractedNames.length === 0) {
            navigate('/onboarding/import-intro', { replace: true });
            return;
        }
        matchShops();
    }, []);

    const matchShops = async () => {
        try {
            const result = await OnboardingService.matchShops(extractedNames);

            // Deduplicate by shop ID — keep the first occurrence only
            const seenShopIds = new Set<number>();
            const dedupedMatches: ShopMatch[] = [];
            for (const m of result.matches) {
                if (m.matched && m.shop) {
                    if (seenShopIds.has(m.shop.id)) continue;
                    seenShopIds.add(m.shop.id);
                }
                dedupedMatches.push(m);
            }

            setMatches(dedupedMatches);

            // Auto-select all matched shops
            const matchedIndices = new Set<number>();
            dedupedMatches.forEach((m, i) => {
                if (m.matched) matchedIndices.add(i);
            });
            setSelected(matchedIndices);
        } catch (error) {
            console.error('Shop matching failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (index: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const params = new URLSearchParams({ q: searchQuery });
            const response = await authFetch(`${API_BASE_URL}/api/shops/search?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleManualMatch = (matchIndex: number, shop: any) => {
        setMatches(prev => prev.map((m, i) =>
            i === matchIndex ? {
                ...m,
                matched: true,
                shop: {
                    id: shop.id,
                    name: shop.name,
                    food_kind: shop.food_kind,
                    thumbnail_img: shop.thumbnail_img,
                    address_full: shop.address_full,
                }
            } : m
        ));
        setSelected(prev => new Set(prev).add(matchIndex));
        setSearchingFor(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleConfirm = () => {
        const shops: OnboardingShop[] = [];
        selected.forEach(index => {
            const match = matches[index];
            if (match?.shop) {
                shops.push({
                    shopId: match.shop.id,
                    name: match.shop.name,
                    food_kind: match.shop.food_kind,
                    thumbnail_img: match.shop.thumbnail_img,
                    address_full: match.shop.address_full,
                });
            }
        });
        setConfirmedShops(shops);
        navigate('/onboarding/relay');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                    {t('onboarding.shop_match.loading', { defaultValue: '맛집을 찾고 있어요...' })}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-0 pb-safe-offset-6">
            {/* Header */}
            <div className="flex items-center px-4 py-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="flex-1 text-center text-lg font-bold pr-8">
                    {t('onboarding.shop_match.title', { defaultValue: '매칭 결과 확인' })}
                </h1>
            </div>

            {/* Summary */}
            <div className="px-6 pb-3">
                <p className="text-sm text-muted-foreground">
                    {t('onboarding.shop_match.summary', {
                        defaultValue: `${matches.filter(m => m.matched).length}개 맛집을 찾았어요`,
                        found: matches.filter(m => m.matched).length,
                        total: matches.length,
                    })}
                </p>
            </div>

            {/* Match List */}
            <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-2">
                    {matches.map((match, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                selected.has(index) ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                        >
                            {/* Checkbox */}
                            {match.matched && (
                                <button
                                    onClick={() => toggleSelect(index)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        selected.has(index)
                                            ? 'bg-primary border-primary'
                                            : 'border-muted-foreground/30'
                                    }`}
                                >
                                    {selected.has(index) && <Check className="w-3.5 h-3.5 text-white" />}
                                </button>
                            )}

                            {/* Shop Info */}
                            {match.matched && match.shop ? (
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {match.shop.thumbnail_img ? (
                                        <img
                                            src={match.shop.thumbnail_img}
                                            alt={match.shop.name}
                                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                            <Store className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{match.shop.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {formatFoodKind(match.shop.food_kind)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                                        <Store className="w-5 h-5 text-muted-foreground/40" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-muted-foreground truncate">{match.extractedName}</p>
                                        <p className="text-xs text-muted-foreground/50">
                                            {t('onboarding.shop_match.not_found', { defaultValue: '매칭 안 됨' })}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0"
                                        onClick={() => {
                                            setSearchingFor(match.extractedName);
                                            setSearchQuery(match.extractedName);
                                            setSearchResults([]);
                                        }}
                                    >
                                        <Search className="w-3.5 h-3.5 mr-1" />
                                        {t('onboarding.shop_match.search', { defaultValue: '검색' })}
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Search Modal */}
            {searchingFor !== null && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        className="w-full bg-background rounded-t-2xl max-h-[70vh] flex flex-col"
                    >
                        <div className="p-4 border-b">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    placeholder={t('onboarding.shop_match.search_placeholder', { defaultValue: '맛집 이름 검색' })}
                                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                    autoFocus
                                />
                                <Button size="sm" onClick={handleSearch} disabled={searching}>
                                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => {
                                    setSearchingFor(null);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}>
                                    {t('common.cancel', { defaultValue: '취소' })}
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {searchResults.map((shop: any) => (
                                <button
                                    key={shop.id}
                                    onClick={() => {
                                        const matchIndex = matches.findIndex(m => m.extractedName === searchingFor);
                                        if (matchIndex >= 0) handleManualMatch(matchIndex, shop);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                                >
                                    {shop.thumbnail_img ? (
                                        <img src={shop.thumbnail_img} alt={shop.name} className="w-10 h-10 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                            <Store className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{shop.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{shop.address_full}</p>
                                    </div>
                                </button>
                            ))}
                            {searchResults.length === 0 && !searching && searchQuery && (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    {t('onboarding.shop_match.no_search_results', { defaultValue: '검색 결과가 없어요' })}
                                </p>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Bottom Button */}
            <div className="px-6 pt-3 pb-4">
                <Button
                    size="lg"
                    className="w-full text-lg py-6 rounded-full"
                    disabled={selected.size === 0}
                    onClick={handleConfirm}
                >
                    {t('onboarding.shop_match.confirm_button', {
                        defaultValue: `${selected.size}개 맛집 평가하기`,
                        count: selected.size,
                    })}
                </Button>
            </div>
        </div>
    );
};
