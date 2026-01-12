
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { resizeImage } from '@/lib/image';
import { API_BASE_URL } from '@/lib/api';

export const EditProfileScreen = () => {
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
                alert("Image upload failed");
            }
        } catch (err) {
            console.error(err);
            alert("Error uploading image");
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
                alert("Failed to save changes");
            }
        } catch (error) {
            console.error("Save failed", error);
            alert("Network error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex-1 flex items-center justify-center">Loading...</div>;

    return (
        <div className="flex flex-col h-full bg-background animate-in slide-in-from-right duration-300">
            {/* Header */}
            <header className="px-4 py-3 flex items-center justify-between border-b border-border">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">Edit Profile</h1>
                <Button
                    variant="ghost"
                    className="text-primary font-semibold hover:bg-primary/10 hover:text-primary"
                    onClick={handleSave}
                    disabled={saving || uploading}
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Done"}
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-6">

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
                        Change Photo
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
                        <label className="text-sm font-medium text-muted-foreground">Nickname</label>
                        <input
                            type="text"
                            className="w-full border-b border-border py-2 text-lg bg-transparent focus:outline-none focus:border-primary transition-colors"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Display Name"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Bio</label>
                        <textarea
                            className="w-full border-b border-border py-2 text-base bg-transparent focus:outline-none focus:border-primary transition-colors resize-none min-h-[80px]"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Introduce yourself..."
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Link</label>
                        <input
                            type="url"
                            className="w-full border-b border-border py-2 text-base bg-transparent focus:outline-none focus:border-primary transition-colors"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="https://website.com"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};
