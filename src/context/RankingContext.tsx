import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { RankingOverlay } from '@/screens/write/RankingOverlay';

interface RankingContextType {
    openRanking: (shop: any) => void;
    closeRanking: () => void;
    isRankingOpen: boolean;
}

const RankingContext = createContext<RankingContextType | undefined>(undefined);

export const RankingProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedShop, setSelectedShop] = useState<any>(null);
    const navigate = useNavigate();
    const currentUserId = Number(localStorage.getItem("mimy_user_id") || 0);

    const openRanking = (shop: any) => {
        setSelectedShop(shop);
        setIsOpen(true);
    };

    const closeRanking = () => {
        setIsOpen(false);
        setSelectedShop(null);
    };

    const handleComplete = (action: 'WRITE_REVIEW' | 'EVALUATE_ANOTHER' | 'QUIT', data?: any) => {
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
        <RankingContext.Provider value={{ openRanking, closeRanking, isRankingOpen: isOpen }}>
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
