import { useState, useCallback } from 'react';
import { VsCard } from '@/components/VsCard';
import { HateCard } from '@/components/HateCard';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { useUser } from '@/context/UserContext';

interface VsItem {
    id: number;
    item_a: string;
    item_b: string;
    type: 'vs';
}

interface HateItem {
    id: number;
    item: string;
    type: 'hate';
}

type GameItem = VsItem | HateItem;

interface Props {
    vsItems: any[];
    hateItems: any[];
}

export const VsSection: React.FC<Props> = ({ vsItems, hateItems }) => {
    const { user: currentUser } = useUser();
    const [items] = useState<GameItem[]>(() => {
        const vs = vsItems.map((item: any) => ({ ...item, type: 'vs' as const }));
        const hate = hateItems.map((item: any) => ({ ...item, type: 'hate' as const }));
        return [...vs, ...hate].sort(() => Math.random() - 0.5);
    });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    const handleVsVote = async (id: number, selection: 'A' | 'B') => {
        if (currentUser?.id) {
            try {
                await authFetch(`${API_BASE_URL}/api/vs/${id}/vote`, {
                    method: 'POST',
                    body: JSON.stringify({ selection }),
                });
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleHateVote = async (id: number, selection: 'EAT' | 'NOT_EAT') => {
        if (currentUser?.id) {
            try {
                await authFetch(`${API_BASE_URL}/api/hate/${id}/vote`, {
                    method: 'POST',
                    body: JSON.stringify({ selection }),
                });
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => {
            const next = prev + 1;
            if (next >= items.length) {
                setDismissed(true);
            }
            return next;
        });
    }, [items.length]);

    const handleClose = useCallback(() => {
        setDismissed(true);
    }, []);

    if (dismissed || items.length === 0 || currentIndex >= items.length) return null;

    const currentItem = items[currentIndex];

    return (
        <div>
            {currentItem.type === 'vs' ? (
                <VsCard
                    key={currentItem.id}
                    id={currentItem.id}
                    itemA={(currentItem as VsItem).item_a}
                    itemB={(currentItem as VsItem).item_b}
                    index={currentIndex}
                    onVote={handleVsVote}
                    onClose={handleClose}
                    onNext={handleNext}
                />
            ) : (
                <HateCard
                    key={currentItem.id}
                    id={currentItem.id}
                    item={(currentItem as HateItem).item}
                    index={currentIndex}
                    onVote={handleHateVote}
                    onClose={handleClose}
                    onNext={handleNext}
                />
            )}
        </div>
    );
};
