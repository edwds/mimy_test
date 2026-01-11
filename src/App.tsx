import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SplashScreen } from '@/screens/onboarding/SplashScreen';
import { StartPage } from '@/screens/onboarding/StartPage';
import { AgeCheckStep } from '@/screens/onboarding/AgeCheckStep';
import { AgreementStep } from '@/screens/onboarding/AgreementStep';
import { LoginPage } from '@/screens/auth/LoginPage';
import { PhoneStep } from '@/screens/register/PhoneStep';
import { OtpStep } from '@/screens/register/OtpStep';
import { ProfileStep } from '@/screens/register/ProfileStep';
import { MainTab } from '@/screens/main/MainTab';
import './i18n';

function App() {
    const [loading, setLoading] = useState(true);
    const isLoggedIn = false; // Force logged out for dev

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <BrowserRouter>
                {loading ? (
                    <SplashScreen />
                ) : (
                    <Routes>
                        <Route path="/" element={isLoggedIn ? <Navigate to="/main" replace /> : <PublicHome />} />

                        {/* Onboarding Flow */}
                        <Route path="/onboarding/age-check" element={<AgeCheckStep />} />
                        <Route path="/onboarding/agreement" element={<AgreementStep />} />

                        {/* Auth */}
                        <Route path="/login" element={<LoginPage />} />

                        {/* Registration Flow */}
                        <Route path="/register/phone" element={<PhoneStep />} />
                        <Route path="/register/otp" element={<OtpStep />} />
                        <Route path="/register/profile" element={<ProfileStep />} />

                        <Route path="/main" element={<MainTab />} />
                    </Routes>
                )}
            </BrowserRouter>
        </GoogleOAuthProvider>
    );
}

const PublicHome = () => {
    const navigate = useNavigate();
    return <StartPage onStart={() => navigate('/onboarding/age-check')} />;
};

export default App;