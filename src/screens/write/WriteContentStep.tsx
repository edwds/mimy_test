import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, X, ChevronLeft, MapPin, Utensils, Smile, Meh, Frown, Users, UserPlus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ImageEditModal } from './ImageEditModal';
import { UserSelectModal } from './UserSelectModal';

interface Props {
    onNext: (content: { text: string; images: string[]; companions?: any[]; keywords?: string[] }) => void;
    onBack: () => void;
    mode: 'review' | 'post';
    shop?: any;
    satisfaction?: string;
}

export const WriteContentStep: React.FC<Props> = ({ onNext, onBack, mode, shop, satisfaction }) => {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [keywordInput, setKeywordInput] = useState('');

    // User Tagging State
    const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const currentUserId = Number(localStorage.getItem("mimy_user_id") || 0);

    // New Image Edit States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setPendingFiles(files);
        setIsEditModalOpen(true);
        e.target.value = '';
    };

    const handleUploadComplete = (newUrls: string[]) => {
        setImages(prev => [...prev, ...newUrls]);
        setPendingFiles([]);
        setIsEditModalOpen(false);
    };

    const handleSubmit = () => {
        onNext({
            text,
            images,
            companions: selectedUsers.map(u => u.id),
            keywords
        });
    };

    const handleAddKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && keywordInput.trim()) {
            if (!keywords.includes(keywordInput.trim())) {
                setKeywords([...keywords, keywordInput.trim()]);
            }
            setKeywordInput('');
        }
    };

    const getSatisfactionIcon = () => {
        switch (satisfaction) {
            case 'good': return <Smile className="w-5 h-5 text-teal-500" />;
            case 'ok': return <Meh className="w-5 h-5 text-orange-500" />;
            case 'bad': return <Frown className="w-5 h-5 text-rose-500" />;
            default: return null;
        }
    };

    const getSatisfactionLabel = () => {
        switch (satisfaction) {
            case 'good': return t('write.basic.good');
            case 'ok': return t('write.basic.ok');
            case 'bad': return t('write.basic.bad');
            default: return '';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            <ImageEditModal
                files={pendingFiles}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUploadComplete={handleUploadComplete}
            />

            <UserSelectModal
                isOpen={isUserSelectOpen}
                onClose={() => setIsUserSelectOpen(false)}
                onSelect={setSelectedUsers}
                initialSelected={selectedUsers}
                currentUserId={currentUserId}
            />

            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10 transition-colors border-b">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="font-bold text-lg text-foreground">
                    {mode === 'review' ? t('write.content.title_review') : t('write.content.title_post')}
                </div>
                <Button
                    onClick={handleSubmit}
                    disabled={mode === 'review' ? (!text.trim() && images.length === 0) : (!text.trim())}
                    className={cn(
                        "rounded-full px-4 font-bold transition-all",
                        (mode === 'review' ? (text.trim() || images.length > 0) : text.trim())
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground"
                    )}
                >
                    {t('write.content.done')}
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Content Area */}
                <div className="p-6 space-y-8">

                    {/* Mode Specific: Review - POI Info */}
                    {mode === 'review' && shop && (
                        <div className="space-y-6">
                            {/* POI Card */}
                            <div className="flex gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                                <div className="w-20 h-20 rounded-xl bg-muted flex-shrink-0 overflow-hidden relative">
                                    {shop.thumbnail_img ? (
                                        <img src={shop.thumbnail_img} alt={shop.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <Utensils className="w-8 h-8 opacity-50" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h3 className="font-bold text-lg truncate mb-1">{shop.name}</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg">
                                            {getSatisfactionIcon()}
                                            <span className="text-xs font-bold">{getSatisfactionLabel()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate">{shop.address_region || shop.address_full}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mode Specific: Post - Keywords */}
                    {mode === 'post' && (
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Keywords</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {keywords.map((k, i) => (
                                    <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold flex items-center gap-1">
                                        #{k}
                                        <button onClick={() => setKeywords(keywords.filter((_, idx) => idx !== i))} className="hover:text-primary/70">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <Input
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={handleAddKeyword}
                                placeholder="Add keywords (Press Enter)"
                                className="bg-muted/30 border-transparent focus:bg-background"
                            />
                        </div>
                    )}

                    {/* Common: Main Text */}
                    <div className="space-y-2">
                        <Textarea
                            className="min-h-[150px] text-lg bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-muted-foreground/50 resize-none leading-relaxed"
                            placeholder={mode === 'review'
                                ? t('write.content.placeholder_review')
                                : t('write.content.placeholder_post')}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </div>

                    {/* Use Review: Mentions */}
                    {mode === 'review' && (
                        <div className="space-y-2 pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between text-base text-foreground font-semibold mb-2">
                                <span className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    With who?
                                </span>
                                {selectedUsers.length > 0 && (
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {selectedUsers.length} people
                                    </span>
                                )}
                            </div>

                            {selectedUsers.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map(user => (
                                        <div key={user.id} className="flex items-center gap-2 bg-muted/50 pl-1 pr-3 py-1 rounded-full border border-border">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                                                {user.profile_image ? (
                                                    <img src={user.profile_image} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                                                        {user.nickname[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-sm font-medium">{user.nickname}</span>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setIsUserSelectOpen(true)}
                                        className="w-8 h-8 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsUserSelectOpen(true)}
                                    className="w-full h-12 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent transition-all flex items-center justify-center text-muted-foreground gap-2 font-medium"
                                >
                                    <UserPlus className="w-5 h-5 opacity-70" />
                                    <span>Tag followers</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Common: Images */}
                    <div className="space-y-3 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                {t('write.content.photo_label')}
                            </Label>
                            <span className="text-xs text-muted-foreground font-medium">{images.length}/10</span>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                            {images.map((src, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-border shadow-sm">
                                    <img src={src} alt="preview" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                    <button
                                        onClick={() => setImages(images.filter((_, i) => i !== idx))}
                                        className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            ))}

                            {images.length < 10 && (
                                <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary hover:text-primary hover:bg-primary/5 transition-all bg-muted/20 active:scale-95">
                                    <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
