import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscoveryFiltersProps {
    onSearchClick: () => void;
    selectedFilters: string[];
    onFilterChange: (filters: string[]) => void;
}

// 정규화된 food_kind 카테고리 (서버에서 역매핑으로 모든 DB 값에 대응)
// DB 건수가 많은 순으로 배치
const FIXED_FOOD_KINDS = [
    { value: '일식', label: '일식' },
    { value: '고기/구이', label: '고기/구이' },
    { value: '이탈리안', label: '이탈리안' },
    { value: '한식', label: '한식' },
    { value: '오마카세', label: '오마카세' },
    { value: '바/주점', label: '바/주점' },
    { value: '양식', label: '양식' },
    { value: '중식', label: '중식' },
    { value: '해산물', label: '해산물' },
    { value: '스시/회', label: '스시/회' },
    { value: '카페', label: '카페' },
    { value: '스테이크', label: '스테이크' },
];

export const DiscoveryFilters: React.FC<DiscoveryFiltersProps> = ({
    onSearchClick,
    selectedFilters,
    onFilterChange
}) => {
    const toggleFilter = (filter: string) => {
        // If clicking the same filter, deselect it
        if (selectedFilters.includes(filter)) {
            onFilterChange([]);
        } else {
            // Replace with new filter (only one filter at a time)
            onFilterChange([filter]);
        }
    };

    return (
        <div className="w-full flex items-center gap-2 relative">
            {/* Filter Chips - Scrollable, goes under search button */}
            <div className="flex-1 relative overflow-visible">
                {/* Scrollable chips container - extends behind search button */}
                <div
                    className="flex gap-2 overflow-x-auto scrollbar-hide pl-0 pr-10"
                    style={{
                        maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)'
                    }}
                >
                    {/* High Match Filter */}
                    <button
                        onClick={() => toggleFilter('HIGH_MATCH')}
                        className={cn(
                            "flex-shrink-0 h-10 px-4 rounded-full text-sm font-medium border transition-all active:scale-95 flex items-center justify-center",
                            selectedFilters.includes('HIGH_MATCH')
                                ? "bg-primary text-white border-primary shadow-md"
                                : "bg-background/95 backdrop-blur text-gray-700 border-border/50 shadow-sm"
                        )}
                    >
                        ⭐ 높은 매칭
                    </button>

                    {/* Food Kind Filters - Fixed 6 categories with actual DB values */}
                    {FIXED_FOOD_KINDS.map((foodKind) => (
                        <button
                            key={foodKind.value}
                            onClick={() => toggleFilter(foodKind.value)}
                            className={cn(
                                "flex-shrink-0 h-10 px-4 rounded-full text-sm font-medium border transition-all active:scale-95 flex items-center justify-center",
                                selectedFilters.includes(foodKind.value)
                                    ? "bg-primary text-white border-primary shadow-md"
                                    : "bg-background/95 backdrop-blur text-gray-700 border-border/50 shadow-sm"
                            )}
                        >
                            {foodKind.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Button - Fixed on the right, appears above chips with shadow */}
            <div className="flex-shrink-0 absolute right-0 top-0 z-20 flex items-center h-10">
                <button
                    onClick={onSearchClick}
                    className="h-10 w-10 flex items-center justify-center bg-white rounded-full shadow-lg border border-gray-100 active:scale-95 transition-transform"
                >
                    <Search className="w-5 h-5 text-gray-700" />
                </button>
            </div>
        </div>
    );
};
