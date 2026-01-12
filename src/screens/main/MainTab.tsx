import React, { useState } from 'react';
import { Home, Compass, Trophy, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileScreen } from './ProfileScreen';
import { useNavigate } from 'react-router-dom';
import { SelectTypeBottomSheet } from '@/components/SelectTypeBottomSheet';

export const MainTab = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile'); // Default to profile for testing
    const [isWriteSheetOpen, setIsWriteSheetOpen] = useState(false);

    return (
        <div className="flex flex-col h-full bg-background">
            <main className="flex-1 overflow-hidden relative">
                {activeTab === 'home' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 h-full">
                        <div className="text-center space-y-4 animate-in zoom-in-95 duration-500">
                            <h1 className="text-2xl font-bold text-foreground">Welcome to Mimy</h1>
                            <p className="text-muted-foreground">Your personalized gourmet journal awaits.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && <ProfileScreen />}

                {/* Placeholder for other tabs */}
                {(activeTab === 'discover' || activeTab === 'ranking') && (
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

            <SelectTypeBottomSheet
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
                        onClick={() => setActiveTab('home')}
                    />
                    <NavIcon
                        icon={<Compass className="w-6 h-6" />}
                        label="Discover"
                        active={activeTab === 'discover'}
                        onClick={() => setActiveTab('discover')}
                    />
                    <NavIcon
                        icon={<Trophy className="w-6 h-6" />}
                        label="Ranking"
                        active={activeTab === 'ranking'}
                        onClick={() => setActiveTab('ranking')}
                    />
                    <NavIcon
                        icon={<User className="w-6 h-6" />}
                        label="Profile"
                        active={activeTab === 'profile'}
                        onClick={() => setActiveTab('profile')}
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
