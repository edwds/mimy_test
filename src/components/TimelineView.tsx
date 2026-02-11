import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, getYear, getMonth, startOfWeek, endOfWeek, subWeeks, isWithinInterval, addDays, isSameDay, startOfMonth, endOfMonth, isFuture, startOfDay, subMonths, addMonths, differenceInWeeks } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

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

interface MonthGroup {
    monthLabel: string;
    dateRange: string;
    items: DayGroup[];
    totalCount: number;
}

type ViewMode = 'weekly' | 'monthly';

export const TimelineView = ({ contents }: TimelineViewProps) => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<ViewMode>('weekly');
    const [startWeekOffset, setStartWeekOffset] = useState(0);
    const [visibleWeeksCount, setVisibleWeeksCount] = useState(4);
    const [startMonthOffset, setStartMonthOffset] = useState(0);
    const [visibleMonthsCount, setVisibleMonthsCount] = useState(4);
    const [showJumpPicker, setShowJumpPicker] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // Separate contents with and without visit_date (shared)
    const { withDate, noDate } = React.useMemo(() => {
        const withDateArr: any[] = [];
        const noDateArr: any[] = [];
        contents.forEach(c => {
            if (c.type === 'review' && c.review_prop?.visit_date) {
                withDateArr.push(c);
            } else if (c.type === 'review') {
                noDateArr.push(c);
            }
        });
        return { withDate: withDateArr, noDate: noDateArr };
    }, [contents]);

    // Generate weekly view data
    const { groupedByWeek, contentsWithoutDate, hasMorePastWeeks, hasMoreFutureWeeks } = React.useMemo(() => {
        const now = new Date();
        const result: WeekGroup[] = [];

        for (let i = startWeekOffset; i < startWeekOffset + visibleWeeksCount; i++) {
            const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
            const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

            let weekLabel: string;
            if (i === 0) {
                weekLabel = '이번 주';
            } else if (i === 1) {
                weekLabel = '지난주';
            } else if (i === 2 || i === 3) {
                weekLabel = `${i}주 전`;
            } else {
                const mStart = startOfMonth(weekStart);
                const weekOfMonth = Math.ceil((weekStart.getDate() + mStart.getDay()) / 7);
                const month = format(weekStart, 'M');
                const year = getYear(weekStart);
                const currentYear = getYear(now);
                weekLabel = year < currentYear
                    ? `${year % 100}년 ${month}월 ${weekOfMonth}주`
                    : `${month}월 ${weekOfMonth}주`;
            }

            const weekContents = withDate.filter(c => {
                const visitDate = new Date(c.review_prop.visit_date);
                return isWithinInterval(visitDate, { start: weekStart, end: weekEnd });
            });

            const dayGroups: DayGroup[] = [];
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const currentDay = addDays(weekStart, dayOffset);
                if (isFuture(startOfDay(currentDay))) continue;

                const dayContents = weekContents.filter(c => {
                    const visitDate = new Date(c.review_prop.visit_date);
                    return isSameDay(visitDate, currentDay);
                });

                dayGroups.push({
                    date: currentDay,
                    dayLabel: format(currentDay, 'E'),
                    contents: dayContents
                });
            }

            if (dayGroups.length > 0) {
                result.push({
                    weekLabel,
                    dateRange: `${format(weekStart, 'M.d')} – ${format(weekEnd, 'M.d')}`,
                    items: dayGroups
                });
            }
        }

        const sortedNoDate = noDate.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return {
            groupedByWeek: result,
            contentsWithoutDate: sortedNoDate,
            hasMorePastWeeks: (startWeekOffset + visibleWeeksCount) < 52,
            hasMoreFutureWeeks: startWeekOffset > 0
        };
    }, [withDate, noDate, startWeekOffset, visibleWeeksCount]);

    // Generate monthly view data
    const { groupedByMonth, hasMorePastMonths, hasMoreFutureMonths } = React.useMemo(() => {
        const now = new Date();
        const result: MonthGroup[] = [];

        for (let i = startMonthOffset; i < startMonthOffset + visibleMonthsCount; i++) {
            const targetMonth = subMonths(now, i);
            const mStart = startOfMonth(targetMonth);
            const mEnd = endOfMonth(targetMonth);

            let monthLabel: string;
            if (i === 0) {
                monthLabel = '이번 달';
            } else if (i === 1) {
                monthLabel = '지난달';
            } else {
                const year = getYear(targetMonth);
                const currentYear = getYear(now);
                monthLabel = year < currentYear
                    ? format(targetMonth, "yy년 M월")
                    : format(targetMonth, "M월");
            }

            const monthContents = withDate.filter(c => {
                const visitDate = new Date(c.review_prop.visit_date);
                return isWithinInterval(visitDate, { start: mStart, end: mEnd });
            });

            const dayMap = new Map<string, DayGroup>();
            monthContents.forEach(c => {
                const visitDate = new Date(c.review_prop.visit_date);
                const dateKey = format(visitDate, 'yyyy-MM-dd');

                if (!dayMap.has(dateKey)) {
                    dayMap.set(dateKey, {
                        date: visitDate,
                        dayLabel: format(visitDate, 'E'),
                        contents: []
                    });
                }
                dayMap.get(dateKey)!.contents.push(c);
            });

            const dayGroups = Array.from(dayMap.values()).sort(
                (a, b) => b.date.getTime() - a.date.getTime()
            );

            result.push({
                monthLabel,
                dateRange: `${format(mStart, 'M.d')} – ${format(mEnd, 'M.d')}`,
                items: dayGroups,
                totalCount: monthContents.length
            });
        }

        return {
            groupedByMonth: result,
            hasMorePastMonths: (startMonthOffset + visibleMonthsCount) < 12,
            hasMoreFutureMonths: startMonthOffset > 0
        };
    }, [withDate, startMonthOffset, visibleMonthsCount]);

    const loadMorePastWeeks = () => {
        setVisibleWeeksCount((prev: number) => Math.min(prev + 4, 52 - startWeekOffset));
    };

    const loadMoreFutureWeeks = () => {
        const weeksToAdd = Math.min(4, startWeekOffset);
        setStartWeekOffset((prev: number) => Math.max(prev - weeksToAdd, 0));
        setVisibleWeeksCount((prev: number) => prev + weeksToAdd);
    };

    const loadMorePastMonths = () => {
        setVisibleMonthsCount((prev: number) => Math.min(prev + 4, 12 - startMonthOffset));
    };

    const loadMoreFutureMonths = () => {
        const monthsToAdd = Math.min(4, startMonthOffset);
        setStartMonthOffset((prev: number) => Math.max(prev - monthsToAdd, 0));
        setVisibleMonthsCount((prev: number) => prev + monthsToAdd);
    };

    const jumpToDate = (date: Date) => {
        const now = new Date();
        if (viewMode === 'weekly') {
            const targetWeekStart = startOfWeek(date, { weekStartsOn: 1 });
            const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
            const weekOffset = Math.max(0, differenceInWeeks(currentWeekStart, targetWeekStart));
            setStartWeekOffset(weekOffset);
            setVisibleWeeksCount(4);
        } else {
            const targetMonthStart = startOfMonth(date);
            const currentMonthStart = startOfMonth(now);
            const monthOffset = (currentMonthStart.getFullYear() - targetMonthStart.getFullYear()) * 12
                + (currentMonthStart.getMonth() - targetMonthStart.getMonth());
            setStartMonthOffset(Math.max(0, monthOffset));
            setVisibleMonthsCount(4);
        }
        setShowJumpPicker(false);
    };

    const calendarDays = React.useMemo(() => {
        const mStart = startOfMonth(calendarMonth);
        const mEnd = endOfMonth(calendarMonth);
        const calStart = startOfWeek(mStart, { weekStartsOn: 1 });
        const calEnd = endOfWeek(mEnd, { weekStartsOn: 1 });

        const days: Date[] = [];
        let current = calStart;
        while (current <= calEnd) {
            days.push(current);
            current = addDays(current, 1);
        }
        return days;
    }, [calendarMonth]);

    const isCalendarCurrentMonth = (date: Date) => getMonth(date) === getMonth(calendarMonth);

    const handleContentClick = (content: any) => {
        navigate(`/content/detail?contentId=${content.id}`);
    };

    const handleDayClick = (date: Date, contentCount: number, firstContent: any) => {
        if (contentCount === 0) {
            // No content - go to write flow
            navigate(`/write?visitDate=${format(date, 'yyyy-MM-dd')}`);
        } else if (contentCount === 1) {
            // Single content - go to detail
            handleContentClick(firstContent);
        } else {
            // Multiple contents - go to list page
            navigate(`/content/list?date=${format(date, 'yyyy-MM-dd')}`);
        }
    };

    // For monthly view: navigate to list when clicking +N or any day with multiple items
    const handleMonthDayClick = (day: DayGroup) => {
        if (day.contents.length === 1) {
            handleContentClick(day.contents[0]);
        } else {
            // Multiple contents on this day - go to list
            navigate(`/content/list?date=${format(day.date, 'yyyy-MM-dd')}`);
        }
    };

    // For monthly +N card: go to the month's list starting from that date
    const handleMoreClick = (month: MonthGroup) => {
        // Navigate to the oldest visible day in this month
        if (month.items.length > 0) {
            const oldestDay = month.items[month.items.length - 1];
            navigate(`/content/list?date=${format(oldestDay.date, 'yyyy-MM-dd')}`);
        }
    };

    const isEmpty = viewMode === 'weekly'
        ? groupedByWeek.length === 0 && contentsWithoutDate.length === 0
        : groupedByMonth.every(m => m.items.length === 0);

    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-6">
                <p className="text-sm text-center text-muted-foreground">
                    리뷰가 없습니다
                </p>
            </div>
        );
    }

    return (
        <div className="pb-4 relative">
            {/* Top Controls */}
            <div className="flex items-center justify-between px-5 mb-4">
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 rounded-full p-0.5">
                    <button
                        onClick={() => setViewMode('weekly')}
                        className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                            viewMode === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                        }`}
                    >
                        주간
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                            viewMode === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                        }`}
                    >
                        월간
                    </button>
                </div>

                {/* Jump Button */}
                <button
                    onClick={() => setShowJumpPicker(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
                >
                    <Calendar className="w-4 h-4" />
                    <span>이동</span>
                </button>
            </div>

            {/* Calendar Modal */}
            {showJumpPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setShowJumpPicker(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-xl p-4 mx-4 w-full max-w-xs">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <h3 className="text-lg font-bold">
                                {format(calendarMonth, 'yyyy년 M월')}
                            </h3>
                            <button
                                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                disabled={isFuture(startOfMonth(addMonths(calendarMonth, 1)))}
                            >
                                <ChevronRight className={`w-5 h-5 ${isFuture(startOfMonth(addMonths(calendarMonth, 1))) ? 'text-gray-300' : 'text-gray-600'}`} />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['월', '화', '수', '목', '금', '토', '일'].map(day => (
                                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((date, idx) => {
                                const isToday = isSameDay(date, new Date());
                                const isFutureDate = isFuture(startOfDay(date));
                                const isOtherMonth = !isCalendarCurrentMonth(date);

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => !isFutureDate && jumpToDate(date)}
                                        disabled={isFutureDate}
                                        className={`
                                            aspect-square flex items-center justify-center text-sm rounded-full transition-colors
                                            ${isOtherMonth ? 'text-gray-300' : 'text-gray-700'}
                                            ${isFutureDate ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-100 active:bg-gray-200'}
                                            ${isToday ? 'bg-primary text-white hover:bg-primary/90' : ''}
                                        `}
                                    >
                                        {format(date, 'd')}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setShowJumpPicker(false)}
                            className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>
            )}

            {/* Weekly View */}
            {viewMode === 'weekly' && (
                <>
                    {hasMoreFutureWeeks && (
                        <div className="flex justify-center py-4 px-5 mb-2">
                            <button
                                onClick={loadMoreFutureWeeks}
                                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
                            >
                                다음 주 더보기
                            </button>
                        </div>
                    )}

                    {groupedByWeek.map((week, idx) => (
                        <div key={idx} className="mb-6">
                            <div className="px-5 mb-2">
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-xl font-bold text-foreground">{week.weekLabel}</h3>
                                    <span className="text-sm text-muted-foreground">{week.dateRange}</span>
                                </div>
                            </div>

                            <div className="flex gap-0.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
                                {week.items.map((day, dayIdx) => {
                                    const hasContent = day.contents.length > 0;
                                    const firstContent = hasContent ? day.contents[0] : null;
                                    const hasImage = firstContent?.images && firstContent.images.length > 0;
                                    const isFirst = dayIdx === 0;
                                    const isLast = dayIdx === week.items.length - 1;
                                    const isOnly = isFirst && isLast;
                                    const roundedClass = isOnly ? 'rounded-2xl' : isFirst ? 'rounded-l-2xl' : isLast ? 'rounded-r-2xl' : '';

                                    return (
                                        <div
                                            key={dayIdx}
                                            className="flex-shrink-0 cursor-pointer"
                                            onClick={() => handleDayClick(day.date, day.contents.length, firstContent)}
                                        >
                                            <div
                                                className={`relative w-20 h-28 ${roundedClass} overflow-hidden flex flex-col items-center justify-center`}
                                                style={{
                                                    backgroundImage: hasImage ? `url(${firstContent.images[0]})` : 'none',
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    backgroundColor: '#f5f5f5'
                                                }}
                                            >
                                                {hasImage && <div className="absolute inset-0 bg-black/20" />}
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

                    {contentsWithoutDate.length > 0 && (
                        <div className="mb-6">
                            <div className="px-5 mb-2">
                                <h3 className="text-xl font-bold text-foreground">날짜 미설정</h3>
                            </div>
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
                                                className="relative w-20 h-28 rounded-2xl overflow-hidden flex flex-col items-center justify-center"
                                                style={{
                                                    backgroundImage: hasImage ? `url(${content.images[0]})` : 'none',
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    backgroundColor: '#f5f5f5'
                                                }}
                                            >
                                                {hasImage && <div className="absolute inset-0 bg-black/20" />}
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

                    {hasMorePastWeeks && (
                        <div className="flex justify-center py-4 px-5">
                            <button
                                onClick={loadMorePastWeeks}
                                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
                            >
                                이전 주 더보기
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Monthly View */}
            {viewMode === 'monthly' && (
                <>
                    {hasMoreFutureMonths && (
                        <div className="flex justify-center py-4 px-5 mb-2">
                            <button
                                onClick={loadMoreFutureMonths}
                                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
                            >
                                다음 달 더보기
                            </button>
                        </div>
                    )}

                    {groupedByMonth.map((month, idx) => (
                        <div key={idx} className="mb-6">
                            <div className="px-5 mb-2">
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-xl font-bold text-foreground">{month.monthLabel}</h3>
                                    <span className="text-sm text-muted-foreground">
                                        {month.totalCount > 0 ? `${month.totalCount}개` : ''}
                                    </span>
                                </div>
                            </div>

                            {month.items.length === 0 ? (
                                <div className="px-5 py-8 text-center text-sm text-gray-400">
                                    기록이 없습니다
                                </div>
                            ) : (
                                <div className="flex gap-0.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
                                    {month.items.slice(0, 7).map((day, dayIdx) => {
                                        const showMoreCard = dayIdx === 6 && month.items.length > 7;
                                        const remainingCount = month.items.length - 6;
                                        const firstContent = day.contents[0];
                                        const hasImage = firstContent?.images && firstContent.images.length > 0;
                                        const isFirst = dayIdx === 0;
                                        const displayCount = Math.min(month.items.length, 7);
                                        const isLast = dayIdx === displayCount - 1;
                                        const isOnly = isFirst && isLast;
                                        const roundedClass = isOnly ? 'rounded-2xl' : isFirst ? 'rounded-l-2xl' : isLast ? 'rounded-r-2xl' : '';

                                        if (showMoreCard) {
                                            return (
                                                <div
                                                    key={dayIdx}
                                                    className="flex-shrink-0 cursor-pointer"
                                                    onClick={() => handleMoreClick(month)}
                                                >
                                                    <div
                                                        className={`relative w-20 h-28 ${roundedClass} overflow-hidden flex flex-col items-center justify-center bg-gray-200`}
                                                    >
                                                        <span className="text-2xl font-bold text-gray-600">
                                                            +{remainingCount}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={dayIdx}
                                                className="flex-shrink-0 cursor-pointer"
                                                onClick={() => handleMonthDayClick(day)}
                                            >
                                                <div
                                                    className={`relative w-20 h-28 ${roundedClass} overflow-hidden flex flex-col items-center justify-center`}
                                                    style={{
                                                        backgroundImage: hasImage ? `url(${firstContent.images[0]})` : 'none',
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center',
                                                        backgroundColor: '#f5f5f5'
                                                    }}
                                                >
                                                    {hasImage && <div className="absolute inset-0 bg-black/20" />}
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
                                                    {day.contents.length > 1 && (
                                                        <div className="absolute top-1 right-1 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                                            {day.contents.length}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {hasMorePastMonths && (
                        <div className="flex justify-center py-4 px-5">
                            <button
                                onClick={loadMorePastMonths}
                                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 active:bg-gray-100 transition-colors"
                            >
                                이전 달 더보기
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
