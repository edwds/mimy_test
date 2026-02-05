import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format, getYear, startOfWeek, endOfWeek, subWeeks, isWithinInterval, addDays, isSameDay, startOfMonth } from 'date-fns';

interface TimelineViewProps {
    contents: any[];
}

interface WeekGroup {
    weekLabel: string;
    dateRange: string;
    items: DayGroup[];
}

interface DayGroup {
    date: Date;
    dayLabel: string;
    contents: any[];
}

export const TimelineView = ({ contents }: TimelineViewProps) => {
    const navigate = useNavigate();

    // Generate all weeks from current to past, and fill with contents
    const { groupedByWeek, contentsWithoutDate } = React.useMemo(() => {
        const now = new Date();
        const noDate: any[] = [];

        // Separate contents with and without visit_date
        const withDate: any[] = [];
        contents.forEach(c => {
            if (c.type === 'review' && c.review_prop?.visit_date) {
                withDate.push(c);
            } else if (c.type === 'review') {
                noDate.push(c);
            }
        });

        // Generate weeks from current to 20 weeks ago
        const numberOfWeeks = 20;
        const result: WeekGroup[] = [];

        for (let i = 0; i < numberOfWeeks; i++) {
            const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
            const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

            // Get relative week label
            let weekLabel: string;
            if (i === 0) {
                weekLabel = '이번 주';
            } else if (i === 1) {
                weekLabel = '지난주';
            } else if (i === 2 || i === 3) {
                weekLabel = `${i}주 전`;
            } else {
                // Calculate week number within the month
                const monthStart = startOfMonth(weekStart);
                const weekOfMonth = Math.ceil((weekStart.getDate() + monthStart.getDay()) / 7);
                const month = format(weekStart, 'M');
                const year = getYear(weekStart);
                const currentYear = getYear(now);

                if (year < currentYear) {
                    // Show year if different from current year
                    weekLabel = `${year % 100}년 ${month}월 ${weekOfMonth}주`;
                } else {
                    weekLabel = `${month}월 ${weekOfMonth}주`;
                }
            }

            // Find contents in this week
            const weekContents = withDate.filter(c => {
                const visitDate = new Date(c.review_prop.visit_date);
                return isWithinInterval(visitDate, { start: weekStart, end: weekEnd });
            });

            // Create all 7 days of the week (Mon-Sun)
            const dayGroups: DayGroup[] = [];
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const currentDay = addDays(weekStart, dayOffset);

                // Find contents for this specific day
                const dayContents = weekContents.filter(c => {
                    const visitDate = new Date(c.review_prop.visit_date);
                    return isSameDay(visitDate, currentDay);
                });

                dayGroups.push({
                    date: currentDay,
                    dayLabel: format(currentDay, 'E'), // Mon, Tue, etc
                    contents: dayContents
                });
            }

            result.push({
                weekLabel,
                dateRange: `${format(weekStart, 'M.d')} – ${format(weekEnd, 'M.d')}`,
                items: dayGroups
            });
        }

        // Sort contents without date by created_at (newest first)
        const sortedNoDate = noDate.sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return {
            groupedByWeek: result,
            contentsWithoutDate: sortedNoDate
        };
    }, [contents]);

    const handleContentClick = (content: any) => {
        navigate(`/content/detail?contentId=${content.id}`);
    };

    const handleDayClick = (date: Date, hasContent: boolean, firstContent: any) => {
        if (hasContent) {
            // If there's content, open the content detail view
            handleContentClick(firstContent);
        } else {
            // If no content, navigate to write flow with pre-filled visit_date
            navigate(`/write?visitDate=${format(date, 'yyyy-MM-dd')}`);
        }
    };

    if (groupedByWeek.length === 0 && contentsWithoutDate.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-6">
                <p className="text-sm text-center text-muted-foreground">
                    리뷰가 없습니다
                </p>
            </div>
        );
    }

    return (
        <div className="pb-4">
            {/* Week Groups */}
            {groupedByWeek.map((week, idx) => (
                <div key={idx} className="mb-6">
                    {/* Week Header */}
                    <div className="px-5 mb-2">
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-xl font-bold text-foreground">{week.weekLabel}</h3>
                            <span className="text-sm text-muted-foreground">{week.dateRange}</span>
                        </div>
                    </div>

                    {/* Day Groups - Always show all 7 days */}
                    <div className="flex gap-0.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
                        {week.items.map((day, dayIdx) => {
                            const hasContent = day.contents.length > 0;
                            const firstContent = hasContent ? day.contents[0] : null;
                            const hasImage = firstContent?.images && firstContent.images.length > 0;

                            // Apply rounded corners only to first and last cards
                            const isFirst = dayIdx === 0;
                            const isLast = dayIdx === 6;
                            const roundedClass = isFirst ? 'rounded-l-2xl' : isLast ? 'rounded-r-2xl' : '';

                            return (
                                <div
                                    key={dayIdx}
                                    className="flex-shrink-0 cursor-pointer"
                                    onClick={() => handleDayClick(day.date, hasContent, firstContent)}
                                >
                                    <div
                                        className={`relative w-24 h-28 ${roundedClass} overflow-hidden flex flex-col items-center justify-center`}
                                        style={{
                                            backgroundImage: hasImage ? `url(${firstContent.images[0]})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            backgroundColor: '#f5f5f5'
                                        }}
                                    >
                                        {/* Overlay for text readability when there's an image */}
                                        {hasImage && (
                                            <div className="absolute inset-0 bg-black/20" />
                                        )}

                                        {/* Content */}
                                        <div className="relative z-10 flex flex-col items-center justify-center">
                                            <span className={`text-xs font-medium mb-1 ${hasImage ? 'text-white' : 'text-gray-400'}`}>
                                                {format(day.date, 'M')}월
                                            </span>
                                            <span className={`text-4xl font-bold ${hasImage ? 'text-white' : 'text-gray-300'}`}>
                                                {format(day.date, 'd')}
                                            </span>
                                            <span className={`text-sm font-medium mt-1 ${hasImage ? 'text-white' : 'text-gray-400'}`}>
                                                {day.dayLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Contents Without Date */}
            {contentsWithoutDate.length > 0 && (
                <div className="mb-6">
                    {/* Header */}
                    <div className="px-5 mb-2">
                        <h3 className="text-xl font-bold text-foreground">날짜 미설정</h3>
                    </div>

                    {/* Horizontal Scroll */}
                    <div className="flex gap-2 overflow-x-auto px-5 pb-2 scrollbar-hide">
                        {contentsWithoutDate.map((content, idx) => {
                            const hasImage = content.images && content.images.length > 0;

                            return (
                                <div
                                    key={idx}
                                    className="flex-shrink-0 cursor-pointer"
                                    onClick={() => handleContentClick(content)}
                                >
                                    <div
                                        className="relative w-24 h-28 rounded-2xl overflow-hidden flex flex-col items-center justify-center"
                                        style={{
                                            backgroundImage: hasImage ? `url(${content.images[0]})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            backgroundColor: '#f5f5f5'
                                        }}
                                    >
                                        {/* Overlay */}
                                        {hasImage && (
                                            <div className="absolute inset-0 bg-black/20" />
                                        )}

                                        {/* Content */}
                                        <div className="relative z-10 flex flex-col items-center justify-center">
                                            <span className={`text-xs font-medium ${hasImage ? 'text-white' : 'text-gray-400'}`}>
                                                날짜 설정
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
