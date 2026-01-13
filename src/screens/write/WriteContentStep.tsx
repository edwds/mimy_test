
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, X, ChevronLeft } from 'lucide-react';

interface Props {
    onNext: (content: { text: string; images: string[] }) => void;
    onBack: () => void;
    mode: 'review' | 'post';
}

export const WriteContentStep: React.FC<Props> = ({ onNext, onBack, mode }) => {
    const [text, setText] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);

        setUploading(true);
        // Mock upload logic (using local blob for now)
        const newImages = files.map(file => URL.createObjectURL(file));
        setImages(prev => [...prev, ...newImages]);
        setUploading(false);
    };

    const handleSubmit = () => {
        onNext({ text, images });
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-surface)]">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)] z-10">
                <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-primary)]">
                    <ChevronLeft size={24} />
                </button>
                <div className="font-bold text-lg text-[var(--color-text-primary)]">
                    {mode === 'review' ? '후기 작성' : '새 게시글'}
                </div>
                <Button
                    variant="ghost"
                    className="text-[var(--color-primary)] font-bold text-base hover:bg-transparent px-2"
                    onClick={handleSubmit}
                    disabled={text.trim().length === 0 || uploading}
                >
                    완료
                </Button>
            </div>

            <div className="flex-1 flex flex-col p-4">
                <textarea
                    className="flex-1 w-full bg-transparent resize-none focus:outline-none text-[var(--color-text-primary)] text-lg placeholder:text-[var(--color-text-tertiary)] leading-relaxed"
                    placeholder={mode === 'review'
                        ? "이곳에서의 경험은 어떠셨나요?\n솔직한 후기는 다른 분들에게 큰 도움이 됩니다."
                        : "자유롭게 이야기를 나눠보세요."}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                />

                {/* Image Grid */}
                <div className="mt-4">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {images.map((src, idx) => (
                            <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden group border border-[var(--color-border)]">
                                <img src={src} alt="preview" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 bg-black/50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            </div>
                        ))}

                        <label className="w-24 h-24 flex-shrink-0 rounded-xl border border-dashed border-[var(--color-border)] flex flex-col items-center justify-center text-[var(--color-text-tertiary)] cursor-pointer hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all">
                            <ImageIcon className="w-6 h-6 mb-1" />
                            <span className="text-xs font-medium">{images.length}/10</span>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={images.length >= 10}
                            />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
