
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { resizeImage } from '@/lib/image';
import { API_BASE_URL } from '@/lib/api';

import { useTranslation } from 'react-i18next';

export const EditProfileScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [nickname, setNickname] = useState("");
    const [bio, setBio] = useState("");
    const [link, setLink] = useState("");
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [handle, setHandle] = useState(""); // Needed for API put but not editable here

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bioRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize bio
    useEffect(() => {
        if (bioRef.current) {
            bioRef.current.style.height = 'auto';
            bioRef.current.style.height = `${Math.min(bioRef.current.scrollHeight, 24 * 3 + 20)}px`; // approx 3 lines
        }
    }, [bio]);

    useEffect(() => {
        const fetchUser = async () => {
            const storedId = localStorage.getItem("mimy_user_id");
            if (!storedId) {
                navigate('/login');
                return;
            }
            setUserId(storedId);

            try {
                const response = await fetch(`${API_BASE_URL}/api/users/${storedId}`);
                if (response.ok) {
                    const data = await response.json();
                    setNickname(data.nickname || "");
                    setBio(data.bio || "");
                    setLink(data.link || "");
                    setPhotoUrl(data.profile_image);
                    setHandle(data.account_id);
                }
            } catch (error) {
                console.error("Failed to load user", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [navigate]);

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
        if (!userId) return;
        setSaving(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    account_id: handle, // Required by backend schema logic usually, or just to keep it safe
                    nickname: nickname,
                    bio: bio,
                    link: link,
                    profile_image: photoUrl
                })
            });

            if (response.ok) {
                navigate(-1); // Go back to profile
            } else {
                alert(t('auth.edit.save_failed'));
            }
        } catch (error) {
            console.error("Save failed", error);
            alert(t('auth.edit.save_failed'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="flex flex-col h-full bg-background animate-in slide-in-from-right duration-300">
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
