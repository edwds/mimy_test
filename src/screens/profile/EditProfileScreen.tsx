
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { resizeImage } from '@/lib/image';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';

import { useTranslation } from 'react-i18next';

export const EditProfileScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, refreshUser } = useUser();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State - Initialize from UserContext
    const [nickname, setNickname] = useState(user?.nickname || "");
    const [bio, setBio] = useState(user?.bio || "");
    const [link, setLink] = useState(user?.link || "");
    const [photoUrl, setPhotoUrl] = useState<string | null>(user?.profile_image || null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bioRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize bio
    useEffect(() => {
        if (bioRef.current) {
            bioRef.current.style.height = 'auto';
            bioRef.current.style.height = `${Math.min(bioRef.current.scrollHeight, 24 * 3 + 20)}px`; // approx 3 lines
        }
    }, [bio]);

    // Update form when user data loads
    useEffect(() => {
        if (user) {
            console.log('[EditProfile] User from context:', user.id);
            setNickname(user.nickname || "");
            setBio(user.bio || "");
            setLink(user.link || "");
            setPhotoUrl(user.profile_image || null);
        } else {
            console.error("[EditProfile] No user in context, redirecting to login");
            navigate('/login');
        }
    }, [user, navigate]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const resizedBlob = await resizeImage(file, 1280);
            const formData = new FormData();
            formData.append("file", resizedBlob, file.name);

            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setPhotoUrl(data.url);
            } else {
                alert(t('auth.edit.upload_failed'));
            }
        } catch (err) {
            console.error(err);
            alert(t('auth.edit.upload_failed'));
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.id) {
            console.error('[EditProfile] No user found');
            return;
        }

        console.log('[EditProfile] Starting save...', { userId: user.id, nickname, bio, link });
        setSaving(true);

        try {
            console.log('[EditProfile] Sending PUT request to:', `${API_BASE_URL}/api/users/${user.id}`);
            const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    account_id: user.account_id,
                    nickname: nickname,
                    bio: bio,
                    link: link,
                    profile_image: photoUrl
                })
            });

            console.log('[EditProfile] API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[EditProfile] ✅ Profile updated successfully:', data);

                try {
                    console.log('[EditProfile] Refreshing user context...');
                    await refreshUser(true);
                    console.log('[EditProfile] ✅ User context refreshed');
                } catch (refreshError) {
                    console.error('[EditProfile] ⚠️ Failed to refresh user context:', refreshError);
                    // Continue anyway - the update was successful
                }

                console.log('[EditProfile] Navigating back...');
                navigate(-1);
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[EditProfile] ❌ Save failed:', response.status, errorData);
                alert(t('auth.edit.save_failed') + ': ' + (errorData.error || 'Unknown error'));
            }
        } catch (error) {
            console.error("[EditProfile] ❌ Network error:", error);
            alert(t('auth.edit.save_failed') + ': Network error');
        } finally {
            setSaving(false);
            console.log('[EditProfile] Save process completed');
        }
    };

    if (!user) {
        return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <header
                className="px-4 py-3 flex items-center justify-between border-b border-border bg-background sticky top-0 z-10"
                style={{ paddingTop: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 0.75rem)' : undefined }}
            >
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">{t('auth.edit.title')}</h1>
                <Button
                    variant="ghost"
                    className="text-primary font-semibold hover:bg-primary/10 hover:text-primary"
                    onClick={handleSave}
                    disabled={saving || uploading}
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('auth.edit.done')}
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-6" data-scroll-container="true">

                {/* Image Upload */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        <div
                            className="w-24 h-24 rounded-full bg-muted overflow-hidden cursor-pointer ring-2 ring-border hover:ring-primary transition-all shadow-sm"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {photoUrl ? (
                                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-muted-foreground" />
                                </div>
                            )}

                            {uploading && (
                                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                        <div
                            className="absolute -bottom-1 -right-1 bg-background p-1.5 rounded-full border border-border shadow-sm cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                            }}
                        >
                            <Camera className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                    <button
                        className="mt-3 text-sm text-primary font-medium"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {t('auth.edit.change_photo')}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">{t('auth.edit.nickname_label')}</label>
                        <input
                            type="text"
                            className="w-full border-b border-border py-2 text-lg bg-transparent focus:outline-none focus:border-primary transition-colors"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder={t('auth.edit.nickname_placeholder')}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">{t('auth.edit.bio_label')}</label>
                        <textarea
                            ref={bioRef}
                            className="w-full border-b border-border py-2 text-base bg-transparent focus:outline-none focus:border-primary transition-colors resize-none overflow-hidden"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder={t('auth.edit.bio_placeholder')}
                            rows={1}
                            style={{ minHeight: '40px' }}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">{t('auth.edit.link_label')}</label>
                        <input
                            type="url"
                            className="w-full border-b border-border py-2 text-base bg-transparent focus:outline-none focus:border-primary transition-colors"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder={t('auth.edit.link_placeholder')}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};
