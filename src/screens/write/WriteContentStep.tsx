import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, X, ChevronLeft, Calendar, Link as LinkIcon, ArrowUpDown, GripVertical, MapPin } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { ImageEditModal } from './ImageEditModal';
import { UserSelectModal } from './UserSelectModal';
import exifr from 'exifr';
import { useUser } from '@/context/UserContext';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { getAccessToken, saveTokens } from '@/lib/tokenStorage';
import { Reorder, useDragControls } from 'framer-motion';
import { getPhotosNearLocation, getFullResolutionPhoto, PhotoWithLocation } from '@/utils/photoLocationUtils';

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
    const { user } = useUser();
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);



    // Unified Media State
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

    const [keywords, setKeywords] = useState<string[]>([]);
    const [keywordInput, setKeywordInput] = useState('');
    const [visitDate, setVisitDate] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [isDateManuallySet, setIsDateManuallySet] = useState(false);
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Calculate relative time text for visit date
    const getRelativeTimeText = (dateString: string) => {
        // Parse YYYY-MM-DD as local date (not UTC)
        const [year, month, day] = dateString.split('-').map(Number);
        const visitDate = new Date(year, month - 1, day); // month is 0-indexed

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        visitDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - visitDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return t('write.content.visit_date_today', '오늘 방문');
        if (diffDays === 1) return t('write.content.visit_date_yesterday', '어제 방문');
        if (diffDays > 0 && diffDays < 7) return `${diffDays}일 전 방문`;
        if (diffDays >= 7 && diffDays < 14) return t('write.content.visit_date_week_ago', '1주일 전 방문');
        if (diffDays >= 14 && diffDays < 21) return '2주일 전 방문';
        if (diffDays >= 21 && diffDays < 28) return '3주일 전 방문';
        if (diffDays >= 28 && diffDays < 60) return t('write.content.visit_date_month_ago', '1개월 전 방문');

        // For dates in the future or long past, show formatted date
        return `${year}년 ${month}월 ${day}일 방문`;
    };

    // Link State
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [links, setLinks] = useState<{ title: string; url: string }[]>([]);

    // User Tagging State
    const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const currentUserId = user?.id || 0;

    // New Image Edit States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    // Caption Edit State
    const [captionEditId, setCaptionEditId] = useState<string | null>(null);
    const [captionEditText, setCaptionEditText] = useState('');

    // Reorder Modal State
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

    // Suggested Photos State
    const [suggestedPhotos, setSuggestedPhotos] = useState<PhotoWithLocation[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
    const [isAddingPhotos, setIsAddingPhotos] = useState(false);

    // Keyboard Height Tracking for iOS
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            let keyboardWillShowListener: any;
            let keyboardWillHideListener: any;

            const setupListeners = async () => {
                keyboardWillShowListener = await Keyboard.addListener('keyboardWillShow', (info) => {
                    console.log('[WriteContentStep] Keyboard will show:', info.keyboardHeight);
                    setKeyboardHeight(info.keyboardHeight);
                });

                keyboardWillHideListener = await Keyboard.addListener('keyboardWillHide', () => {
                    console.log('[WriteContentStep] Keyboard will hide');
                    setKeyboardHeight(0);
                });
            };

            setupListeners();

            return () => {
                keyboardWillShowListener?.remove();
                keyboardWillHideListener?.remove();
            };
        }
    }, []);

    const handleCaptionSave = () => {
        if (captionEditId) {
            setMediaItems(prev => prev.map(m =>
                m.id === captionEditId ? { ...m, caption: captionEditText } : m
            ));
            setCaptionEditId(null);
            setCaptionEditText('');
        }
    };

    // Find suggested photos near shop location
    const handleFindSuggestedPhotos = async () => {
        const shopLat = shop?.lat;
        const shopLng = shop?.lng || (shop as any)?.lon; // lon is also used in some cases

        if (!shopLat || !shopLng) {
            console.log('[WriteContentStep] ❌ No shop location available');
            console.log('[WriteContentStep] shop.lat:', shop?.lat);
            console.log('[WriteContentStep] shop.lng:', shop?.lng);
            console.log('[WriteContentStep] shop.lon:', (shop as any)?.lon);
            return;
        }

        if (!Capacitor.isNativePlatform()) {
            console.log('[WriteContentStep] ❌ Not on native platform');
            return;
        }

        console.log('[WriteContentStep] 🔍 Starting photo search...');
        setIsLoadingSuggestions(true);

        try {
            console.log('[WriteContentStep] Calling getPhotosNearLocation with:', {
                lat: shopLat,
                lng: shopLng,
                radius: 100,
                maxPhotos: 10
            });

            const suggestions = await getPhotosNearLocation(
                shopLat,
                shopLng,
                100, // 100m radius
                10  // max 10 photos
            );

            console.log('[WriteContentStep] ✅ Found', suggestions.length, 'suggested photos');
            console.log('[WriteContentStep] Photos:', suggestions.map(p => ({
                distance: p.distance,
                lat: p.latitude,
                lng: p.longitude
            })));

            setSuggestedPhotos(suggestions);

            if (suggestions.length === 0) {
                console.log('[WriteContentStep] ⚠️ No photos found within 100m radius');
                // Don't show alert during auto-load, only if user manually triggers
                // alert('이 위치 근처에서 찍은 사진을 찾지 못했습니다.');
            }
        } catch (error) {
            console.error('[WriteContentStep] ❌ Error finding suggested photos:', error);
            console.error('[WriteContentStep] Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            // alert('사진을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoadingSuggestions(false);
            console.log('[WriteContentStep] Photo search completed');
        }
    };

    // Auto-load suggested photos when component mounts (iOS only, review mode only)
    useEffect(() => {
        const shopLat = shop?.lat;
        const shopLng = shop?.lng || shop?.lon; // lon is also used in some cases

        // Only run once when component mounts and shop is available
        if (mode === 'review' && Capacitor.isNativePlatform() && shopLat && shopLng && suggestedPhotos.length === 0 && !isLoadingSuggestions) {
            console.log('[WriteContentStep] ========================================');
            console.log('[WriteContentStep] Auto-loading suggested photos');
            console.log('[WriteContentStep] Shop:', shop.name);
            console.log('[WriteContentStep] Location:', { lat: shopLat, lng: shopLng });
            console.log('[WriteContentStep] ========================================');
            handleFindSuggestedPhotos();
        } else {
            console.log('[WriteContentStep] Skipping photo suggestion:');
            console.log('  - mode:', mode);
            console.log('  - isNativePlatform:', Capacitor.isNativePlatform());
            console.log('  - shop?.lat:', shop?.lat);
            console.log('  - shop?.lng:', shop?.lng);
            console.log('  - shop?.lon:', (shop as any)?.lon);
            console.log('  - has location:', !!(shopLat && shopLng));
            console.log('  - suggestedPhotos.length:', suggestedPhotos.length);
            console.log('  - isLoadingSuggestions:', isLoadingSuggestions);
        }
    }, [shop?.id]); // Only run when shop changes

    // Toggle photo selection
    const handleTogglePhotoSelection = (identifier: string) => {
        setSelectedPhotoIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(identifier)) {
                newSet.delete(identifier);
            } else {
                newSet.add(identifier);
            }
            return newSet;
        });
    };

    // Add selected photos
    const handleAddSelectedPhotos = async () => {
        if (selectedPhotoIds.size === 0) return;

        setIsAddingPhotos(true);

        try {
            const selectedPhotos = suggestedPhotos.filter(p => selectedPhotoIds.has(p.identifier));
            const files: File[] = [];

            // Load all selected photos
            for (const photo of selectedPhotos) {
                console.log('[WriteContentStep] Loading full resolution for identifier:', photo.identifier);
                const file = await getFullResolutionPhoto(photo.identifier);

                if (file) {
                    files.push(file);
                    console.log('[WriteContentStep] ✅ Loaded:', file.size, 'bytes');

                    // Auto-set visit date from first photo if not manually set
                    if (!isDateManuallySet && photo.dateTaken && files.length === 1) {
                        const date = new Date(photo.dateTaken);
                        if (!isNaN(date.getTime())) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const localDate = `${year}-${month}-${day}`;
                            setVisitDate(localDate);
                            console.log('[WriteContentStep] Auto-set visit date from photo:', localDate);
                        }
                    }
                } else {
                    console.error('[WriteContentStep] Failed to load photo:', photo.identifier);
                }
            }

            if (files.length > 0) {
                // Remove loaded photos from suggestions
                setSuggestedPhotos(prev => prev.filter(p => !selectedPhotoIds.has(p.identifier)));
                setSelectedPhotoIds(new Set());

                // Open ImageEditModal with all files
                setPendingFiles(files);
                setIsEditModalOpen(true);
            } else {
                alert('사진을 불러오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('[WriteContentStep] Error adding photos:', error);
            alert('사진을 추가하는 중 오류가 발생했습니다.');
        } finally {
            setIsAddingPhotos(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('[WriteContentStep] File input changed');
        console.log('[WriteContentStep] Files selected:', e.target.files?.length);

        if (!e.target.files?.length) {
            console.log('[WriteContentStep] ❌ No files selected');
            return;
        }

        const files = Array.from(e.target.files);
        console.log('[WriteContentStep] File details:', files.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type
        })));

        setPendingFiles(files);
        setIsEditModalOpen(true);
        e.target.value = '';
        console.log('[WriteContentStep] Opening ImageEditModal with', files.length, 'files');
    };

    const handleEditingComplete = (files: File[], originalFirstFile?: File, imgTexts?: string[]) => {
        console.log('[WriteContentStep] handleEditingComplete called');
        console.log('[WriteContentStep] Files received:', files.length);
        console.log('[WriteContentStep] File details:', files.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type
        })));

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
                    if (!isNaN(date.getTime())) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const localDate = `${year}-${month}-${day}`;
                        setVisitDate(localDate);
                    }
                } else {
                    // Fallback to lastModified if no EXIF date
                    const fileDate = new Date(fileToCheck.lastModified);
                    if (!isNaN(fileDate.getTime())) {
                        const year = fileDate.getFullYear();
                        const month = String(fileDate.getMonth() + 1).padStart(2, '0');
                        const day = String(fileDate.getDate()).padStart(2, '0');
                        const localDate = `${year}-${month}-${day}`;
                        setVisitDate(localDate);
                    }
                }
            }).catch(() => {
                // Fallback on error
                const fileDate = new Date(fileToCheck.lastModified);
                if (!isNaN(fileDate.getTime())) {
                    const year = fileDate.getFullYear();
                    const month = String(fileDate.getMonth() + 1).padStart(2, '0');
                    const day = String(fileDate.getDate()).padStart(2, '0');
                    const localDate = `${year}-${month}-${day}`;
                    setVisitDate(localDate);
                }
            });
        }

        console.log('[WriteContentStep] Calling uploadFiles with', files.length, 'files');
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

        // Get auth token for upload
        let token: string | null = null;
        if (Capacitor.isNativePlatform()) {
            token = await getAccessToken();
        }

        // Upload each file with retry logic
        newItems.forEach(item => {
            if (!item.file) return;

            const uploadWithRetry = async (retryCount = 0) => {
                const formData = new FormData();
                formData.append('file', item.file!);

                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${API_BASE_URL}/api/upload`);

                // Add auth header if token exists
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = (e.loaded / e.total) * 100;
                        setMediaItems(prev => prev.map(m =>
                            m.id === item.id ? { ...m, progress: percent } : m
                        ));
                    }
                };

                xhr.onload = async () => {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.response);
                            setMediaItems(prev => prev.map(m =>
                                m.id === item.id ? { ...m, status: 'complete', url: data.url, progress: 100 } : m
                            ));
                        } catch (e) {
                            console.error('[Upload] Failed to parse response:', e);
                            setMediaItems(prev => prev.map(m =>
                                m.id === item.id ? { ...m, status: 'error' } : m
                            ));
                        }
                    } else if (xhr.status === 401 && retryCount === 0) {
                        console.log('[Upload] ❌ 401 error, attempting token refresh and retry...');

                        // Attempt to refresh token
                        try {
                            const { authFetch } = await import('@/lib/authFetch');
                            const refreshResponse = await authFetch(`${API_BASE_URL}/api/auth/refresh`, {
                                method: 'POST'
                            });

                            if (refreshResponse.ok) {
                                console.log('[Upload] ✅ Token refreshed successfully');

                                // For native, save the new tokens
                                if (Capacitor.isNativePlatform()) {
                                    try {
                                        const refreshData = await refreshResponse.json();
                                        if (refreshData.tokens && refreshData.tokens.accessToken && refreshData.tokens.refreshToken) {
                                            console.log('[Upload] Saving new tokens...');
                                            await saveTokens(refreshData.tokens.accessToken, refreshData.tokens.refreshToken);
                                            console.log('[Upload] ✅ New tokens saved');

                                            // Get new token for retry
                                            token = await getAccessToken();
                                        }
                                    } catch (e) {
                                        console.error('[Upload] Failed to save tokens:', e);
                                    }
                                }

                                // Wait a bit and retry
                                await new Promise(resolve => setTimeout(resolve, 500));
                                uploadWithRetry(retryCount + 1);
                            } else {
                                console.log('[Upload] ❌ Token refresh failed, status:', refreshResponse.status);
                                alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                                setMediaItems(prev => prev.map(m =>
                                    m.id === item.id ? { ...m, status: 'error' } : m
                                ));
                            }
                        } catch (error) {
                            console.error('[Upload] Token refresh error:', error);
                            alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                            setMediaItems(prev => prev.map(m =>
                                m.id === item.id ? { ...m, status: 'error' } : m
                            ));
                        }
                    } else {
                        console.error('[Upload] Failed with status:', xhr.status);
                        setMediaItems(prev => prev.map(m =>
                            m.id === item.id ? { ...m, status: 'error' } : m
                        ));
                    }
                };

                xhr.onerror = () => {
                    console.error('[Upload] Network error');
                    setMediaItems(prev => prev.map(m =>
                        m.id === item.id ? { ...m, status: 'error' } : m
                    ));
                };

                xhr.send(formData);
            };

            uploadWithRetry();
        });
    };

    const handleSubmit = () => {
        // Extract only completed URLs, in order
        const validMedia = mediaItems.filter(m => m.status === 'complete' && m.url);
        const validImages = validMedia.map(m => m.url!);

        // Handle pending link if user didn't click 'Add'
        let finalLinks = [...links];
        if (linkUrl.trim()) {
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
            imgText: validMedia.map(m => m.caption || ""),
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

    // Check validation - photos are now required for reviews
    const hasCompletedImages = mediaItems.some(m => m.status === 'complete');
    const isValid = mode === 'review'
        ? (hasCompletedImages && text.trim())  // Both photo and text required for review
        : text.trim();  // Only text required for post

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

            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto"
                data-scroll-container="true"
                style={{ paddingBottom: keyboardHeight ? `${keyboardHeight}px` : '0px' }}
            >
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
                        <div className="flex items-center justify-between mb-3">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <ImageIcon className="w-5 h-5" />
                                {t('write.content.photo_label')}
                                {mediaItems.length > 0 && (
                                    <span className="text-sm font-normal text-muted-foreground">{mediaItems.length}</span>
                                )}
                                {mode === 'review' && <span className="text-red-500 text-sm">*</span>}
                            </Label>
                            <div className="flex items-center gap-3">
                                {mediaItems.length > 1 && (
                                    <button
                                        onClick={() => setIsReorderModalOpen(true)}
                                        className="text-xs text-primary font-bold flex items-center gap-1 hover:bg-primary/5 px-2 py-1 rounded-md transition-colors"
                                    >
                                        <ArrowUpDown className="w-3 h-3" />
                                        순서 변경
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Suggested Photos Button (iOS only, review mode only) */}
                        {mode === 'review' && Capacitor.isNativePlatform() && shop?.lat && (shop?.lng || (shop as any)?.lon) && (
                            <>
                                {/* Loading State */}
                                {isLoadingSuggestions && (
                                    <div className="w-full mb-3 flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                                        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                        <span className="text-sm font-bold text-primary">근처 사진 찾는 중...</span>
                                        <span className="text-xs text-muted-foreground">(콘솔 로그 확인)</span>
                                    </div>
                                )}

                                {/* Retry Button (if no photos found and not loading) */}
                                {!isLoadingSuggestions && suggestedPhotos.length === 0 && (
                                    <button
                                        onClick={() => {
                                            console.log('[WriteContentStep] 🔄 User manually triggered photo search');
                                            handleFindSuggestedPhotos();
                                        }}
                                        className="w-full mb-3 flex items-center justify-center gap-2 p-3 bg-muted/30 border-2 border-dashed border-border rounded-xl text-muted-foreground font-medium text-sm hover:bg-muted/50 hover:border-primary/30 hover:text-foreground transition-colors"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        <span>이 위치 근처 사진 찾기</span>
                                        <span className="text-xs">(콘솔 로그 확인)</span>
                                    </button>
                                )}
                            </>
                        )}

                        {/* Suggested Photos Display */}
                        {suggestedPhotos.length > 0 && (
                            <div className="mb-3 p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-bold text-primary">
                                            근처에서 찍은 사진 ({suggestedPhotos.length}개)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSuggestedPhotos([]);
                                            setSelectedPhotoIds(new Set());
                                        }}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        닫기
                                    </button>
                                </div>

                                {/* Selection Info & Add Button */}
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs text-muted-foreground">
                                        {selectedPhotoIds.size > 0
                                            ? `${selectedPhotoIds.size}개 선택됨`
                                            : '사진을 선택하세요'}
                                    </p>
                                    {selectedPhotoIds.size > 0 && (
                                        <Button
                                            onClick={handleAddSelectedPhotos}
                                            disabled={isAddingPhotos}
                                            size="sm"
                                            className="h-7 px-3 text-xs"
                                        >
                                            {isAddingPhotos ? (
                                                <>
                                                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />
                                                    추가 중...
                                                </>
                                            ) : (
                                                `${selectedPhotoIds.size}개 추가`
                                            )}
                                        </Button>
                                    )}
                                </div>

                                <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
                                    {suggestedPhotos.map((photo) => {
                                        const isSelected = selectedPhotoIds.has(photo.identifier);
                                        return (
                                            <button
                                                key={photo.identifier}
                                                onClick={() => handleTogglePhotoSelection(photo.identifier)}
                                                disabled={isAddingPhotos}
                                                className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                <img
                                                    src={photo.uri}
                                                    alt="suggested"
                                                    className="w-full h-full object-cover"
                                                />

                                                {/* Selection Indicator */}
                                                <div className={cn(
                                                    "absolute inset-0 flex items-center justify-center transition-all",
                                                    isSelected ? "bg-primary/30" : "bg-black/0"
                                                )}>
                                                    {isSelected && (
                                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Distance Badge */}
                                                <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-[10px] text-white font-bold">
                                                    {photo.distance < 1000
                                                        ? `${Math.round(photo.distance)}m`
                                                        : `${(photo.distance / 1000).toFixed(1)}km`}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 -mx-6 px-6">
                            {mediaItems.map((item) => (
                                <div key={item.id} className="w-36 flex-shrink-0 flex flex-col gap-2">
                                    <div className="w-36 h-36 relative rounded-xl overflow-hidden group border border-gray-100 bg-muted shadow-sm">
                                        {item.status === 'complete' && item.url ? (
                                            <>
                                                <img src={item.url} alt="preview" className="w-full h-full object-cover transition-transform duration-300" />
                                                {/* Delete Button - Always visible */}
                                                <button
                                                    onClick={() => setMediaItems(prev => prev.filter(m => m.id !== item.id))}
                                                    className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black backdrop-blur-sm rounded-full p-1.5 transition-colors z-10"
                                                >
                                                    <X className="w-3.5 h-3.5 text-white" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <UploadingThumbnail
                                                    file={item.file}
                                                    progress={item.progress}
                                                    error={item.status === 'error'}
                                                />
                                                {/* Delete button for uploading/error items */}
                                                <button
                                                    onClick={() => setMediaItems(prev => prev.filter(m => m.id !== item.id))}
                                                    className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black backdrop-blur-sm rounded-full p-1.5 transition-colors z-10"
                                                >
                                                    <X className="w-3.5 h-3.5 text-white" />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Caption Button */}
                                    <button
                                        onClick={() => {
                                            setCaptionEditId(item.id);
                                            setCaptionEditText(item.caption || '');
                                        }}
                                        className={cn(
                                            "text-xs text-center py-1.5 px-2 rounded-lg truncate transition-all",
                                            item.caption
                                                ? "font-medium text-gray-800 hover:bg-gray-100 bg-gray-50"
                                                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 bg-gray-50/50"
                                        )}
                                    >
                                        {item.caption || "설명 추가"}
                                    </button>
                                </div>
                            ))}

                            {mediaItems.length < 30 && (
                                <label className="w-36 h-36 flex-shrink-0 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary hover:text-primary hover:bg-primary/5 transition-all bg-muted/20 active:scale-95">
                                    <ImageIcon className="w-8 h-8 mb-1.5 opacity-50" />
                                    <span className="text-xs font-medium opacity-60">사진 추가</span>
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
                    {mode === 'review' && mediaItems.length > 0 && (
                        <div className="space-y-3">
                            {/* Visit Date - Only shown when photos are uploaded */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        dateInputRef.current?.showPicker?.();
                                    }}
                                    className="w-full bg-muted/30 h-11 px-4 rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors flex items-center justify-between cursor-pointer"
                                >
                                    <span className={cn(!isDateManuallySet && "text-muted-foreground")}>
                                        {getRelativeTimeText(visitDate)}
                                    </span>
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                </button>
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    value={visitDate}
                                    onChange={(e) => {
                                        setVisitDate(e.target.value);
                                        setIsDateManuallySet(true);
                                    }}
                                    className="sr-only"
                                />
                            </div>

                            {/* Companions - Commented out for now */}
                            {/* <div>
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
                            </div> */}
                        </div>
                    )}

                    {/* Common: Main Text */}
                    <div className="space-y-2">
                        {mode === 'review' && (
                            <Label className="text-base font-semibold flex items-center gap-2">
                                {t('write.content.text_label', '본문')}
                                <span className="text-red-500 text-sm">*</span>
                            </Label>
                        )}
                        <Textarea
                            ref={textareaRef}
                            className="min-h-[150px] text-lg bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-muted-foreground/50 resize-none leading-relaxed"
                            placeholder={mode === 'review'
                                ? t('write.content.placeholder_review')
                                : t('write.content.placeholder_post')}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onFocus={(e) => {
                                // iOS: Scroll textarea into view when keyboard appears
                                if (Capacitor.isNativePlatform()) {
                                    setTimeout(() => {
                                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 300);
                                }
                            }}
                        />
                    </div>



                    {/* Link Section */}
                    <div className="space-y-2">
                        {links.length > 0 ? (
                            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-50/30 rounded-xl border border-blue-100">
                                <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold truncate text-gray-900">{links[0].title}</div>
                                    <div className="text-xs text-blue-600 truncate">{links[0].url}</div>
                                </div>
                                <button
                                    onClick={() => setLinks([])}
                                    className="p-1.5 hover:bg-blue-100 rounded-full transition-colors flex-shrink-0"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        ) : (
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground mb-2 ml-1 flex items-center gap-1.5">
                                    <LinkIcon className="w-3.5 h-3.5" />
                                    링크 추가 (선택)
                                </Label>
                                <input
                                    className="w-full bg-muted/30 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground/50"
                                    placeholder="URL을 붙여넣으세요 (예: https://blog.naver.com/...)"
                                    value={linkUrl}
                                    onChange={e => setLinkUrl(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && linkUrl.trim()) {
                                            handleAddLink();
                                        }
                                    }}
                                    onFocus={(e) => {
                                        if (Capacitor.isNativePlatform()) {
                                            setTimeout(() => {
                                                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }, 300);
                                        }
                                    }}
                                />
                                {linkUrl.trim() && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            className="flex-1 bg-muted/20 border border-transparent rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground/50"
                                            placeholder="링크 제목 (선택사항, 비워두면 URL로 표시)"
                                            value={linkTitle}
                                            onChange={e => setLinkTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddLink();
                                                }
                                            }}
                                            onFocus={(e) => {
                                                if (Capacitor.isNativePlatform()) {
                                                    setTimeout(() => {
                                                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }, 300);
                                                }
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handleAddLink}
                                            className="h-8 px-4 text-xs font-bold"
                                        >
                                            추가
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>



                </div>
            </div>
            {/* Caption Edit Modal */}
            {captionEditId && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center p-4"
                    style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)' }}
                >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCaptionEditId(null)} />
                    <div className="relative bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 text-center">어떤 사진인가요?</h3>
                        <Input
                            autoFocus
                            maxLength={40}
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

            {/* Reorder Modal */}
            {isReorderModalOpen && (
                <MediaReorderModal
                    items={mediaItems}
                    onClose={() => setIsReorderModalOpen(false)}
                    onSave={(newItems) => {
                        setMediaItems(newItems);
                        setIsReorderModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

// --- Media Reorder Modal Component ---
const MediaReorderModal = ({ items, onClose, onSave }: {
    items: MediaItem[],
    onClose: () => void,
    onSave: (items: MediaItem[]) => void
}) => {
    const [localItems, setLocalItems] = useState<MediaItem[]>(items);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="bg-background w-full max-w-md h-full max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden m-4">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b bg-background/95 backdrop-blur-sm">
                    <button onClick={onClose} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="font-bold text-base">사진 순서 변경</div>
                    <Button
                        onClick={() => onSave(localItems)}
                        className="bg-primary text-white hover:bg-primary/90 h-9 px-4 rounded-full font-bold text-sm"
                    >
                        완료
                    </Button>
                </div>

                {/* List View */}
                <div className="flex-1 overflow-y-auto p-4">
                    <Reorder.Group
                        axis="y"
                        values={localItems}
                        onReorder={setLocalItems}
                        className="space-y-3"
                    >
                        {localItems.map((item, index) => (
                            <MediaReorderListItem
                                key={item.id}
                                item={item}
                                index={index}
                            />
                        ))}
                    </Reorder.Group>
                </div>
            </div>
        </div>
    );
};

const MediaReorderListItem = ({ item, index }: { item: MediaItem, index: number }) => {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            dragListener={false}
            dragControls={controls}
            className="bg-muted/30 rounded-xl overflow-hidden flex items-center gap-3 p-3 touch-none border border-border/50"
        >
            {/* Drag Handle */}
            <div
                onPointerDown={(e) => controls.start(e)}
                className="cursor-grab active:cursor-grabbing p-2 -ml-1 text-muted-foreground hover:text-foreground transition-colors touch-none"
            >
                <GripVertical className="w-5 h-5" />
            </div>

            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted border border-border/50">
                {item.status === 'complete' && item.url ? (
                    <img
                        src={item.url}
                        alt={`preview ${index + 1}`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-foreground">사진 {index + 1}</div>
                {item.caption && (
                    <div className="text-muted-foreground text-xs truncate mt-1">{item.caption}</div>
                )}
            </div>

            {/* Index Badge */}
            <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {index + 1}
            </div>
        </Reorder.Item>
    );
};
