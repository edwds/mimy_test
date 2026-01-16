import { Apple, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { API_BASE_URL } from '@/lib/api';

import { useUser } from '@/context/UserContext';

import { useTranslation } from 'react-i18next';

export const LoginPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login: contextLogin } = useUser();

    // Mock login success
    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                // Send access token to backend
                const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: tokenResponse.access_token })
                });

                if (response.ok) {
                    const { user, isNew } = await response.json();

                    if (isNew) {
                        // New User: Don't login yet, just go to register
                        localStorage.setItem("mimy_reg_google_info", JSON.stringify(user));
                        navigate('/register/phone');
                    } else {
                        // Existing User: Login normally
                        await contextLogin(user.id.toString());
                        navigate('/main');
                    }
                } else {
                    alert("Login failed");
                }
            } catch (e) {
                console.error(e);
                alert("Network error");
            }
        },
        onError: () => alert("Google Login Failed"),
    });

    return (
        <div className="flex flex-col h-full bg-background p-6 animate-in fade-in duration-500 overflow-hidden">
            <header className="flex-1 flex flex-col justify-center items-center space-y-6">
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">{t('auth.login.title')}</h1>
                    <p className="text-muted-foreground">{t('auth.login.desc')}</p>
                </div>
            </header>

            <main className="space-y-4 mb-8">
                {/* Google */}
                <Button
                    variant="outline"
                    className="w-full border-muted-foreground/20"
                    size="lg"
                    onClick={() => login()}
                >
                    <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                    {t('auth.login.google')}
                </Button>

                {/* Apple */}
                <Button
                    className="w-full bg-black text-white hover:bg-black/90 opacity-50 cursor-not-allowed"
                    size="lg"
                    disabled
                >
                    <Apple className="mr-2 w-5 h-5 fill-current" />
                    {t('auth.login.apple')}
                </Button>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-muted" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            {t('auth.login.or')}
                        </span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="w-full text-muted-foreground opacity-50 cursor-not-allowed"
                    disabled
                >
                    <Mail className="mr-2 w-4 h-4" />
                    {t('auth.login.email')}
                </Button>
            </main>
        </div>
    );
};
