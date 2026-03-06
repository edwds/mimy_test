import { useNavigate } from 'react-router-dom';
import { User as UserIcon, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    list: {
        id: string;
        type: string;
        title: string;
        value: string | null;
        user: {
            id: number;
            nickname: string | null;
            account_id: string;
            profile_image: string | null;
            taste_match: number;
        };
        shops: Array<{
            id: number;
            name: string;
            rank: number;
            thumbnail?: string | null;
        }>;
    };
}

export const MiniListCard: React.FC<Props> = ({ list }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleClick = () => {
        const params = new URLSearchParams({
            type: list.type,
            value: list.value || '',
            title: list.title,
        });
        navigate(`/list/${list.user.id}?${params.toString()}`);
    };

    const handleUserClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/main/profile?viewUser=${list.user.id}`);
    };

    return (
        <div
            onClick={handleClick}
            className="flex-shrink-0 w-[70vw] max-w-[280px] bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        >
            {/* User header */}
            <div className="flex items-center gap-2.5 px-4 pt-4 pb-3" onClick={handleUserClick}>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {list.user.profile_image ? (
                        <img
                            src={list.user.profile_image}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <UserIcon size={14} />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate block">
                        {list.user.nickname || list.user.account_id}
                    </span>
                    <span className="text-xs text-primary font-medium">
                        {t('home.similar_taste_list.match', { percent: list.user.taste_match })}
                    </span>
                </div>
            </div>

            {/* List title */}
            <p className="text-base font-bold text-foreground px-4 mb-3 truncate">{list.title}</p>

            {/* Top 5 shops */}
            <div className="space-y-2.5 px-4 pb-3">
                {list.shops.slice(0, 5).map((shop, i) => (
                    <div key={shop.id} className="flex items-center gap-2.5">
                        <span className="text-sm text-muted-foreground w-5 text-right flex-shrink-0 font-medium">
                            {i + 1}.
                        </span>
                        <span className="text-sm text-foreground truncate">{shop.name}</span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border/50 flex items-center justify-center gap-1">
                <span className="text-sm text-primary font-semibold">
                    {t('home.similar_taste_list.view_all', { count: list.shops.length })}
                </span>
                <ChevronRight size={14} className="text-primary" />
            </div>
        </div>
    );
};
