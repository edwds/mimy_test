import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { API_BASE_URL } from '@/lib/api';
import { UserPlus, Heart, MessageCircle, PartyPopper } from 'lucide-react';
import { formatFullDateTime } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { authFetch } from '@/lib/authFetch';
import { ProfileHeader } from '@/components/ProfileHeader';

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
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
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
                return <UserPlus size={16} className="text-white" />;
            case 'like':
                return <Heart size={16} className="text-white" />;
            case 'comment':
                return <MessageCircle size={16} className="text-white" />;
            case 'milestone':
                return <PartyPopper size={16} className="text-white" />;
            default:
                return null;
        }
    };

    const getNotificationText = (notif: Notification) => {
        switch (notif.type) {
            case 'follow':
                return `${notif.actor?.nickname}님이 당신을 팔로우합니다`;
            case 'like':
                return `${notif.actor?.nickname}님이 당신의 ${notif.shop_name} 게시물을 좋아합니다`;
            case 'comment':
                return (
                    <>
                        <span>{notif.actor?.nickname}님이 당신의 {notif.shop_name} 게시물에 댓글을 남겼습니다.</span>
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
            <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
            {/* Header */}
            <ProfileHeader
                title="알림"
                onBack={handleClose}
                isVisible={true}
            />

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ paddingTop: '60px' }}>
                {notifications.length > 0 ? (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className="flex gap-3 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                        >
                            {/* Left: Profile Image + Icon */}
                            <div className="relative flex-shrink-0">
                                {notif.type === 'milestone' ? (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl">
                                        🎉
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border border-gray-100">
                                            {notif.actor?.profile_image ? (
                                                <img
                                                    src={notif.actor.profile_image}
                                                    alt={notif.actor.nickname}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-xl">😊</div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-white">
                                            {getNotificationIcon(notif.type)}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Middle: Text */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 leading-snug break-words mb-1">
                                    {getNotificationText(notif)}
                                </p>
                                <span className="text-[11px] text-gray-400">
                                    {formatFullDateTime(notif.created_at, i18n.language)}
                                </span>
                            </div>

                            {/* Right: Thumbnail (if exists) */}
                            {notif.thumbnail && (
                                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img src={notif.thumbnail} alt="" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center">
                        <p className="text-muted-foreground">알림이 없습니다</p>
                    </div>
                )}
            </div>
        </div>
    );
};
