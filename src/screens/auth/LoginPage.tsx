import { Apple, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';

export const LoginPage = () => {
    const navigate = useNavigate();

    // Mock login success
    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                // Send access token to backend
                const response = await fetch("http://localhost:3001/api/auth/google", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: tokenResponse.access_token })
                });

                if (response.ok) {
                    const { user, isNew } = await response.json();
                    localStorage.setItem("mimy_user_id", user.id.toString());

                    if (isNew) {
                        navigate('/register/phone');
                    } else {
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
                    <h1 className="text-2xl font-bold tracking-tight">Login to mimy</h1>
                    <p className="text-muted-foreground">Rank what you ate.</p>
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
                    Continue with Google
                </Button>

                {/* Apple */}
                <Button
                    className="w-full bg-black text-white hover:bg-black/90 opacity-50 cursor-not-allowed"
                    size="lg"
                    disabled
                >
                    <Apple className="mr-2 w-5 h-5 fill-current" />
                    Continue with Apple
                </Button>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-muted" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            Or
                        </span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="w-full text-muted-foreground opacity-50 cursor-not-allowed"
                    disabled
                >
                    <Mail className="mr-2 w-4 h-4" />
                    Continue with Email
                </Button>
            </main>
        </div>
    );
};
