import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RankingOverlay } from '@/screens/write/RankingOverlay';
import { useUser } from './UserContext';

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
    const [isOpen, setIsOpen] = useState(false);
    const [selectedShop, setSelectedShop] = useState<any>(null);
    const [updateCallbacks, setUpdateCallbacks] = useState<Map<string, (data: RankingUpdateData) => void>>(new Map());
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const currentUserId = user?.id || 0;

    const openRanking = useCallback((shop: any) => {
        setSelectedShop(shop);
        setIsOpen(true);
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

        // Notify ALL subscribers that ranking was updated with optimistic data
        if (currentShop?.id && data && data.satisfaction !== undefined && updateCallbacks.size > 0) {
            const updateData: RankingUpdateData = {
                shopId: currentShop.id,
                my_review_stats: {
                    satisfaction: data.satisfaction === 'good' ? 2 : data.satisfaction === 'ok' ? 1 : 0,
                    rank: data.rank || 0,
                    percentile: data.percentile || 0,
                    total_reviews: data.total_reviews || 0
                }
            };
            console.log(`[RankingContext] ✅ Notifying ${updateCallbacks.size} subscribers:`, updateData);

            // Notify all subscribers
            updateCallbacks.forEach((callback, id) => {
                console.log(`[RankingContext] → Notifying: ${id}`);
                callback(updateData);
            });
        } else {
            console.log('[RankingContext] ❌ Not notifying:', {
                hasShopId: !!currentShop?.id,
                hasData: !!data,
                hasSatisfaction: data?.satisfaction !== undefined,
                subscriberCount: updateCallbacks.size
            });
        }

        // Use setTimeout to defer state updates until after callbacks complete
        // This prevents unmounting the component that's handling the callback
        setTimeout(() => {
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
                // Go to search
                navigate('/write', { replace: true });
            } else {
                // Stay where we are, just closed overlay
            }
        }, 0);
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
