import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { OnboardingService } from '@/services/OnboardingService';
import { useOnboarding } from '@/context/OnboardingContext';
import { resizeImage } from '@/lib/image';

const MAX_IMAGES = 30;

export const ScreenshotUpload = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { setExtractedNames } = useOnboarding();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [images, setImages] = useState<Array<{ file: File; preview: string; uploading: boolean; url?: string }>>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeProgress, setAnalyzeProgress] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const remaining = MAX_IMAGES - images.length;
        const toAdd = files.slice(0, remaining);

        for (const file of toAdd) {
            const preview = URL.createObjectURL(file);

            setImages(prev => [...prev, { file, preview, uploading: true }]);

            // Upload to Vercel Blob
            try {
                const resized = await resizeImage(file, 1920);
                const formData = new FormData();
                formData.append('file', resized, file.name);

                const response = await authFetch(`${API_BASE_URL}/api/upload`, {
                    method: 'POST',
                    headers: {}, // Let browser set Content-Type for FormData
                    body: formData as any,
                });

                if (response.ok) {
                    const data = await response.json();
                    setImages(prev => prev.map((img) =>
                        img.preview === preview ? { ...img, uploading: false, url: data.url } : img
                    ));
                } else {
                    setImages(prev => prev.filter(img => img.preview !== preview));
                    setError(t('onboarding.screenshot_upload.upload_failed', { defaultValue: '이미지 업로드에 실패했어요' }));
                }
            } catch {
                setImages(prev => prev.filter(img => img.preview !== preview));
                setError(t('onboarding.screenshot_upload.upload_failed', { defaultValue: '이미지 업로드에 실패했어요' }));
            }
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (preview: string) => {
        setImages(prev => prev.filter(img => img.preview !== preview));
        URL.revokeObjectURL(preview);
    };

    const handleAnalyze = async () => {
        const uploadedUrls = images.filter(img => img.url).map(img => img.url!);
        if (uploadedUrls.length === 0) return;

        setAnalyzing(true);
        setError(null);
        setAnalyzeProgress(t('onboarding.screenshot_upload.analyzing', { defaultValue: 'AI가 스크린샷을 분석하고 있어요...' }));

        try {
            const result = await OnboardingService.analyzeScreenshots(uploadedUrls);
            setExtractedNames(result.extractedNames);

            if (result.extractedNames.length > 0) {
                navigate('/onboarding/shop-match');
            } else {
                setError(t('onboarding.screenshot_upload.no_restaurants', { defaultValue: '음식점을 찾지 못했어요. 다른 스크린샷을 시도해보세요.' }));
            }
        } catch {
            setError(t('onboarding.screenshot_upload.analyze_failed', { defaultValue: '분석에 실패했어요. 다시 시도해주세요.' }));
        } finally {
            setAnalyzing(false);
            setAnalyzeProgress('');
        }
    };

    const allUploaded = images.length > 0 && images.every(img => !img.uploading);
    const anyUploading = images.some(img => img.uploading);
    const uploadedCount = images.filter(img => img.url).length;

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-0 pb-safe-offset-6">
            {/* Header */}
            <div className="flex items-center px-4 py-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="flex-1 text-center text-lg font-bold pr-8">
                    {t('onboarding.screenshot_upload.title', { defaultValue: '스크린샷 업로드' })}
                </h1>
            </div>

            {/* Instructions + Counter */}
            <div className="px-6 pb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {t('onboarding.screenshot_upload.instruction', { defaultValue: '예약 앱의 방문 내역 스크린샷을 올려주세요' })}
                </p>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {images.length}/{MAX_IMAGES}
                </span>
            </div>

            {/* Image Grid */}
            <div className="flex-1 px-6 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                    {images.map((img) => (
                        <div key={img.preview} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted">
                            <img src={img.preview} alt="" className="w-full h-full object-cover" />
                            {img.uploading && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                </div>
                            )}
                            {!img.uploading && (
                                <button
                                    onClick={() => removeImage(img.preview)}
                                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                                >
                                    <X className="w-3.5 h-3.5 text-white" />
                                </button>
                            )}
                        </div>
                    ))}

                    {images.length < MAX_IMAGES && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-[3/4] rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 transition-colors"
                        >
                            <Plus className="w-7 h-7 text-muted-foreground/50" />
                            <span className="text-[10px] text-muted-foreground/50">
                                {t('onboarding.screenshot_upload.add_photo', { defaultValue: '사진 추가' })}
                            </span>
                        </button>
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="px-6 py-2"
                    >
                        <p className="text-sm text-red-500 text-center">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Actions */}
            <div className="px-6 pt-3 pb-4 space-y-3">
                {analyzing ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground text-center">
                            {analyzeProgress}
                        </p>
                    </div>
                ) : (
                    <Button
                        size="lg"
                        className="w-full text-lg py-6 rounded-full"
                        disabled={!allUploaded || anyUploading || images.length === 0}
                        onClick={handleAnalyze}
                    >
                        {anyUploading
                            ? t('onboarding.screenshot_upload.uploading', { defaultValue: '업로드 중...' })
                            : `${uploadedCount}${t('onboarding.screenshot_upload.analyze_suffix', { defaultValue: '장 분석하기' })}`}
                    </Button>
                )}
            </div>
        </div>
    );
};
