import { useState, useMemo } from 'react';
import { format, getYear, getMonth, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isFuture, startOfDay, subMonths, addMonths, addDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectDate: (date: Date) => void;
    initialDate?: Date;
    minYear?: number;
    maxYear?: number;
}

type PickerMode = 'calendar' | 'year' | 'month';

export const DatePickerModal = ({
    isOpen,
    onClose,
    onSelectDate,
    initialDate = new Date(),
    minYear = getYear(new Date()) - 11,
    maxYear = getYear(new Date())
}: DatePickerModalProps) => {
    const [calendarMonth, setCalendarMonth] = useState(initialDate);
    const [pickerMode, setPickerMode] = useState<PickerMode>('calendar');

    const calendarDays = useMemo(() => {
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

    const handleClose = () => {
        setPickerMode('calendar');
        onClose();
    };

    const handleDateSelect = (date: Date) => {
        onSelectDate(date);
        handleClose();
    };

    const years = useMemo(() => {
        const result: number[] = [];
        for (let y = maxYear; y >= minYear; y--) {
            result.push(y);
        }
        return result;
    }, [minYear, maxYear]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={handleClose}
            />
            <div className="relative bg-white rounded-2xl shadow-xl p-4 mx-4 w-full max-w-xs">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>

                    {/* Year/Month Title - Clickable */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPickerMode(pickerMode === 'year' ? 'calendar' : 'year')}
                            className={`px-2 py-1 text-lg font-bold rounded-lg transition-colors ${pickerMode === 'year' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'}`}
                        >
                            {format(calendarMonth, 'yyyy')}년
                        </button>
                        <button
                            onClick={() => setPickerMode(pickerMode === 'month' ? 'calendar' : 'month')}
                            className={`px-2 py-1 text-lg font-bold rounded-lg transition-colors ${pickerMode === 'month' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'}`}
                        >
                            {format(calendarMonth, 'M')}월
                        </button>
                    </div>

                    {/* Navigation arrows - only show in calendar mode */}
                    {pickerMode === 'calendar' ? (
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <button
                                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                disabled={isFuture(startOfMonth(addMonths(calendarMonth, 1)))}
                            >
                                <ChevronRight className={`w-5 h-5 ${isFuture(startOfMonth(addMonths(calendarMonth, 1))) ? 'text-gray-300' : 'text-gray-600'}`} />
                            </button>
                        </div>
                    ) : (
                        <div className="w-[68px]" /> // Spacer to maintain layout
                    )}
                </div>

                {/* Year Picker */}
                {pickerMode === 'year' && (
                    <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
                        {years.map(year => {
                            const isSelected = year === getYear(calendarMonth);
                            const isCurrent = year === getYear(new Date());
                            return (
                                <button
                                    key={year}
                                    onClick={() => {
                                        setCalendarMonth(new Date(year, getMonth(calendarMonth), 1));
                                        setPickerMode('calendar');
                                    }}
                                    className={`
                                        py-3 text-sm font-medium rounded-xl transition-colors
                                        ${isSelected ? 'bg-primary text-white' : isCurrent ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-gray-700'}
                                    `}
                                >
                                    {year}년
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Month Picker */}
                {pickerMode === 'month' && (
                    <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 12 }, (_, i) => {
                            const month = i;
                            const targetDate = new Date(getYear(calendarMonth), month, 1);
                            const isSelected = month === getMonth(calendarMonth);
                            const isCurrent = month === getMonth(new Date()) && getYear(calendarMonth) === getYear(new Date());
                            const isFutureMonth = isFuture(startOfMonth(targetDate));
                            return (
                                <button
                                    key={month}
                                    onClick={() => {
                                        if (!isFutureMonth) {
                                            setCalendarMonth(targetDate);
                                            setPickerMode('calendar');
                                        }
                                    }}
                                    disabled={isFutureMonth}
                                    className={`
                                        py-3 text-sm font-medium rounded-xl transition-colors
                                        ${isFutureMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                                        ${isSelected && !isFutureMonth ? 'bg-primary text-white' : isCurrent && !isFutureMonth ? 'bg-primary/10 text-primary' : !isFutureMonth ? 'hover:bg-gray-100 text-gray-700' : ''}
                                    `}
                                >
                                    {month + 1}월
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Calendar View */}
                {pickerMode === 'calendar' && (
                    <>
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
                                        onClick={() => !isFutureDate && handleDateSelect(date)}
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
                    </>
                )}
            </div>
        </div>
    );
};
