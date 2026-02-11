import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { API_BASE_URL } from '@/lib/api';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { authFetch } from '@/lib/authFetch';
import { ContentCard } from '@/components/ContentCard';

export const ContentListScreen = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const startDate = searchParams.get('date'); // Starting date (e.g., 2024-02-11)
    const { user } = useUser();

    const [contents, setContents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentBeforeDate, setCurrentBeforeDate] = useState<string | null>(startDate);

    const containerRef = useRef<HTMLDivElement>(null);

    const fetchContents = useCallback(async (beforeDate: string | null, isInitial: boolean) => {
        if (!user?.id) return;

        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const params = new URLSearchParams({
                user_id: user.id.toString(),
                limit: '20'
            });

            if (beforeDate) {
                params.append('beforeDate', beforeDate);
            }

            const res = await authFetch(`${API_BASE_URL}/api/content/user/${user.id}?${params}`);
            const data = await res.json();

            if (data.length < 20) {
                setHasMore(false);
            }

            if (isInitial) {
                setContents(data);
            } else {
                setContents(prev => [...prev, ...data]);
            }

            // Update the next beforeDate based on the oldest content's visit_date
            if (data.length > 0) {
                const oldestContent = data[data.length - 1];
                const oldestDate = oldestContent.review_prop?.visit_date;
                if (oldestDate) {
                    // Set to the day before the oldest date to avoid duplicates
                    const nextDate = format(subDays(new Date(oldestDate), 1), 'yyyy-MM-dd');
                    setCurrentBeforeDate(nextDate);
                } else {
                    setHasMore(false);
                }
            }
        } catch (error) {
            console.error('Failed to fetch contents:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchContents(startDate, true);
    }, [startDate, fetchContents]);

    const handleScroll = () => {
        if (!containerRef.current || loadingMore || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (scrollHeight - scrollTop <= clientHeight + 300) {
            fetchContents(currentBeforeDate, false);
        }
    };

    const getHeaderTitle = () => {
        if (!startDate) return '내 기록';
        try {
            const date = new Date(startDate);
            return format(date, 'M월 d일') + ' 기록';
        } catch {
            return '내 기록';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-background">
                <header className="sticky top-0 z-20 bg-background border-b border-border/50">
                    <div className="flex items-center h-14 px-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 hover:bg-muted rounded-full"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h1 className="ml-2 text-lg font-semibold">{getHeaderTitle()}</h1>
                    </div>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background border-b border-border/50">
                <div className="flex items-center h-14 px-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 hover:bg-muted rounded-full"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="ml-2 text-lg font-semibold">{getHeaderTitle()}</h1>
                </div>
            </header>

            {/* Content List */}
            <main
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                onScroll={handleScroll}
            >
                {contents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-sm text-muted-foreground">기록이 없습니다</p>
                    </div>
                ) : (
                    <div className="pb-20">
                        {contents.map((content: any) => (
                            <div key={content.id} className="mb-4">
                                <ContentCard
                                    user={{
                                        id: user!.id,
                                        nickname: user!.nickname || 'User',
                                        account_id: user!.account_id,
                                        profile_image: user!.profile_image,
                                    }}
                                    content={content}
                                    showActions={true}
                                />
                            </div>
                        ))}

                        {loadingMore && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {!hasMore && contents.length > 0 && (
                            <div className="flex justify-center py-8">
                                <p className="text-sm text-muted-foreground">모든 기록을 불러왔습니다</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
