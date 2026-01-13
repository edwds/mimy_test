
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, X, ChevronLeft } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { ImageEditModal } from './ImageEditModal';

interface Props {
    onNext: (content: { text: string; images: string[] }) => void;
    onBack: () => void;
    mode: 'review' | 'post';
}

export const WriteContentStep: React.FC<Props> = ({ onNext, onBack, mode }) => {
    const [text, setText] = useState('');
    const [images, setImages] = useState<string[]>([]);

    // New Image Edit States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);

        // Open Editor
        setPendingFiles(files);
        setIsEditModalOpen(true);

        // Reset input
        e.target.value = '';
    };

    const handleUploadComplete = (newUrls: string[]) => {
        setImages(prev => [...prev, ...newUrls]);
        setPendingFiles([]);
        // Modal closes itself via onClose in props if needed, or we close it here
        setIsEditModalOpen(false);
    };

    const handleSubmit = () => {
        onNext({ text, images });
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            {/* New Image Edit Modal */}
            <ImageEditModal
                files={pendingFiles}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUploadComplete={handleUploadComplete}
            />

            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-[var(--color-text-primary)] hover:bg-[var(--color-gray-50)] rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="font-bold text-lg text-[var(--color-text-primary)]">
                    {mode === 'review' ? '후기 작성' : '새 게시글'}
                </div>
                <Button
                    variant="ghost"
                    className="text-[var(--color-primary)] font-bold text-base hover:bg-[var(--color-primary)]/10 px-3 h-9"
                    onClick={handleSubmit}
                    disabled={text.trim().length === 0}
                >
                    완료
                </Button>
            </div>

            <div className="flex-1 flex flex-col p-6 overflow-y-auto pb-24">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="sr-only">내용</Label>
                        <Textarea
                            className="min-h-[200px] text-lg bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-[var(--color-text-tertiary)] resize-none leading-relaxed"
                            placeholder={mode === 'review'
                                ? "이곳에서의 경험은 어떠셨나요?\n맛, 서비스, 분위기 등 솔직한 후기를 남겨주세요."
                                : "자유롭게 이야기를 나눠보세요."}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Image Grid */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            사진 <span className="text-[var(--color-text-tertiary)] font-normal text-sm">{images.length}/10</span>
                        </Label>
                        <div className="grid grid-cols-4 gap-3">
                            {images.map((src, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-[var(--color-border)] shadow-sm">
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
                                <label className="aspect-square rounded-xl border border-dashed border-[var(--color-border)] flex flex-col items-center justify-center text-[var(--color-text-tertiary)] cursor-pointer hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all bg-[var(--color-surface)]">
                                    <ImageIcon className="w-6 h-6 mb-1" />
                                    <span className="text-xs font-medium">추가</span>
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
