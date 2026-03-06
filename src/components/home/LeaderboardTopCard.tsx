import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User as UserIcon } from 'lucide-react';
import { cn, calculateTasteMatch, getTasteBadgeStyle } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { getTasteType, getTasteTypeProfile } from '@/lib/tasteType';

interface LeaderboardUser {
    rank: number;
    user: {
        id: number;
        nickname: string | null;
        account_id: string;
        profile_image: string | null;
        taste_result?: { scores: Record<string, number> };
    };
    score: number;
}

interface Props {
    groupData: LeaderboardUser[];
    neighborhoodData: LeaderboardUser[];
    overallData: LeaderboardUser[];
    groupName: string | null;
    neighborhoodName: string | null;
}

export const LeaderboardTopCard: React.FC<Props> = ({
    groupData,
    neighborhoodData,
    overallData,
    groupName,
    neighborhoodName,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser } = useUser();

    // Determine available filters
    const filters: { key: string; label: string; data: LeaderboardUser[] }[] = [];
    if (groupName && groupData.length > 0) {
        filters.push({ key: 'company', label: groupName, data: groupData });
    }
    if (neighborhoodName && neighborhoodData.length > 0) {
        filters.push({ key: 'neighborhood', label: neighborhoodName, data: neighborhoodData });
    }
    if (overallData.length > 0) {
        filters.push({ key: 'overall', label: t('home.sections.leaderboard_overall'), data: overallData });
    }

    const [selectedFilter, setSelectedFilter] = useState<string>(filters[0]?.key || 'overall');

    if (filters.length === 0) return null;

    const activeItems = filters.find(f => f.key === selectedFilter)?.data || [];

    const getRankStyle = (idx: number) => {
        switch (idx) {
            case 0: return 'text-yellow-600 font-black';
            case 1: return 'text-gray-500 font-black';
            case 2: return 'text-amber-800 font-black';
            default: return 'text-muted-foreground font-bold';
        }
    };

    return (
        <div className="px-5">
            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                {filters.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setSelectedFilter(f.key)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selectedFilter === f.key
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* User List */}
            <div className="space-y-2">
                {activeItems.slice(0, 10).map((item, idx) => {
                    const tasteType = item.user.taste_result?.scores
                        ? getTasteType(item.user.taste_result)
                        : null;
                    const tasteProfile = tasteType ? getTasteTypeProfile(tasteType, 'ko') : null;
                    const matchScore = (currentUser?.taste_result?.scores && item.user.taste_result?.scores)
                        ? calculateTasteMatch(currentUser.taste_result.scores, item.user.taste_result.scores)
                        : null;

                    return (
                        <div
                            key={item.user.id}
                            onClick={() => {
                                const current = new URLSearchParams(window.location.search);
                                const targetId = item.user.account_id || item.user.id;
                                current.set('viewUser', String(targetId));
                                navigate(`${window.location.pathname}?${current.toString()}`);
                            }}
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-all',
                                idx === 0 ? 'bg-[#FFFBEB]' :
                                    idx === 1 ? 'bg-[#F9FAFB]' :
                                        idx === 2 ? 'bg-[#FFF7ED]' : ''
                            )}
                        >
                            {/* Rank */}
                            <span className={`text-sm w-5 text-center flex-shrink-0 ${getRankStyle(idx)}`}>
                                {idx + 1}
                            </span>

                            {/* Profile Image */}
                            <div className={cn(
                                'w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 shadow-sm',
                                idx === 0 ? 'border-yellow-400' :
                                    idx === 1 ? 'border-gray-300' :
                                        idx === 2 ? 'border-orange-300' : 'border-transparent bg-muted'
                            )}>
                                {item.user.profile_image ? (
                                    <img
                                        src={item.user.profile_image}
                                        alt={item.user.nickname || 'User'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                        <UserIcon className="w-5 h-5 opacity-30" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[15px] text-foreground truncate font-medium">
                                        {item.user.nickname || 'User'}
                                    </p>
                                    {tasteProfile && (
                                        <span className={cn(
                                            'text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded-md font-bold truncate max-w-[100px]',
                                            getTasteBadgeStyle(matchScore)
                                        )}>
                                            {tasteProfile.name}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    @{item.user.account_id}
                                </p>
                            </div>

                            {/* Score */}
                            <div className="flex-shrink-0">
                                <span className={cn(
                                    'text-sm font-black',
                                    idx === 0 ? 'text-yellow-600' :
                                        idx === 1 ? 'text-gray-600' :
                                            idx === 2 ? 'text-orange-600' : 'text-primary'
                                )}>
                                    {item.score}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
