import { useEffect, useState, useRef, useCallback } from 'react';
import { MainHeader } from '@/components/MainHeader';
import { FilterChip } from '@/components/FilterChip';
import { useSmartScroll } from '@/hooks/useSmartScroll';
import { API_BASE_URL } from '@/lib/api';
import { ContentCard } from '@/components/ContentCard';
import { VsCard } from '@/components/VsCard';
import { HateCard } from '@/components/HateCard';
import { User as UserIcon, Bell, PenLine } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { useUser } from '@/context/UserContext'; // This line was moved from above useTranslation
import { authFetch } from '@/lib/authFetch';

// Force deploy check
interface Props {
    onWrite: () => void;
    refreshTrigger?: number;
    isEnabled?: boolean;
}

const CHIPS = ["popular", "follow", "near", "like"];

export const HomeTab: React.FC<Props> = ({ onWrite, refreshTrigger, isEnabled = true }) => {
    const { t } = useTranslation();
    const [_, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [interstitialItems, setInterstitialItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [hasInitialFetch, setHasInitialFetch] = useState(false);
    const { user: currentUser, loading: isUserLoading } = useUser();
    const [activeChip, setActiveChip] = useState("popular");
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Smart Header & Scroll Preservation
    const containerRef = useRef<HTMLDivElement>(null);
    const { isVisible: isHeaderVisible, handleScroll: onSmartScroll } = useSmartScroll(containerRef);
    const scrollPositions = useRef<{ [key: string]: number }>({});
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    // Measure Header Height for padding
    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    // Scroll Handler
    const handleScroll = () => {
        onSmartScroll();
    };

    const handleChipChange = (newChip: string) => {
        if (newChip === activeChip) return;

        if (newChip === 'near') {
            handleNearFilter();
            return;
        }

        performChipSwitch(newChip);
    };

    const handleNearFilter = () => {
        if (!navigator.geolocation) {
            alert(t('discovery.alerts.no_gps'));
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Update location state - confusingly named userLocation in original code was unused state?
                // Let's actually use a ref or state for this specific fetch context, 
                // but checking original code line 31: const [userLocation] = useState<{ lat: number, lon: number } | null>(null);
                // It was constant null. We need to update it.
                // Since I cannot change the `const [userLocation]` line easily without a large block replacement,
                // and `userLocation` is used in `fetchFeed`, I should probably fix that definition first or pass coords directly.

                // WAIT, I need to see if I can easily update the userLocation state definition.
                // Line 31: const [userLocation] = useState... -> const [userLocation, setUserLocation] = useState...
                // I will do that in a separate chunk.
                setUserLocation({ lat: latitude, lon: longitude });
                setLoading(false); // Reset loading so useEffect can trigger fetch
                performChipSwitch('near');
            },
            (error) => {
                console.error(error);
                setLoading(false);
                alert(t('discovery.alerts.location_error'));
            }
        );
    };

    const performChipSwitch = (newChip: string) => {
        if (containerRef.current) {
            scrollPositions.current[activeChip] = containerRef.current.scrollTop;
        }

        setActiveChip(newChip);

        // Reset list for new filter
        setItems([]);
        setPage(1);
        setHasMore(true);
        setHasInitialFetch(false);

        // Fetch will be triggered by useEffect OR we call it explicitly? 
        // Existing code didn't use chip in useEffect dependency for fetchFeed, 
        // it only called fetchFeed in initial mount or scroll.
        // We need to trigger fetch when chip changes.

        // Let's rely on an effect to catch chip change? 
        // Or just call fetchFeed(1, newChip) directly?
        // To be safe with state, let's use an effect on [activeChip].

        if (containerRef.current) {
            const savedPos = scrollPositions.current[newChip] || 0;
            containerRef.current.scrollTo({ top: savedPos, behavior: 'instant' });
        }
    };


    const fetchFeed = async (pageNum: number) => {
        // If loading next page, block. If reloading (page 1), cancel prev and proceed.
        if (loading && pageNum > 1) return;

        let currentSignal: AbortSignal | undefined;

        if (pageNum === 1) {
            if (loading) {
                // Cancel previous request if we are restarting
                abortControllerRef.current?.abort();
            }
            const ac = new AbortController();
            abortControllerRef.current = ac;
            currentSignal = ac.signal;
        }

        setLoading(true);
        try {
            const userIdParam = currentUser?.id ? `&user_id=${currentUser.id}` : '';

            // Add Filter Params
            let filterParams = `&filter=${activeChip}`;
            if (activeChip === 'near') {
                if (!userLocation) {
                    setLoading(false);
                    return;
                }
                filterParams += `&lat=${userLocation.lat}&lon=${userLocation.lon}`;
            }

            const res = await authFetch(`${API_BASE_URL}/api/content/feed?page=${pageNum}&limit=20${userIdParam}${filterParams}`);

            if (res.ok) {
                const data = await res.json();
                if (data.length < 20) {
                    setHasMore(false);
                }
                setItems(prev => pageNum === 1 ? data : [...prev, ...data]);
                setHasInitialFetch(true);
            }
        } catch (e: any) {
            if (e.name === 'AbortError') return;
            console.error(e);
            setLoading(false);
        } finally {
            if (pageNum === 1) {
                // Only unset loading if this specific request wasn't aborted
                if (!currentSignal?.aborted) {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (!isEnabled) return;

        // If we have items and the chip hasn't changed (implied by dependency array logic in a real app, but here simple), 
        // we might skip. But if activeChip changed, we cleared items in performChipSwitch, so items.length is 0.
        // So this single check covers both Initial Mount (items=0) and Chip Switch (items=0).

        // Strict Login Check: Only fetch if we have a valid User ID loaded
        if (!isUserLoading && currentUser?.id) {
            if (items.length === 0 && !loading && hasInitialFetch === false) {
                fetchFeed(1);
            }
        }
    }, [currentUser?.id, isUserLoading, isEnabled, activeChip, items.length, hasInitialFetch, userLocation]);


    // Double-tap refresh listener
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            setPage(1);
            setHasMore(true);
            setItems([]); // Optional: clear items or keep them until new load? keeping might be better UX, but let's clear for clear feedback or standard refresh behavior
            // Actually, for "refresh", usually we keep items and replace.
            // But to simplify pagination reset, let's just fetch page 1.
            fetchFeed(1);

            // Scroll to top
            if (containerRef.current) {
                containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [refreshTrigger]);

    // Fetch Interstitial candidates (VS & Hate)
    useEffect(() => {
        if (currentUser?.id) {
            console.log("Fetching interstitial candidates for user:", currentUser.id);
            const fetchVs = fetch(`${API_BASE_URL}/api/vs/candidates?user_id=${currentUser.id}`)
                .then(res => res.json())
                .catch(err => {
                    console.error("Failed to fetch VS candidates", err);
                    return [];
                });

            const fetchHate = fetch(`${API_BASE_URL}/api/hate/candidates?user_id=${currentUser.id}`)
                .then(res => res.json())
                .catch(err => {
                    console.error("Failed to fetch Hate candidates", err);
                    return [];
                });

            Promise.all([fetchVs, fetchHate])
                .then(([vsData, hateData]) => {
                    console.log("Interstitial Data:", { vsData, hateData });
                    const vs = Array.isArray(vsData) ? vsData.map((item: any) => ({ ...item, type: 'vs' })) : [];
                    const hate = Array.isArray(hateData) ? hateData.map((item: any) => ({ ...item, type: 'hate' })) : [];
                    // Combine and shuffle
                    const combined = [...vs, ...hate].sort(() => Math.random() - 0.5);
                    console.log("Combined Interstitials:", combined);
                    setInterstitialItems(combined);
                });
        }
    }, [currentUser?.id, refreshTrigger]);

    const handleVsVote = async (id: number, selection: 'A' | 'B') => {
        try {
            if (currentUser?.id) {
                await authFetch(`${API_BASE_URL}/api/vs/${id}/vote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selection })
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleHateVote = async (id: number, selection: 'EAT' | 'NOT_EAT') => {
        try {
            if (currentUser?.id) {
                await authFetch(`${API_BASE_URL}/api/hate/${id}/vote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selection })
                });
            }
        } catch (e) {
            console.error(e);
        }
    };


    const [hiddenBonusIndices, setHiddenBonusIndices] = useState<Set<number>>(new Set());

    const handleCloseBonus = (index: number) => {
        setHiddenBonusIndices(prev => {
            const next = new Set(prev);
            next.add(index);
            return next;
        });
    };

    const handleNextBonus = (id: number) => {
        setInterstitialItems(prev => prev.filter(item => item.id !== id));
    };

    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => {
                    const nextPage = prev + 1;
                    fetchFeed(nextPage);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Smart Header */}
            <MainHeader
                ref={headerRef}
                title={t('home.today')}
                isVisible={isHeaderVisible}
                rightAction={
                    <div className="flex gap-4">
                        <button className="p-2 rounded-full hover:bg-muted transition-colors relative">
                            <Bell className="text-foreground" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background" />
                        </button>
                    </div>
                }
            />

            {/* Feed List */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                data-scroll-container="true"
                onScroll={handleScroll}
                style={{ paddingTop: headerHeight }} // Compensate for fixed header
            >
                <div className="pb-8">
                    {/* Chips */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 px-5">
                        {CHIPS.map(chip => (
                            <FilterChip
                                key={chip}
                                label={t(`home.chips.${chip}`)}
                                isActive={activeChip === chip}
                                onClick={() => handleChipChange(chip)}
                            />
                        ))}
                    </div>

                    {/* Upload Nudge Banner */}
                    <div
                        onClick={onWrite}
                        className="mx-5 mb-6 p-6 rounded-3xl shadow-sm relative overflow-hidden cursor-pointer group"
                        style={{
                            background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)'
                        }}
                    >
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="flex-1 pr-4">
                                <h2 className="text-xl font-bold mb-2 text-foreground leading-tight">
                                    <Trans
                                        i18nKey="home.write_nudge.title"
                                        values={{ name: currentUser?.nickname || '회원' }}
                                        components={{ br: <br /> }}
                                    />
                                </h2>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {t('home.write_nudge.desc')}
                                </p>
                            </div>

                            {/* User Profile + Write Button Group */}
                            <div className="flex relative mt-1">
                                <div className="w-12 h-12 rounded-full border-2 border-background overflow-hidden bg-muted shadow-md z-10">
                                    {currentUser?.profile_image ? (
                                        <img
                                            src={currentUser.profile_image}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                            <UserIcon size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center absolute -bottom-1 -right-1 z-20 shadow-lg border-2 border-background group-hover:scale-110 transition-transform">
                                    <PenLine size={14} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;

                        // Calculate injection index (0-based index of VS card to show)
                        // Show after 3rd (index 2), 6th (index 5), 9th (index 8) item.
                        // (index + 1) % 3 === 0
                        const showBonusCard = (index + 1) % 3 === 0;
                        const bonusCardIndex = ((index + 1) / 3) - 1;
                        const bonusItem = interstitialItems[bonusCardIndex];

                        return (
                            <div key={`${item.id}-${index}`} ref={isLast ? lastElementRef : undefined} className="mb-8">
                                <ContentCard
                                    user={item.user}
                                    content={item}
                                    showActions={true}
                                />
                                <div className="bg-muted" />

                                {showBonusCard && bonusItem && !hiddenBonusIndices.has(bonusCardIndex) && (
                                    <div className="mt-8">
                                        {bonusItem.type === 'vs' ? (
                                            <VsCard
                                                id={bonusItem.id}
                                                itemA={bonusItem.item_a}
                                                itemB={bonusItem.item_b}
                                                index={bonusCardIndex}
                                                onVote={handleVsVote}
                                                onClose={() => handleCloseBonus(bonusCardIndex)}
                                                onNext={() => handleNextBonus(bonusItem.id)}
                                            />
                                        ) : (
                                            <HateCard
                                                id={bonusItem.id}
                                                item={bonusItem.item}
                                                index={bonusCardIndex}
                                                onVote={handleHateVote}
                                                onClose={() => handleCloseBonus(bonusCardIndex)}
                                                onNext={() => handleNextBonus(bonusItem.id)}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="py-8 flex justify-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && hasInitialFetch && items.length === 0 && (
                        <div className="py-20 text-center text-muted-foreground">
                            {t('home.empty')}
                        </div>
                    )}

                    {!loading && !hasMore && items.length > 0 && (
                        <div className="py-8 text-center text-muted-foreground text-sm">
                            {t('home.end')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
