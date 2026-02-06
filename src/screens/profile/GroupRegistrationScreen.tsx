import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Loader2, Mail, Building2, GraduationCap, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { authFetch } from '@/lib/authFetch';
import { useTranslation } from 'react-i18next';

type Step = 'input' | 'verify' | 'success';

interface AffiliationStatus {
    group: {
        id: number;
        name: string;
        type: string;
        email: string;
        joined_at: string;
        can_change: boolean;
    } | null;
}

export const GroupRegistrationScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { refreshUser } = useUser();

    const [step, setStep] = useState<Step>('input');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<AffiliationStatus | null>(null);
    const [pendingGroupName, setPendingGroupName] = useState('');
    const [expiresIn, setExpiresIn] = useState(0);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Fetch current status on mount
    useEffect(() => {
        fetchStatus();
    }, []);

    // Countdown timer for verification
    useEffect(() => {
        if (expiresIn > 0) {
            const timer = setInterval(() => {
                setExpiresIn(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [expiresIn]);

    const fetchStatus = async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/affiliation/status`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch (err) {
            console.error('Failed to fetch affiliation status:', err);
        }
    };

    const handleSendCode = async () => {
        if (!email.trim() || !email.includes('@')) {
            setError(t('profile.group.error.invalid_email', '올바른 이메일을 입력해주세요.'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await authFetch(`${API_BASE_URL}/api/affiliation/email/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });

            const data = await res.json();

            if (res.ok) {
                setPendingGroupName(data.group_name || '');
                setExpiresIn(data.expires_in || 300);
                setStep('verify');
                setCode(['', '', '', '', '', '']);
                setTimeout(() => inputRefs.current[0]?.focus(), 100);
            } else {
                setError(data.message || t('profile.group.error.send_failed', '인증 코드 발송에 실패했습니다.'));
            }
        } catch (err) {
            setError(t('profile.group.error.network', '네트워크 오류가 발생했습니다.'));
        } finally {
            setLoading(false);
        }
    };

    const handleCodeChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all filled
        if (newCode.every(c => c) && newCode.join('').length === 6) {
            handleVerify(newCode.join(''));
        }
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async (codeStr?: string) => {
        const finalCode = codeStr || code.join('');
        if (finalCode.length !== 6) {
            setError(t('profile.group.error.code_length', '6자리 코드를 모두 입력해주세요.'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await authFetch(`${API_BASE_URL}/api/affiliation/email/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: finalCode }),
            });

            const data = await res.json();

            if (res.ok) {
                setPendingGroupName(data.group?.name || pendingGroupName);
                setStep('success');
                await refreshUser();
            } else {
                setError(data.message || t('profile.group.error.verify_failed', '인증에 실패했습니다.'));
                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            setError(t('profile.group.error.network', '네트워크 오류가 발생했습니다.'));
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm(t('profile.group.leave_confirm', '소속을 해제하시겠습니까?'))) return;

        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE_URL}/api/affiliation/group`, {
                method: 'DELETE',
            });

            if (res.ok) {
                await refreshUser();
                await fetchStatus();
            } else {
                const data = await res.json();
                setError(data.message || '소속 해제에 실패했습니다.');
            }
        } catch (err) {
            setError('네트워크 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <header
                className="px-4 py-3 flex items-center gap-2 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10"
                style={{ paddingTop: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 0.75rem)' : undefined }}
            >
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">{t('profile.settings.school_company', '학교/회사 등록')}</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-5" data-scroll-container="true">
                {/* Current Status */}
                {status?.group && step === 'input' && (
                    <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="flex items-center gap-3 mb-3">
                            {status.group.type === 'SCHOOL' ? (
                                <GraduationCap className="w-6 h-6 text-primary" />
                            ) : (
                                <Building2 className="w-6 h-6 text-primary" />
                            )}
                            <div>
                                <p className="text-sm text-muted-foreground">{t('profile.group.current_group', '현재 소속')}</p>
                                <p className="font-bold text-lg">{status.group.name}</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{status.group.email}</p>
                        {status.group.can_change ? (
                            <Button variant="outline" size="sm" onClick={handleLeaveGroup} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : t('profile.group.leave_group', '소속 해제')}
                            </Button>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                {t('profile.group.cooldown_warning', '소속 변경은 30일마다 가능합니다')}
                            </p>
                        )}
                    </div>
                )}

                {/* Step: Email Input */}
                {step === 'input' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold mb-2">
                                {status?.group
                                    ? t('profile.group.change_title', '소속 변경')
                                    : t('profile.group.title', '학교/회사 등록')}
                            </h2>
                            <p className="text-muted-foreground">
                                {t('profile.group.email_desc', '회사 또는 학교 이메일을 입력하면 인증 코드가 발송됩니다.')}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('profile.group.email_label', '회사/학교 이메일')}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('profile.group.email_placeholder', 'example@company.com')}
                                    className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('profile.group.email_helper', '회사 또는 학교에서 제공한 이메일 주소를 입력해주세요.')}
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}

                        <Button
                            className="w-full h-12"
                            onClick={handleSendCode}
                            disabled={loading || !email.trim()}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : t('profile.group.send_code', '인증 코드 받기')}
                        </Button>
                    </div>
                )}

                {/* Step: Verify Code */}
                {step === 'verify' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold mb-2">{t('profile.group.verify_title', '이메일 인증')}</h2>
                            <p className="text-muted-foreground">
                                {t('profile.group.verify_desc', '{{email}}로 전송된 6자리 코드를 입력해주세요.', { email })}
                            </p>
                            {pendingGroupName && (
                                <p className="text-sm text-primary mt-2">
                                    {t('profile.group.joining_group', '{{group}}에 등록됩니다.', { group: pendingGroupName })}
                                </p>
                            )}
                        </div>

                        {/* OTP Input */}
                        <div className="flex justify-center gap-2">
                            {code.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={(el) => { inputRefs.current[i] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    value={digit}
                                    onChange={(e) => handleCodeChange(i, e.target.value)}
                                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                    className="w-12 h-14 text-center text-2xl font-bold border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    maxLength={1}
                                />
                            ))}
                        </div>

                        {expiresIn > 0 && (
                            <p className="text-center text-sm text-muted-foreground">
                                {t('profile.group.expires_in', '남은 시간')}: {formatTime(expiresIn)}
                            </p>
                        )}

                        {error && (
                            <p className="text-sm text-red-500 text-center">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 h-12"
                                onClick={() => { setStep('input'); setError(''); }}
                            >
                                {t('common.back', '뒤로')}
                            </Button>
                            <Button
                                className="flex-1 h-12"
                                onClick={() => handleVerify()}
                                disabled={loading || code.some(c => !c)}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : t('profile.group.verify', '인증하기')}
                            </Button>
                        </div>

                        <button
                            className="w-full text-sm text-muted-foreground hover:text-foreground"
                            onClick={handleSendCode}
                            disabled={loading}
                        >
                            {t('profile.group.resend_code', '인증 코드 다시 받기')}
                        </button>
                    </div>
                )}

                {/* Step: Success */}
                {step === 'success' && (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="w-10 h-10 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">{t('profile.group.success_title', '등록 완료!')}</h2>
                            <p className="text-muted-foreground">
                                {t('profile.group.success_desc', '{{group}}에 등록되었습니다.', { group: pendingGroupName })}
                            </p>
                        </div>
                        <Button className="w-full max-w-xs h-12" onClick={() => navigate(-1)}>
                            {t('common.done', '완료')}
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
};
