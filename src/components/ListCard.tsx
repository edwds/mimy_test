import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ListCardProps {
    id: string;
    type: string;
    title: string;
    count: number;
    updatedAt: string;
    author: {
        nickname: string;
        profile_image: string | null;
    };
    onPress?: () => void;
}

export const ListCard = ({ id, title, count, updatedAt, author, onPress }: ListCardProps) => {
    const { i18n } = useTranslation();

    const formattedDate = new Date(updatedAt).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div
            onClick={onPress}
            className="bg-white rounded-xl p-5 border border-gray-100 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer mb-3 relative overflow-hidden shadow-sm"
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] text-gray-400 font-medium">
                        {author.nickname} · {formattedDate}
                    </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 truncate leading-tight">
                    {title}
                </h3>

                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[12px] font-medium">
                    총 {count}개 맛집
                </div>
            </div>

            <div className="text-gray-300 ml-4">
                <ChevronRight size={24} />
            </div>
        </div>
    );
};
