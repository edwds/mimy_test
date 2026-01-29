import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { RankingOverlay } from '@/screens/write/RankingOverlay';
import { useUser } from './UserContext';

interface RankingContextType {
    openRanking: (shop: any) => void;
    closeRanking: () => void;
    isRankingOpen: boolean;
    registerCallback: (callback: (shopId: number) => void) => void;
    unregisterCallback: () => void;
}

const RankingContext = createContext<RankingContextType | undefined>(undefined);

export const RankingProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedShop, setSelectedShop] = useState<any>(null);
    const [updateCallback, setUpdateCallback] = useState<((shopId: number) => void) | null>(null);
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

    const registerCallback = (callback: (shopId: number) => void) => {
        setUpdateCallback(() => callback);
    };

    const unregisterCallback = () => {
        setUpdateCallback(null);
    };

    const handleComplete = (action: 'WRITE_REVIEW' | 'EVALUATE_ANOTHER' | 'QUIT', data?: any) => {
        // Notify subscribers that ranking was updated
        if (updateCallback && selectedShop?.id) {
            updateCallback(selectedShop.id);
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
