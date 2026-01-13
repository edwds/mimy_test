
import { useState, useEffect, useRef } from 'react';
import { MapPin, Link as LinkIcon, Edit2, Grid, List, Settings, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { ContentCard } from '@/components/ContentCard';
import { ShopCard } from '@/components/ShopCard';

// Type definition (move to types/index.ts later)
interface User {
    id: number;
    nickname: string | null;
    account_id: string;
    profile_image: string | null;
    bio: string | null;
    link: string | null;
    // New fields from backend join
    cluster_name?: string;
    cluster_tagline?: string;
    stats?: {
        content_count: number;
        follower_count: number;
        following_count: number;
    };
}

type ProfileTabType = "content" | "list" | "saved";

export const ProfileScreen = () => {
    // ... (rest of component)
    // ...
    // ...
    // ...
    <div className="flex gap-4 mb-4">
        <div className="flex items-baseline gap-1">
            <span className="font-bold">{user.stats?.content_count || 0}</span>
            <span className="text-xs text-muted-foreground">Contents</span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="font-bold">{user.stats?.follower_count || 0}</span>
            <span className="text-xs text-muted-foreground">Followers</span>
        </div>
    </div>

    {/* Bio & Link */ }
    { user.bio && <p className="text-sm whitespace-pre-wrap mb-2 line-clamp-3">{user.bio}</p> }
    {
        user.link && (
            <a href={user.link} target="_blank" rel="noreferrer" className="flex items-center text-xs text-primary hover:underline">
                <LinkIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate max-w-[200px]">
                    {user.link.replace(/^(https?:\/\/)?(www\.)?/, '')}
                </span>
            </a>
        )
    }
                        </div >

    {/* Right: Image & Edit from previous step */ }
    < div
className = "relative group cursor-pointer flex-shrink-0 ml-4"
onClick = {() => navigate('/profile/edit')}
                        >
                            <div className="w-20 h-20 rounded-full bg-muted border-2 border-background shadow-sm overflow-hidden flex items-center justify-center">
                                {user.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">😊</div>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-background border-2 border-background shadow-md"
                            >
                                <Edit2 className="w-3 h-3" />
                            </Button>
                        </div >
                    </div >

    {/* Taste Card Area */ }
{
    user.cluster_name ? (
        <div className="bg-surface border border-border rounded-xl p-4 mb-2 shadow-sm relative overflow-hidden">
            <div className="text-xl font-bold mb-1">{user.cluster_name}</div>
            <p className="text-sm text-muted-foreground">{user.cluster_tagline}</p>
        </div>
    ) : (
    <div className="bg-muted/30 border border-dashed border-border rounded-xl p-4 mb-6 text-center cursor-pointer" onClick={() => navigate('/quiz/intro')}>
        <p className="text-sm text-muted-foreground">Discover your taste profile +</p>
    </div>
)
}
                </div >

    {/* Tabs Static Header (In Flow) */ }
    < div ref = { staticTabsRef } className = "p-6 bg-background py-2" >
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <TabButton
                active={activeTab === "content"}
                onClick={() => handleTabChange("content")}
                label="Content"
            />
            <TabButton
                active={activeTab === "list"}
                onClick={() => handleTabChange("list")}
                label="List"
            />
            <TabButton
                active={activeTab === "saved"}
                onClick={() => handleTabChange("saved")}
                label="Want to go"
            />
        </div>
                </div >

    {/* Tab Content */ }
    < div className = "min-h-[300px] bg-muted/5" >
        { activeTab === "content" && (
            <div className="pb-20">
                {/* Real Data Render */}
                {contents.map((content: any) => (
                    <ContentCard
                        key={content.id}
                        user={{
                            nickname: user.nickname || "User",
                            account_id: user.account_id,
                            profile_image: user.profile_image
                        }}
                        content={content}
                    />
                ))}

                {/* If empty */}
                {!loadingContent && contents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Grid className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">No contents yet</p>
                    </div>
                )}

                {loadingContent && (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
        )}
{
    activeTab === "list" && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <List className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">No lists created</p>
        </div>
    )
}
{
    activeTab === "saved" && (
        <div className="pb-20 px-5 pt-4">
            {savedShops.map((shop: any) => (
                <ShopCard
                    key={shop.id}
                    shop={shop}
                    onSave={() => handleUnsave(shop.id)}
                // onWrite, onReserve handled by generic alert or nav if needed
                />
            ))}

            {!loadingSaved && savedShops.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <MapPin className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm">No saved places</p>
                </div>
            )}

            {loadingSaved && (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    )
}
                </div >
            </main >

    {/* Bottom Sheet for ID Change */ }
{
    isIdSheetOpen && (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
                onClick={() => setIsIdSheetOpen(false)}
            />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-xl z-50 p-6 animate-in slide-in-from-bottom duration-300 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Change ID</h3>
                    <button onClick={() => setIsIdSheetOpen(false)} className="p-2 -mr-2 text-muted-foreground">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">New ID</label>
                        <input
                            type="text"
                            value={newId}
                            onChange={(e) => setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                            className="w-full border-b border-border py-2 text-xl bg-transparent focus:outline-none focus:border-primary font-mono"
                            autoFocus
                            placeholder="your_id"
                        />
                        <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, dots, and underscores.</p>
                    </div>

                    <Button
                        className="w-full h-12 text-lg mt-4"
                        onClick={handleSaveId}
                        disabled={savingId || !newId || newId === user.account_id}
                    >
                        {savingId ? <Loader2 className="animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </div>
        </>
    )
}
        </div >
    );
};

const TabButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
    >
        {label}
    </button>
);
