import React, { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';


interface User {
    id: number;
    nickname: string;
    account_id: string;
    profile_image: string | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (users: User[]) => void;
    initialSelected: User[];
    currentUserId: number;
}

export const UserSelectModal: React.FC<Props> = ({ isOpen, onClose, onSelect, initialSelected, currentUserId }) => {
    // const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [connections, setConnections] = useState<User[]>([]);
    const [selected, setSelected] = useState<User[]>(initialSelected);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && currentUserId) {
            fetchConnections();
            setSelected(initialSelected);
        }
    }, [isOpen, currentUserId]);

    const fetchConnections = async () => {
        setIsLoading(true);
        try {
            const [followersRes, followingRes] = await Promise.all([
                fetch(`/api/users/${currentUserId}/followers`),
                fetch(`/api/users/${currentUserId}/following`)
            ]);

            let combined: User[] = [];

            if (followersRes.ok) {
                const followers = await followersRes.json();
                combined = [...combined, ...followers];
            }

            if (followingRes.ok) {
                const following = await followingRes.json();
                combined = [...combined, ...following];
            }

            // Deduplicate by ID
            const uniqueUsers = Array.from(new Map(combined.map(u => [u.id, u])).values());

            setConnections(uniqueUsers);
        } catch (error) {
            console.error("Failed to fetch connections", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (user: User) => {
        if (selected.find(u => u.id === user.id)) {
            setSelected(prev => prev.filter(u => u.id !== user.id));
        } else {
            if (selected.length >= 10) return; // Max 10
            setSelected(prev => [...prev, user]);
        }
    };

    const handleConfirm = () => {
        onSelect(selected);
        onClose();
    };

    const filteredConnections = connections.filter(user =>
        user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.account_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-background rounded-t-[28px] sm:rounded-[28px] h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-background sticky top-0 z-10">
                    <h2 className="text-lg font-bold">
                        Tag People
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                            {selected.length}/10
                        </span>
                    </h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
                        <X size={24} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Count or ID"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-muted/30 border-none h-11 text-base rounded-xl"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8 text-muted-foreground">Loading...</div>
                    ) : filteredConnections.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            {searchTerm ? "No users found" : "No connections yet"}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredConnections.map(user => {
                                const isSelected = selected.some(u => u.id === user.id);
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => handleToggle(user)}
                                        className={cn(
                                            "w-full flex items-center p-3 rounded-xl transition-colors",
                                            isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden mr-3 border border-border/50">
                                            {user.profile_image ? (
                                                <img src={user.profile_image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 font-bold text-xs">
                                                    {user.nickname[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-bold text-foreground text-sm">{user.nickname}</div>
                                            <div className="text-xs text-muted-foreground">@{user.account_id}</div>
                                        </div>
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                            isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                                        )}>
                                            {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-background safe-area-bottom">
                    <Button
                        onClick={handleConfirm}
                        className="w-full h-12 text-lg font-bold rounded-xl"
                    >
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
};
