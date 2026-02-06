import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { API_BASE_URL } from '@/lib/api';
import { UserPlus, Heart, MessageCircle, PartyPopper } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { authFetch } from '@/lib/authFetch';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Capacitor } from '@capacitor/core';

interface Notification {
    id: number;
    type: 'follow' | 'like' | 'comment' | 'milestone';
    actor: {
        id: number;
        nickname: string;
        profile_image: string | null;
        account_id: string;
    } | null;
    content_id: number | null;
    comment_id: number | null;
    comment_preview: string | null;
    thumbnail: string | null;
    shop_name: string | null;
    metadata: any;
    is_read: boolean;
    created_at: string;
}

export const NotificationScreen = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useUser();
    const { i18n } = useTranslation();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [followingStatus, setFollowingStatus] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (currentUser?.id) {
            fetchNotifications();
            // 로컬 스토리지에 마지막 확인 시간 저장
            localStorage.setItem('lastNotificationCheck', new Date().toISOString());
        }
    }, [currentUser?.id]);

    const fetchNotifications = async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/notifications?user_id=${currentUser!.id}&page=1&limit=50`);
            const data = await res.json();
            setNotifications(data);

            // 팔로우 알림의 팔로우 상태 확인
            const followNotifs = data.filter((n: Notification) => n.type === 'follow' && n.actor?.id);
            if (followNotifs.length > 0) {
                const actorIds = followNotifs.map((n: Notification) => n.actor!.id);
                await checkFollowingStatus(actorIds);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkFollowingStatus = async (actorIds: number[]) => {
        try {
            const statusMap: Record<number, boolean> = {};

            // 각 actor에 대해 팔로우 상태 확인
            await Promise.all(
                actorIds.map(async (actorId) => {
                    const res = await authFetch(`${API_BASE_URL}/api/users/${actorId}`);
                    const userData = await res.json();
                    statusMap[actorId] = userData.isFollowing || false;
                })
            );

            setFollowingStatus(statusMap);
        } catch (error) {
            console.error('Failed to check following status:', error);
        }
    };

    const handleFollow = async (actorId: number, currentlyFollowing: boolean) => {
        try {
            await authFetch(`${API_BASE_URL}/api/users/${actorId}/follow`, {
                method: 'POST',
            });

            // 상태 업데이트
            setFollowingStatus(prev => ({
                ...prev,
                [actorId]: currentlyFollowing
            }));
        } catch (error) {
            console.error('Failed to toggle follow:', error);
        }
    };

    const handleNotificationClick = (notif: Notification) => {
        if (notif.type === 'follow') {
            // 프로필 스크린으로 이동
            navigate(`/main?viewUser=${notif.actor?.account_id}`);
        } else if (notif.type === 'like' || notif.type === 'comment') {
            // 콘텐츠 디테일 스크린으로 이동
            if (notif.content_id) {
                navigate(`/content/detail?contentId=${notif.content_id}`);
            }
        } else if (notif.type === 'milestone') {
            // 프로필 > 리스트 탭으로 이동
            navigate('/main/profile?tab=lists');
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'follow':
                return <UserPlus size={20} className="text-blue-500" />;
            case 'like':
                return <Heart size={20} className="text-red-500 fill-red-500" />;
            case 'comment':
                return <MessageCircle size={20} className="text-green-500" />;
            case 'milestone':
                return <PartyPopper size={20} className="text-orange-500" />;
            default:
                return null;
        }
    };

    const getNotificationText = (notif: Notification) => {
        switch (notif.type) {
            case 'follow':
                return `${notif.actor?.nickname}님이 당신을 팔로우합니다`;
            case 'like':
                return `${notif.actor?.nickname}님이 당신의 ${notif.shop_name || '게시물'}을 좋아합니다`;
            case 'comment':
                return (
                    <>
                        <span>{notif.actor?.nickname}님이 당신의 {notif.shop_name || '게시물'}에 댓글을 남겼습니다.</span>
                        {notif.comment_preview && (
                            <>
                                <br />
                                <span className="text-gray-500">"{notif.comment_preview}"</span>
                            </>
                        )}
                    </>
                );
            case 'milestone':
                return '축하합니다! 30개 이상의 랭킹을 남겼네요';
            default:
                return '';
        }
    };

    const handleClose = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="absolute inset-0 bg-background flex items-center justify-center z-50">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-background z-50 flex flex-col">
            {/* Header */}
            <ProfileHeader
                title="알림"
                onBack={handleClose}
                isVisible={true}
            />

            {/* Notifications List */}
            <div
                className="flex-1 overflow-y-auto"
                style={{
                    paddingTop: Capacitor.isNativePlatform()
                        ? 'calc(env(safe-area-inset-top) + 60px)'
                        : '60px'
                }}
                data-scroll-container="true"
            >
                {notifications.length > 0 ? (
                    <>
                        {/* 새로운 알림 (읽지 않음) */}
                        {notifications.filter(n => !n.is_read).length > 0 && (
                            <div>
                                <div className="px-4 py-2 bg-gray-50">
                                    <h2 className="text-xs font-semibold text-gray-500">새로운 알림</h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {notifications.filter(n => !n.is_read).map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => notif.type !== 'follow' && handleNotificationClick(notif)}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors bg-blue-50/30"
                                        >
                                            {/* Left: Profile Image + Icon */}
                                            <div
                                                className="relative flex-shrink-0"
                                                onClick={() => notif.type === 'follow' && handleNotificationClick(notif)}
                                            >
                                                {notif.type === 'milestone' ? (
                                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xl">
                                                        🎉
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                                                            {notif.actor?.profile_image ? (
                                                                <img
                                                                    src={notif.actor.profile_image}
                                                                    alt={notif.actor.nickname}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-lg">😊</div>
                                                            )}
                                                        </div>
                                                        {notif.type !== 'follow' && (
                                                            <div className="absolute -bottom-1 -right-1">
                                                                {getNotificationIcon(notif.type)}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Middle: Text */}
                                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                                <p className="text-sm text-gray-900 leading-snug break-words">
                                                    {getNotificationText(notif)}
                                                </p>
                                                <span className="text-[11px] text-gray-400">
                                                    {formatRelativeTime(notif.created_at, i18n.language)}
                                                </span>
                                            </div>

                                            {/* Right: Follow Button or Thumbnail */}
                                            {notif.type === 'follow' && notif.actor?.id ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFollow(notif.actor!.id, !followingStatus[notif.actor!.id]);
                                                    }}
                                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                                                        !followingStatus[notif.actor.id]
                                                            ? 'bg-white text-gray-900 border border-gray-900 hover:bg-gray-50'
                                                            : 'bg-primary text-white hover:bg-primary/90'
                                                    }`}
                                                >
                                                    {!followingStatus[notif.actor.id] ? '팔로잉' : '맞팔로우'}
                                                </button>
                                            ) : notif.thumbnail ? (
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    <img src={notif.thumbnail} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 지난 알림 (읽음) */}
                        {notifications.filter(n => n.is_read).length > 0 && (
                            <div>
                                <div className="px-4 py-2 bg-gray-50">
                                    <h2 className="text-xs font-semibold text-gray-500">지난 알림</h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {notifications.filter(n => n.is_read).map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => notif.type !== 'follow' && handleNotificationClick(notif)}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                                        >
                                            {/* Left: Profile Image + Icon */}
                                            <div
                                                className="relative flex-shrink-0"
                                                onClick={() => notif.type === 'follow' && handleNotificationClick(notif)}
                                            >
                                                {notif.type === 'milestone' ? (
                                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xl">
                                                        🎉
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                                                            {notif.actor?.profile_image ? (
                                                                <img
                                                                    src={notif.actor.profile_image}
                                                                    alt={notif.actor.nickname}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-lg">😊</div>
                                                            )}
                                                        </div>
                                                        {notif.type !== 'follow' && (
                                                            <div className="absolute -bottom-1 -right-1">
                                                                {getNotificationIcon(notif.type)}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Middle: Text */}
                                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                                <p className="text-sm text-gray-900 leading-snug break-words">
                                                    {getNotificationText(notif)}
                                                </p>
                                                <span className="text-[11px] text-gray-400">
                                                    {formatRelativeTime(notif.created_at, i18n.language)}
                                                </span>
                                            </div>

                                            {/* Right: Follow Button or Thumbnail */}
                                            {notif.type === 'follow' && notif.actor?.id ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFollow(notif.actor!.id, !followingStatus[notif.actor!.id]);
                                                    }}
                                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                                                        !followingStatus[notif.actor.id]
                                                            ? 'bg-white text-gray-900 border border-gray-900 hover:bg-gray-50'
                                                            : 'bg-primary text-white hover:bg-primary/90'
                                                    }`}
                                                >
                                                    {!followingStatus[notif.actor.id] ? '팔로잉' : '맞팔로우'}
                                                </button>
                                            ) : notif.thumbnail ? (
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    <img src={notif.thumbnail} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-20 text-center">
                        <p className="text-muted-foreground">알림이 없습니다</p>
                    </div>
                )}
            </div>
        </div>
    );
};
