import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RankingOverlay } from '@/screens/write/RankingOverlay';
import { useUser } from './UserContext';
import { useTranslation } from 'react-i18next';

interface RankingUpdateData {
    shopId: number;
    my_review_stats: {
        satisfaction: number;
        rank: number;
        percentile: number;
        total_reviews: number;
    } | null;
}

interface RankingContextType {
    openRanking: (shop: any) => void;
    closeRanking: () => void;
    isRankingOpen: boolean;
    registerCallback: (id: string, callback: (data: RankingUpdateData) => void) => void;
    unregisterCallback: (id: string) => void;
}

const RankingContext = createContext<RankingContextType | undefined>(undefined);

export const RankingProvider = ({ children }: { children: ReactNode }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedShop, setSelectedShop] = useState<any>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingShop, setPendingShop] = useState<any>(null);
    const [updateCallbacks, setUpdateCallbacks] = useState<Map<string, (data: RankingUpdateData) => void>>(new Map());
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const currentUserId = user?.id || 0;

    const openRanking = useCallback((shop: any) => {
        // Check if already recorded
        if (shop.my_review_stats) {
            setPendingShop(shop);
            setShowConfirmDialog(true);
        } else {
            setSelectedShop(shop);
            setIsOpen(true);
        }
    }, []);

    const confirmEdit = useCallback(() => {
        setShowConfirmDialog(false);
        if (pendingShop) {
            setSelectedShop(pendingShop);
            setIsOpen(true);
            setPendingShop(null);
        }
    }, [pendingShop]);

    const cancelEdit = useCallback(() => {
        setShowConfirmDialog(false);
        setPendingShop(null);
    }, []);

    const closeRanking = useCallback(() => {
        setIsOpen(false);
        setSelectedShop(null);
    }, []);

    const registerCallback = useCallback((id: string, callback: (data: RankingUpdateData) => void) => {
        setUpdateCallbacks(prev => {
            const next = new Map(prev);
            next.set(id, callback);
            console.log(`[RankingContext] Registered callback for: ${id}, total: ${next.size}`);
            return next;
        });
    }, []);

    const unregisterCallback = useCallback((id: string) => {
        setUpdateCallbacks(prev => {
            const next = new Map(prev);
            next.delete(id);
            console.log(`[RankingContext] Unregistered callback for: ${id}, remaining: ${next.size}`);
            return next;
        });
    }, []);

    const handleComplete = (action: 'WRITE_REVIEW' | 'EVALUATE_ANOTHER' | 'QUIT', data?: any) => {
        console.log('[RankingContext] handleComplete called:', {
            action,
            data,
            selectedShop: selectedShop?.id,
            subscriberCount: updateCallbacks.size
        });

        // Store shop before clearing it
        const currentShop = selectedShop;

        // Notify subscribers based on action:
        // - WRITE_REVIEW: Always notify (WriteFlow needs to transition)
        // - QUIT: Always notify (for UI updates)
        // - EVALUATE_ANOTHER: Don't notify (prevents race condition with navigation)
        const shouldNotify = action !== 'EVALUATE_ANOTHER';

        if (shouldNotify && currentShop?.id && data && data.satisfaction !== undefined && updateCallbacks.size > 0) {
            const updateData: RankingUpdateData = {
                shopId: currentShop.id,
                my_review_stats: {
                    satisfaction: data.satisfaction === 'good' ? 2 : data.satisfaction === 'ok' ? 1 : 0,
                    rank: data.rank || 0,
                    percentile: data.percentile || 0,
                    total_reviews: data.total_reviews || 0
                }
            };
            console.log(`[RankingContext] ✅ Notifying ${updateCallbacks.size} subscribers for action ${action}:`, updateData);

            // Notify all subscribers
            updateCallbacks.forEach((callback, id) => {
                console.log(`[RankingContext] → Notifying: ${id}`);
                callback(updateData);
            });
        } else {
            console.log('[RankingContext] ❌ Not notifying:', {
                action,
                shouldNotify,
                hasShopId: !!currentShop?.id,
                hasData: !!data,
                hasSatisfaction: data?.satisfaction !== undefined,
                subscriberCount: updateCallbacks.size
            });
        }

        // Close overlay immediately after notifying callbacks
        setIsOpen(false);
        setSelectedShop(null);

        if (action === 'WRITE_REVIEW') {
            // Only navigate if not already on /write route
            // This prevents remounting WriteFlow when callback is already handling the transition
            if (location.pathname !== '/write') {
                console.log('[RankingContext] Navigating to /write from:', location.pathname);
                navigate('/write', {
                    state: {
                        step: 'WRITE_CONTENT',
                        shop: currentShop,
                        satisfaction: data?.satisfaction || 'good'
                    }
                });
            } else {
                console.log('[RankingContext] Already on /write, letting callback handle transition');
            }
        } else if (action === 'EVALUATE_ANOTHER') {
            // Go to search - don't notify callbacks to avoid race condition
            console.log('[RankingContext] Navigating to search for another place');
            navigate('/write', { replace: true, state: { step: 'SEARCH_SHOP' } });
        } else {
            // QUIT: Stay where we are, just closed overlay
        }
    };

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        openRanking,
        closeRanking,
        isRankingOpen: isOpen,
        registerCallback,
        unregisterCallback
    }), [isOpen, openRanking, closeRanking, registerCallback, unregisterCallback]);

    return (
        <RankingContext.Provider value={contextValue}>
            {children}
            {isOpen && selectedShop && (
                <RankingOverlay
                    shop={selectedShop}
                    userId={currentUserId}
                    onClose={closeRanking}
                    onComplete={handleComplete}
                />
            )}

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelEdit} />
                    <div className="relative bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl animate-in zoom-in-95 duration-200">
                        <h3 className="font-bold text-lg mb-2 text-center">{t('common.already_recorded')}</h3>
                        <p className="text-sm text-gray-600 mb-6 text-center">
                            {t('common.edit_record')}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={cancelEdit}
                                className="flex-1 h-11 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                                {t('common.no')}
                            </button>
                            <button
                                onClick={confirmEdit}
                                className="flex-1 h-11 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
                            >
                                {t('common.yes_edit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </RankingContext.Provider>
    );
};

export const useRanking = () => {
    const context = useContext(RankingContext);
    if (!context) {
        throw new Error('useRanking must be used within a RankingProvider');
    }
    return context;
};

export type { RankingUpdateData };
