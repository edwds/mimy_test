
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';

export const ImportScreen = () => {
    const navigate = useNavigate();
    const { user } = useUser();

    // State
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ total: number; imported: number; message: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleImport = async () => {
        if (!url.trim()) return;
        if (!user?.id) {
            alert("로그인이 필요합니다.");
            return;
        }

        // Clean URL (remove text prefix if pasted)
        // e.g. "[Naver Map] ... https://naver.me/..."
        const urlMatch = url.match(/(https?:\/\/[^\s]+)/);
        const cleanUrl = urlMatch ? urlMatch[0] : url;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/import/naver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: cleanUrl,
                    userId: user.id
                })
            });

            const data = await response.json();

            if (response.ok) {
                setResult({
                    total: data.totalFound,
                    imported: data.importedCount,
                    message: data.message
                });
            } else {
                setError(data.error || "가져오기에 실패했습니다.");
            }

        } catch (e) {
            console.error(e);
            setError("네트워크 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center p-4 border-b border-border">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-foreground">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold ml-2">가져오기</h1>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">

                <div className="space-y-6">
                    {/* Intro */}
                    <div>
                        <h2 className="text-2xl font-bold mb-2">다른 플랫폼의<br />맛집 리스트를 가져오세요</h2>
                        <p className="text-muted-foreground text-sm">
                            네이버 지도, 카카오맵 등의 공유 URL을 입력하면<br />
                            자동으로 인식하여 '가고 싶어요'에 저장합니다.
                        </p>
                    </div>

                    {/* Input Area */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">공유 URL</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <LinkIcon className="w-5 h-5" />
                            </div>
                            <textarea
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="복사한 주소를 여기에 붙여넣기 해주세요"
                                className="w-full pl-10 pr-4 py-3 bg-muted/30 border border-input rounded-xl focus:outline-none focus:ring-primary/20 text-sm resize-none"
                            />
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleImport}
                        disabled={!url.trim() || isLoading}
                        className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>분석 중...</span>
                            </>
                        ) : (
                            <span>가져오기</span>
                        )}
                    </button>

                    {/* Result Card */}
                    {result && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center animate-in fade-in zoom-in-95">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="font-bold text-lg text-green-700 mb-1">완료되었습니다!</h3>
                            <p className="text-green-600/80 text-sm mb-4">
                                {result.message}
                            </p>
                            <button
                                onClick={() => navigate(-1)}
                                className="text-sm font-medium text-green-700 underline"
                            >
                                확인하러 가기
                            </button>
                        </div>
                    )}

                    {/* Error Card */}
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 animate-in fade-in zoom-in-95">
                            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-sm text-destructive mb-1">오류가 발생했습니다</h3>
                                <p className="text-xs text-destructive/80">{error}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
