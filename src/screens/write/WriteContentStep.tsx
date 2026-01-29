import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, X, ChevronLeft, Users, UserPlus, Calendar, Link as LinkIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { ImageEditModal } from './ImageEditModal';
import { UserSelectModal } from './UserSelectModal';
import exifr from 'exifr';
import { getAccessToken } from '@/lib/tokenStorage';
import { Capacitor } from '@capacitor/core';

interface Props {
    onNext: (content: { text: string; images: string[]; imgText?: string[]; companions?: any[]; keywords?: string[]; visitDate?: string; links?: { title: string; url: string }[] }) => void;
    onBack: () => void;
    mode: 'review' | 'post';
    shop?: any;
    satisfaction?: string;
    isSubmitting?: boolean;
}

interface MediaItem {
    id: string;
    file?: File;
    url?: string;
    status: 'uploading' | 'complete' | 'error';
    progress: number;
    caption?: string;
}

const UploadingThumbnail = ({ file, error }: { file?: File, progress: number, error?: boolean }) => {
    const [preview, setPreview] = useState<string>('');

    React.useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    if (error) return (
        <div className="w-full h-full flex items-center justify-center bg-red-100">
            <X className="w-6 h-6 text-red-500" />
        </div>
    );

    return (
        <div className="relative w-full h-full">
            {preview && <img src={preview} alt="uploading" className="w-full h-full object-cover opacity-60" />}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/20 backdrop-blur-[1px]">
                <div className="w-6 h-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
            </div>
        </div>
    );
};

export const WriteContentStep: React.FC<Props> = ({ onNext, onBack, mode, shop, satisfaction, isSubmitting = false }) => {
    const { t } = useTranslation();
    const [text, setText] = useState('');



    // Unified Media State
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

    const [keywords, setKeywords] = useState<string[]>([]);
    const [keywordInput, setKeywordInput] = useState('');
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
    const [isDateManuallySet, setIsDateManuallySet] = useState(false);

    // Link State
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [links, setLinks] = useState<{ title: string; url: string }[]>([]);

    // User Tagging State
    const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const currentUserId = Number(localStorage.getItem("mimy_user_id") || 0);

    // New Image Edit States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    // Caption Edit State
    const [captionEditId, setCaptionEditId] = useState<string | null>(null);
    const [captionEditText, setCaptionEditText] = useState('');

    const handleCaptionSave = () => {
        if (captionEditId) {
            setMediaItems(prev => prev.map(m =>
                m.id === captionEditId ? { ...m, caption: captionEditText } : m
            ));
            setCaptionEditId(null);
            setCaptionEditText('');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setPendingFiles(Array.from(e.target.files));
        setIsEditModalOpen(true);
        e.target.value = '';
    };

    const handleEditingComplete = (files: File[], originalFirstFile?: File, imgTexts?: string[]) => {
        setIsEditModalOpen(false);
        setPendingFiles([]);

        // Auto-set date from photo if not manually set
        if (!isDateManuallySet && files.length > 0) {
            const fileToCheck = originalFirstFile || files[0];
            // Try extracting EXIF date
            exifr.parse(fileToCheck).then(output => {
                const exifDate = output?.DateTimeOriginal || output?.CreateDate;
                if (exifDate) {
                    const date = new Date(exifDate);
                    const localDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
                    setVisitDate(localDate);
                } else {
                    // Fallback to lastModified if no EXIF date
                    const fileDate = new Date(fileToCheck.lastModified);
                    const localDate = fileDate.getFullYear() + '-' + String(fileDate.getMonth() + 1).padStart(2, '0') + '-' + String(fileDate.getDate()).padStart(2, '0');
                    setVisitDate(localDate);
                }
            }).catch(() => {
                // Fallback on error
                const fileDate = new Date(fileToCheck.lastModified);
                const localDate = fileDate.getFullYear() + '-' + String(fileDate.getMonth() + 1).padStart(2, '0') + '-' + String(fileDate.getDate()).padStart(2, '0');
                setVisitDate(localDate);
            });
        }

        uploadFiles(files, imgTexts);
    };

    const uploadFiles = async (files: File[], captions?: string[]) => {
        // Create placeholders in order
        const newItems: MediaItem[] = files.map((file, index) => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            status: 'uploading',
            progress: 0,
            caption: captions ? captions[index] : undefined
        }));

        setMediaItems(prev => [...prev, ...newItems]);

        // Start uploads
        newItems.forEach(item => {
            if (!item.file) return;
            const file = item.file; // Capture file for async closure

            // Async upload with authentication
            (async () => {
                try {
                    const formData = new FormData();
                    formData.append('file', file);

                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', `${API_BASE_URL}/api/upload`);

                    // Add authentication header for native platforms
                    if (Capacitor.isNativePlatform()) {
                        console.log('[WriteContentStep] Native platform detected, adding auth header for upload');
                        const token = await getAccessToken();
                        if (token) {
                            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                            console.log('[WriteContentStep] ✅ Auth header added to upload request');
                        } else {
                            console.error('[WriteContentStep] ❌ No token found for upload!');
                            setMediaItems(prev => prev.map(m =>
                                m.id === item.id ? { ...m, status: 'error' } : m
                            ));
                            return;
                        }
                    }

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percent = (e.loaded / e.total) * 100;
                            setMediaItems(prev => prev.map(m =>
                                m.id === item.id ? { ...m, progress: percent } : m
                            ));
                        }
                    };

                    xhr.onload = () => {
                        console.log('[WriteContentStep] Upload response status:', xhr.status);
                        if (xhr.status === 200) {
                            try {
                                const data = JSON.parse(xhr.response);
                                console.log('[WriteContentStep] ✅ Upload success:', data.url);
                                setMediaItems(prev => prev.map(m =>
                                    m.id === item.id ? { ...m, status: 'complete', url: data.url, progress: 100 } : m
                                ));
                            } catch (e) {
                                console.error('[WriteContentStep] ❌ Failed to parse upload response:', e);
                                setMediaItems(prev => prev.map(m =>
                                    m.id === item.id ? { ...m, status: 'error' } : m
                                ));
                            }
                        } else {
                            console.error('[WriteContentStep] ❌ Upload failed with status:', xhr.status, xhr.responseText);
                            setMediaItems(prev => prev.map(m =>
                                m.id === item.id ? { ...m, status: 'error' } : m
                            ));
                        }
                    };

                    xhr.onerror = () => {
                        console.error('[WriteContentStep] ❌ Upload network error');
                        setMediaItems(prev => prev.map(m =>
                            m.id === item.id ? { ...m, status: 'error' } : m
                        ));
                    };

                    xhr.send(formData);
                } catch (error) {
                    console.error('[WriteContentStep] ❌ Upload exception:', error);
                    setMediaItems(prev => prev.map(m =>
                        m.id === item.id ? { ...m, status: 'error' } : m
                    ));
                }
            })();
        });
    };

    const handleSubmit = () => {
        // Extract only completed URLs, in order
        // Extract only completed URLs, in order
        const validMedia = mediaItems.filter(m => m.status === 'complete' && m.url);
        const validImages = validMedia.map(m => m.url!);

        // Handle pending link if user didn't click 'Add'
        let finalLinks = [...links];
        if (showLinkInput && linkUrl.trim()) {
            let url = linkUrl.trim();
            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }
            finalLinks.push({
                title: linkTitle.trim() || url,
                url: url
            });
        }

        onNext({
            text,
            images: validImages,
            imgText: validMedia.map(m => m.caption || ""), // Pass empty string if no caption to maintain index alignment? Or just pass potentially smaller array? 
            // Better to align with images:
            // The constraint is parallel arrays.
            companions: selectedUsers.map(u => u.id),
            keywords,
            visitDate,
            links: finalLinks
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

    const handleAddLink = () => {
        if (linkUrl.trim()) {
            // Basic URL validation/prefixing
            let url = linkUrl.trim();
            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }

            setLinks([{
                title: linkTitle.trim() || url,
                url: url
            }]);
            setShowLinkInput(false);
            setLinkUrl('');
            setLinkTitle('');
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

    // Check if any uploads are in progress
    const isUploading = mediaItems.some(m => m.status === 'uploading');

    // Check validation
    const isValid = mode === 'review'
        ? (text.trim() || mediaItems.some(m => m.status === 'complete'))
        : text.trim();

    return (
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            <ImageEditModal
                files={pendingFiles}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onEditingComplete={handleEditingComplete}
            />

            <UserSelectModal
                isOpen={isUserSelectOpen}
                onClose={() => setIsUserSelectOpen(false)}
                onSelect={setSelectedUsers}
                initialSelected={selectedUsers}
                currentUserId={currentUserId}
            />

            {/* Header */}
            <div
                className="px-4 pb-3 flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10 transition-colors border-b"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
            >
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
                    disabled={isUploading || !isValid || isSubmitting}
                    className={cn(
                        "rounded-full px-4 font-bold transition-all",
                        isValid
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-muted-foreground"
                    )}
                >
                    {t('write.content.done')}
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto" data-scroll-container="true">
                {/* Content Area */}
                <div className="p-6 space-y-8">

                    {/* Mode Specific: Review - POI Info */}
                    {mode === 'review' && shop && (
                        <div className="space-y-6">
                            {/* POI Card */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-border/50">
                                <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                                    {shop.thumbnail_img ? (
                                        <img src={shop.thumbnail_img} alt={shop.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">🏢</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 mb-1 min-w-0">
                                        <h3 className="font-bold text-sm leading-none text-gray-900 truncate">
                                            {shop.name}
                                        </h3>

                                        <span
                                            className={cn(
                                                "inline-flex items-center h-5 px-2 rounded-md text-xs font-bold leading-none border shadow-sm whitespace-nowrap",
                                                satisfaction === "good"
                                                    ? "bg-orange-50 border-orange-200 text-orange-600"
                                                    : "bg-gray-50 border-gray-200 text-gray-600"
                                            )}
                                        >
                                            {getSatisfactionLabel()}
                                        </span>

                                        <span className="text-xs leading-none text-gray-500 truncate">
                                            {shop.category}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        {shop.address_region || shop.address_full}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Common: Images (Moved Here) */}
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                {t('write.content.photo_label')}
                            </Label>
                            <span className="text-xs text-muted-foreground font-medium">{mediaItems.length}/30</span>
                        </div>

                        <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 -mx-6 px-6">
                            {mediaItems.map((item) => (
                                <div key={item.id} className="w-28 flex-shrink-0 flex flex-col gap-1.5">
                                    <div className="w-28 h-28 relative rounded-xl overflow-hidden group border border-gray-100 bg-muted shadow-sm">
                                        {item.status === 'complete' && item.url ? (
                                            <>
                                                <img src={item.url} alt="preview" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                                <button
                                                    onClick={() => setMediaItems(prev => prev.filter(m => m.id !== item.id))}
                                                    className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                                >
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </>
                                        ) : (
                                            <UploadingThumbnail
                                                file={item.file}
                                                progress={item.progress}
                                                error={item.status === 'error'}
                                            />
                                        )}
                                    </div>

                                    {/* Caption Button */}
                                    <button
                                        onClick={() => {
                                            setCaptionEditId(item.id);
                                            setCaptionEditText(item.caption || '');
                                        }}
                                        className={cn(
                                            "text-xs text-center py-1 px-1 rounded-md truncate transition-colors",
                                            item.caption ? "font-medium text-gray-700 hover:bg-gray-100" : "text-gray-400 hover:bg-gray-50 bg-gray-50/50"
                                        )}
                                    >
                                        {item.caption || "설명 추가"}
                                    </button>
                                </div>
                            ))}

                            {mediaItems.length < 30 && (
                                <label className="w-28 h-28 flex-shrink-0 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary hover:text-primary hover:bg-primary/5 transition-all bg-muted/20 active:scale-95">
                                    <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Mode Specific: Post - Keywords */}
                    {mode === 'post' && (
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Keywords</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {keywords.map((k, i) => (
                                    <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold flex items-center gap-1">
                                        {k}
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

                    {/* Mode Specific: Review - Metadata (Date & Companions) */}
                    {mode === 'review' && (
                        <div className="flex gap-3">
                            {/* Visit Date */}
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-muted-foreground mb-1.5 ml-1">
                                    {t('write.content.visit_date', 'Visit Date')}
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="date"
                                        value={visitDate}
                                        onChange={(e) => {
                                            setVisitDate(e.target.value);
                                            setIsDateManuallySet(true);
                                        }}
                                        className={cn(
                                            "w-full bg-muted/30 h-10 pl-9 pr-3 rounded-xl text-sm font-medium focus:bg-background border border-transparent focus:border-primary transition-colors outline-none cursor-pointer",
                                            !isDateManuallySet && "text-muted-foreground"
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Companions */}
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-muted-foreground mb-1.5 ml-1">
                                    {t('write.content.with_who', 'With who?')}
                                </label>
                                <button
                                    onClick={() => setIsUserSelectOpen(true)}
                                    className="w-full h-10 bg-muted/30 rounded-xl px-3 flex items-center gap-2 text-sm border border-transparent hover:bg-muted/50 border-dashed hover:border-primary/50 transition-all font-medium text-left"
                                >
                                    <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 truncate">
                                        {selectedUsers.length > 0 ? (
                                            <span className="text-foreground">
                                                {selectedUsers[0].nickname}
                                                {selectedUsers.length > 1 && ` +${selectedUsers.length - 1}`}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/70">{t('write.content.tag_friends', 'Tag friends')}</span>
                                        )}
                                    </div>
                                    <UserPlus className="w-3 h-3 text-muted-foreground shrink-0" />
                                </button>
                            </div>
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



                    {/* Link Section */}
                    <div className="space-y-2">
                        {links.length > 0 ? (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                                <LinkIcon className="w-4 h-4 text-gray-400" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold truncate">{links[0].title}</div>
                                    <div className="text-xs text-gray-400 truncate">{links[0].url}</div>
                                </div>
                                <button
                                    onClick={() => setLinks([])}
                                    className="p-1 hover:bg-gray-200 rounded-full"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        ) : (
                            showLinkInput ? (
                                <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                                    <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-1">
                                        <span>Add Link</span>
                                        <button onClick={() => setShowLinkInput(false)}><X className="w-3 h-3" /></button>
                                    </div>
                                    <input
                                        className="w-full bg-white border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                        placeholder="URL (e.g. https://mimy.kr)"
                                        value={linkUrl}
                                        onChange={e => setLinkUrl(e.target.value)}
                                        autoFocus
                                    />
                                    <input
                                        className="w-full bg-white border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                        placeholder="Link Title (Optional)"
                                        value={linkTitle}
                                        onChange={e => setLinkTitle(e.target.value)}
                                    />
                                    <div className="flex justify-end pt-1">
                                        <Button size="sm" onClick={handleAddLink} disabled={!linkUrl.trim()}>Add</Button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowLinkInput(true)}
                                    className="flex items-center gap-2 text-sm font-bold text-primary px-1 py-2 hover:bg-primary/5 rounded-lg transition-colors"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                    Add Link
                                </button>
                            )
                        )}
                    </div>



                </div>
            </div>
            {/* Caption Edit Modal */}
            {captionEditId && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCaptionEditId(null)} />
                    <div className="relative bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold mb-4 text-center">어떤 사진인가요?</h3>
                        <Input
                            autoFocus
                            placeholder="메뉴 이름이나 설명을 적어주세요"
                            value={captionEditText}
                            onChange={(e) => setCaptionEditText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCaptionSave()}
                            className="mb-4"
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setCaptionEditId(null)}
                                className="flex-1 rounded-xl"
                            >
                                취소
                            </Button>
                            <Button
                                onClick={handleCaptionSave}
                                className="flex-1 rounded-xl bg-primary text-white"
                            >
                                확인
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
