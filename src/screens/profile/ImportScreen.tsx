import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';


export function ImportScreen() {
    const navigate = useNavigate();
    const { user } = useUser();


    // State
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState({ message: '연결 중...' });
    const [result, setResult] = useState<{ totalFound: number; importedCount: number; message: string; } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleImport = async () => {
        if (!url.trim()) return;
        if (!user?.id) {
            alert("로그인이 필요합니다.");
            return;
        }

        // Clean URL
        const urlMatch = url.match(/(https?:\/\/[^\s]+)/);
        const cleanUrl = urlMatch ? urlMatch[0] : url;

        if (!cleanUrl.includes('naver.me') && !cleanUrl.includes('map.naver.com')) {
            setError('네이버 지도 공유 URL을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);
        setProgress(0);
        setProgressStatus({ message: '서버 연결 중...' });

        try {
            const response = await fetch(`${API_BASE_URL}/api/import/naver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: cleanUrl,
                    userId: user.id
                })
            });

            if (!response.ok && response.status !== 200) {
                // Try to parse error message
                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.error || json.message || 'Server Error');
                } catch (e) {
                    throw new Error('Server Error: ' + response.status);
                }
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n\n');
                // The last element is either empty or a partial chunk
                // If it ends with \n\n, the last elem is empty.
                // If not, we keep the last elem in buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;

                    // SSE format: "event: ...\ndata: ..."
                    const eventMatch = line.match(/event: (.*)\ndata: (.*)/s);
                    if (eventMatch) {
                        const type = eventMatch[1].trim();
                        const dataStr = eventMatch[2].trim();

                        try {
                            const data = JSON.parse(dataStr);

                            if (type === 'progress') {
                                setProgress(data.percent);
                                setProgressStatus({ message: data.message });
                            } else if (type === 'complete') {
                                setResult({
                                    totalFound: data.totalFound,
                                    importedCount: data.importedCount,
                                    message: data.message
                                });
                            } else if (type === 'error') {
                                setError(data.message);
                                setIsLoading(false);
                                return; // Stop processing
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE data', e);
                        }
                    }
                }
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "네트워크 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const match = val.match(/(https?:\/\/[^\s]+)/);
        if (match && val.length > match[0].length) {
            setUrl(match[0]);
        } else {
            setUrl(val);
        }
    };

    if (result) {
        return (
            <div className="flex flex-col h-full bg-background animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div
                    className="flex items-center p-4 border-b border-white/5 bg-background sticky top-0 z-10"
                    style={{ paddingTop: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 1rem)' : undefined }}
                >
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-foreground">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold ml-2">가져오기 완료</h1>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto" data-scroll-container="true">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2">가져오기 성공!</h2>
                    <p className="text-gray-400 mb-8">
                        {result.message}
                    </p>

                    <div className="w-full max-w-sm bg-surface p-4 rounded-xl mb-8">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">발견된 장소</span>
                            <span className="font-medium text-foreground">{result.totalFound}개</span>
                        </div>
                        <div className="w-full h-[1px] bg-white/10 my-3" />
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">저장된 장소</span>
                            <span className="font-bold text-primary">{result.importedCount}개</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 text-left">
                            * 이미 저장된 장소나, 서비스에 등록되지 않은 장소는 제외되었습니다.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/main/profile?tab=saved')}
                        className="w-full max-w-sm py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
                    >
                        확인하러 가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div
                className="flex items-center p-4 border-b border-white/5 bg-background sticky top-0 z-10"
                style={{ paddingTop: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 1rem)' : undefined }}
            >
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-foreground">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold ml-2">가져오기</h1>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto" data-scroll-container="true">
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
                            <div className="absolute left-3 top-3 text-muted-foreground">
                                <LinkIcon className="w-5 h-5" />
                            </div>
                            <textarea
                                value={url}
                                onChange={handleUrlChange}
                                placeholder="복사한 주소를 여기에 붙여넣기 해주세요"
                                className="w-full h-10 pl-10 pr-4 py-2 bg-muted/30 border border-input rounded-xl text-sm
             leading-5 resize-none overflow-hidden
             focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {isLoading && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{progressStatus.message}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

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
}
