import React, { useState, useEffect } from 'react';
import { Home, Compass, Trophy, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfileScreen } from '@/screens/profile/UserProfileScreen';
import { ProfileScreen } from './ProfileScreen';
import { SelectTypeStep } from '@/screens/write/SelectTypeStep';
import { DiscoveryTab } from '@/screens/main/DiscoveryTab';
import { HomeTab } from './HomeTab';
import { LeaderboardTab } from './LeaderboardTab';

const TAB_ORDER = ['home', 'discover', 'ranking', 'profile'];

export const MainTab = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('home');
    const [isWriteSheetOpen, setIsWriteSheetOpen] = useState(false);
    const [refreshTriggers, setRefreshTriggers] = useState({
        home: 0,
        discover: 0,
        profile: 0,
        ranking: 0 // placeholder
    });
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

    // Sync URL -> Tab
    useEffect(() => {
        const path = location.pathname;
        if (path.includes('/main/profile')) setActiveTab('profile');
        else if (path.includes('/main/ranking')) setActiveTab('ranking');
        else if (path.includes('/main/discover')) setActiveTab('discover');
        else setActiveTab('home');
    }, [location.pathname]);

    const handleTabClick = (tab: string) => {
        if (activeTab === tab) {
            setRefreshTriggers(prev => ({ ...prev, [tab]: Date.now() }));
        } else {
            const currentIndex = TAB_ORDER.indexOf(activeTab);
            const newIndex = TAB_ORDER.indexOf(tab);
            setSlideDirection(newIndex > currentIndex ? 'right' : 'left');
            // setActiveTab(tab); // Handled by useEffect

            // Navigate to URL
            if (tab === 'home') navigate('/main');
            else navigate(`/main/${tab}`);
        }
    };

    const getAnimationClass = () => {
        return `animate-in duration-50 ${slideDirection === 'right' ? 'slide-in-from-right-2' : 'slide-in-from-left-2'}`;
    };

    // Loading Optimization
    const [allowedTabs, setAllowedTabs] = useState<Set<string>>(() => new Set([activeTab]));

    useEffect(() => {
        // Ensure active tab is always allowed immediately
        setAllowedTabs(prev => {
            if (prev.has(activeTab)) return prev;
            const next = new Set(prev);
            next.add(activeTab);
            return next;
        });
    }, [activeTab]);

    useEffect(() => {
        // Staggered loading sequence: Feed -> Profile -> Discovery -> Leaderboard
        // Only load if not already allowed (which activeTab handles)
        const sequence = ['home', 'profile', 'discover', 'ranking'];
        let timeoutIds: NodeJS.Timeout[] = [];
        let cumDelay = 500; // Start bg loading after 500ms

        sequence.forEach(tab => {
            const id = setTimeout(() => {
                setAllowedTabs(prev => {
                    if (prev.has(tab)) return prev;
                    const next = new Set(prev);
                    next.add(tab);
                    return next;
                });
            }, cumDelay);
            timeoutIds.push(id);
            cumDelay += 800; // 800ms spacing
        });

        return () => timeoutIds.forEach(clearTimeout);
    }, []);

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <main className="flex-1 overflow-hidden relative min-h-0">
                {/* Stacked Screen: User Profile via Query Param */}
                {(() => {
                    const searchParams = new URLSearchParams(location.search);
                    const viewUserId = searchParams.get('viewUser');

                    if (viewUserId) {
                        return (
                            <div className="absolute inset-0 z-50 bg-background animate-in slide-in-from-right duration-200">
                                <UserProfileScreen userId={viewUserId} />
                            </div>
                        );
                    }
                    return null;
                })()}

                <div className={cn("h-full w-full", activeTab === 'home' ? `block ${getAnimationClass()}` : 'hidden')}>
                    <HomeTab
                        onWrite={() => setIsWriteSheetOpen(true)}
                        refreshTrigger={refreshTriggers.home}
                        isEnabled={allowedTabs.has('home')}
                    />
                </div>
                <div className={cn("h-full w-full", activeTab === 'discover' ? `block ${getAnimationClass()}` : 'hidden')}>
                    <DiscoveryTab
                        isActive={activeTab === 'discover'}
                        refreshTrigger={refreshTriggers.discover}
                        isEnabled={allowedTabs.has('discover')}
                    />
                </div>
                <div className={cn("h-full w-full", activeTab === 'profile' ? `block ${getAnimationClass()}` : 'hidden')}>
                    <ProfileScreen
                        refreshTrigger={refreshTriggers.profile}
                        isEnabled={allowedTabs.has('profile')}
                    />
                </div>

                {/* Placeholder for other tabs */}
                <div className={cn("h-full w-full", activeTab === 'ranking' ? `block ${getAnimationClass()}` : 'hidden')}>
                    <LeaderboardTab isEnabled={allowedTabs.has('ranking')} />
                </div>
            </main>

            {/* Floating Action Button */}
            <button
                onClick={() => setIsWriteSheetOpen(true)}
                className="absolute bottom-24 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50 focus:outline-none"
                aria-label="Write Review"
            >
                <Plus className="w-8 h-8" />
            </button>

            <SelectTypeStep
                isOpen={isWriteSheetOpen}
                onClose={() => setIsWriteSheetOpen(false)}
                onSelect={(type) => {
                    setIsWriteSheetOpen(false);
                    navigate(`/write?type=${type}`);
                }}
            />

            {/* Bottom Navigation */}
            <nav className="border-t border-border bg-card/80 backdrop-blur-lg pb-6 shrink-0">
                <div className="flex justify-around items-center h-16">
                    <NavIcon
                        icon={<Home className="w-6 h-6" />}
                        label="홈"
                        active={activeTab === 'home'}
                        onClick={() => handleTabClick('home')}
                    />
                    <NavIcon
                        icon={<Compass className="w-6 h-6" />}
                        label="탐색"
                        active={activeTab === 'discover'}
                        onClick={() => handleTabClick('discover')}
                    />
                    <NavIcon
                        icon={<Trophy className="w-6 h-6" />}
                        label="순위"
                        active={activeTab === 'ranking'}
                        onClick={() => handleTabClick('ranking')}
                    />
                    <NavIcon
                        icon={<User className="w-6 h-6" />}
                        label="프로필"
                        active={activeTab === 'profile'}
                        onClick={() => handleTabClick('profile')}
                    />
                </div>
            </nav>
        </div>
    );
};

const NavIcon = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
            active ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
        )}>
        {icon}
        <span className={cn("text-xs font-base transition-all", active ? "font-bold" : "")}>{label}</span>
    </button>
);
