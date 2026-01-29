import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    registerCallback: (callback: (data: RankingUpdateData) => void) => void;
    unregisterCallback: () => void;
}

const RankingContext = createContext<RankingContextType | undefined>(undefined);

export const RankingProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedShop, setSelectedShop] = useState<any>(null);
    const [updateCallback, setUpdateCallback] = useState<((data: RankingUpdateData) => void) | null>(null);
    const navigate = useNavigate();
    const { user } = useUser();
    const currentUserId = user?.id || 0;

    const openRanking = (shop: any) => {
        setSelectedShop(shop);
        setIsOpen(true);
    };

    const closeRanking = () => {
        setIsOpen(false);
        setSelectedShop(null);
    };

    const registerCallback = useCallback((callback: (data: RankingUpdateData) => void) => {
        setUpdateCallback(() => callback);
    }, []);

    const unregisterCallback = useCallback(() => {
        setUpdateCallback(null);
    }, []);

    const handleComplete = (action: 'WRITE_REVIEW' | 'EVALUATE_ANOTHER' | 'QUIT', data?: any) => {
        // Notify subscribers that ranking was updated with optimistic data
        if (updateCallback && selectedShop?.id && data) {
            const updateData: RankingUpdateData = {
                shopId: selectedShop.id,
                my_review_stats: data.rank && data.satisfaction !== undefined ? {
                    satisfaction: data.satisfaction === 'good' ? 2 : data.satisfaction === 'ok' ? 1 : 0,
                    rank: data.rank || 0,
                    percentile: data.percentile || 0,
                    total_reviews: data.total_reviews || 0
                } : null
            };
            console.log('[RankingContext] Notifying with optimistic data:', updateData);
            updateCallback(updateData);
        }

        setIsOpen(false);
        if (action === 'WRITE_REVIEW') {
            // Navigate to write flow with state to skip search
            // Use navigation state to pass params
            navigate('/write', {
                state: {
                    step: 'WRITE_CONTENT',
                    shop: selectedShop,
                    satisfaction: data?.satisfaction || 'good'
                }
            });
        } else if (action === 'EVALUATE_ANOTHER') {
            // Go to search
            navigate('/write', { replace: true });
        } else {
            // Stay where we are, just closed overlay
        }
        setSelectedShop(null);
    };

    return (
        <RankingContext.Provider value={{ openRanking, closeRanking, isRankingOpen: isOpen, registerCallback, unregisterCallback }}>
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
