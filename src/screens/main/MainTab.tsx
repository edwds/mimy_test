
import React, { useState } from 'react';
import { Home, Compass, Trophy, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileScreen } from './ProfileScreen';
import { useNavigate } from 'react-router-dom';
import { SelectTypeStep } from '@/screens/write/SelectTypeStep';
import { DiscoveryTab } from '@/screens/main/DiscoveryTab';
import { HomeTab } from './HomeTab';

export const MainTab = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');
    const [isWriteSheetOpen, setIsWriteSheetOpen] = useState(false);
    const [refreshTriggers, setRefreshTriggers] = useState({
        home: 0,
        discover: 0,
        profile: 0,
        ranking: 0 // placeholder
    });

    const handleTabClick = (tab: string) => {
        if (activeTab === tab) {
            // Double tap - trigger refresh
            setRefreshTriggers(prev => ({ ...prev, [tab]: Date.now() }));
        } else {
            setActiveTab(tab);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <main className="flex-1 overflow-hidden relative min-h-0">
                <div className={cn("h-full w-full", activeTab === 'home' ? 'block' : 'hidden')}>
                    <HomeTab
                        onWrite={() => setIsWriteSheetOpen(true)}
                        refreshTrigger={refreshTriggers.home}
                    />
                </div>
                <div className={cn("h-full w-full", activeTab === 'discover' ? 'block' : 'hidden')}>
                    <DiscoveryTab
                        refreshTrigger={refreshTriggers.discover}
                    />
                </div>
                <div className={cn("h-full w-full", activeTab === 'profile' ? 'block' : 'hidden')}>
                    <ProfileScreen
                        refreshTrigger={refreshTriggers.profile}
                    />
                </div>

                {/* Placeholder for other tabs */}
                {(activeTab === 'ranking') && (
                    <div className="flex-1 flex items-center justify-center h-full text-muted-foreground">
                        Coming Soon
                    </div>
                )}
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
            <nav className="border-t border-border bg-card/80 backdrop-blur-lg pb-4 shrink-0">
                <div className="flex justify-around items-center h-16">
                    <NavIcon
                        icon={<Home className="w-6 h-6" />}
                        label="Home"
                        active={activeTab === 'home'}
                        onClick={() => handleTabClick('home')}
                    />
                    <NavIcon
                        icon={<Compass className="w-6 h-6" />}
                        label="Discover"
                        active={activeTab === 'discover'}
                        onClick={() => handleTabClick('discover')}
                    />
                    <NavIcon
                        icon={<Trophy className="w-6 h-6" />}
                        label="Ranking"
                        active={activeTab === 'ranking'}
                        onClick={() => handleTabClick('ranking')}
                    />
                    <NavIcon
                        icon={<User className="w-6 h-6" />}
                        label="Profile"
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
        <span className={cn("text-[10px] font-medium transition-all", active ? "font-bold" : "")}>{label}</span>
    </button>
);
