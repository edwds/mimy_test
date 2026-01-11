import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Loader2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { resizeImage } from '@/lib/image';

export const ProfileStep = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // 0: Handle, 1: Nickname, 2: Photo
    const [handle, setHandle] = useState("");
    const [nickname, setNickname] = useState("");
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Validation State
    const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debounce Check
    useEffect(() => {
        if (step !== 0 || handle.length < 3) {
            setHandleStatus('idle');
            setErrorMessage(null);
            return;
        }

        const timer = setTimeout(() => {
            checkHandleAvailability(handle);
        }, 1000);

        return () => clearTimeout(timer);
    }, [handle, step]);

    const checkHandleAvailability = async (checkHandle: string) => {
        if (checkHandle.length < 3) return;

        setHandleStatus('checking');
        setErrorMessage(null);

        try {
            const response = await fetch(`http://localhost:3001/api/users/check-handle?handle=${checkHandle}`);
            const data = await response.json();

            if (data.available) {
                setHandleStatus('available');
            } else {
                setHandleStatus('taken');
                setErrorMessage("This ID is already taken.");
            }
        } catch (error) {
            console.error("Check failed", error);
            setHandleStatus('idle'); // Retry allowed
        }
    };

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1);
        } else {
            navigate(-1);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            // 1. Resize
            const resizedBlob = await resizeImage(file, 1280);

            // 2. Upload
            const formData = new FormData();
            formData.append("file", resizedBlob, file.name);

            const response = await fetch("http://localhost:3001/api/upload", {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setPhotoUrl(data.url);
            } else {
                alert("Upload failed");
            }
        } catch (err) {
            console.error(err);
            alert("Error uploading image");
        } finally {
            setUploading(false);
        }
    };

    const handleNext = async () => {
        if (step < 2) {
            if (step === 0 && handleStatus !== 'available') return;
            setStep(step + 1);
        } else {
            // Final submit
            setChecking(true);
            const userId = localStorage.getItem("mimy_user_id");
            if (!userId) {
                navigate('/login');
                return;
            }

            try {
                const birthDate = localStorage.getItem("mimy_reg_birthyear");
                const phone = localStorage.getItem("mimy_reg_phone");

                const response = await fetch(`http://localhost:3001/api/users/${userId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        account_id: handle,
                        nickname: nickname,
                        phone: phone,
                        birthdate: birthDate,
                        profile_image: photoUrl
                    })
                });

                if (response.ok) {
                    localStorage.setItem("mimy_user", "true");
                    // Clear temp reg data
                    localStorage.removeItem("mimy_reg_birthyear");
                    localStorage.removeItem("mimy_reg_phone");
                    navigate('/quiz/intro');
                } else {
                    alert("Failed to save profile");
                    setChecking(false);
                }
            } catch (e) {
                console.error(e);
                alert("Network error");
                setChecking(false);
            }
        }
    };

    const isNextDisabled = () => {
        if (step === 0) return handleStatus !== 'available';
        if (step === 1) return nickname.length < 1;
        if (step === 2) return checking || uploading;
        return false;
    };

    const stepVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <div className="flex flex-col h-full bg-background p-6">
            <header className="flex items-center mb-8 gap-4">
                <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 flex flex-col">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        variants={stepVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="flex-1 flex flex-col space-y-8"
                    >
                        {step === 0 && (
                            <>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-bold">Create your ID</h1>
                                    <p className="text-muted-foreground">This will be your unique handle.</p>
                                </div>

                                <div className="pt-4">
                                    <div
                                        className="
      flex items-baseline gap-1
      border-b-2 border-border
      py-4
      focus-within:border-primary transition-colors
      relative
    "
                                    >
                                        <span className="text-3xl font-bold text-muted-foreground leading-none">
                                            @
                                        </span>

                                        <input
                                            type="text"
                                            placeholder="username"
                                            value={handle}
                                            onChange={(e) => {
                                                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                                                setHandle(val);
                                                setHandleStatus('idle'); // Reset on type
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    checkHandleAvailability(handle);
                                                }
                                            }}
                                            className="
        flex-1
        bg-transparent
        text-3xl font-bold leading-none
        outline-none
        placeholder:text-muted/20
      "
                                            autoFocus
                                        />

                                        {/* Validation Icons */}
                                        <div className="flex items-center absolute right-0 top-1/2 -translate-y-1/2">
                                            {handleStatus === 'checking' && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
                                            {handleStatus === 'available' && <Check className="w-6 h-6 text-green-500" />}
                                            {handleStatus === 'taken' && <X className="w-6 h-6 text-destructive" />}
                                        </div>
                                    </div>
                                    {errorMessage && (
                                        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
                                    )}
                                </div>                            </>
                        )}

                        {step === 1 && (
                            <>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-bold">What is your nickname?</h1>
                                    <p className="text-muted-foreground">This is how you appear to others.</p>
                                </div>
                                <div className="pt-4">
                                    <input
                                        type="text"
                                        placeholder="Nickname"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="w-full text-3xl font-bold bg-transparent border-b-2 border-border py-4 focus:outline-none focus:border-primary transition-colors placeholder:text-muted/20"
                                        autoFocus
                                    />
                                    <p className="mt-4 text-sm text-muted-foreground">
                                        ID: <span className="font-semibold text-primary">@{handle}</span>
                                    </p>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-bold">Add a profile photo</h1>
                                    <p className="text-muted-foreground">Make it recognizable.</p>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center -mt-20">
                                    {/* OUTER: overflow-visible */}
                                    <div className="relative">
                                        {/* CLICKABLE AVATAR SHELL */}
                                        <div
                                            className="
                                            w-40 h-40 rounded-full bg-muted
                                            ring-1 ring-border shadow-sm
                                            hover:ring-2 hover:ring-primary hover:shadow-md
                                            transition
                                            cursor-pointer
                                            flex items-center justify-center
                                            "
                                            onClick={() => fileInputRef.current?.click()}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                                        >
                                            {/* INNER: only this clips the photo */}
                                            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                                                {photoUrl ? (
                                                    <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Camera className="w-10 h-10 text-muted-foreground" />
                                                        <span className="text-sm text-muted-foreground">Upload</span>
                                                    </div>
                                                )}
                                            </div>

                                            {uploading && (
                                                <div className="absolute inset-0 rounded-full bg-background/50 flex items-center justify-center">
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>

                                        {/* EDIT / CAMERA BUTTON (never clipped) */}
                                        {!uploading && (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="
                                                absolute -bottom-1 -right-1
                                                w-11 h-11 rounded-full
                                                bg-primary text-primary-foreground
                                                shadow-md
                                                grid place-items-center
                                                hover:scale-[1.03] active:scale-[0.98]
                                                transition
                                                ring-4 ring-background
                                                "
                                                aria-label="Change profile photo"
                                            >
                                                <Camera className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />

                                    <div className="mt-8 text-center space-y-1">
                                        <h3 className="text-3xl font-bold">{nickname}</h3>
                                        <p className="text-lg text-muted-foreground">@{handle}</p>
                                    </div>
                                </div>                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            <footer className="mt-auto pt-6">
                <Button
                    className="w-full"
                    size="lg"
                    onClick={handleNext}
                    disabled={isNextDisabled()}
                >
                    {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : step === 2 ? "Complete" : "Next"}
                </Button>
            </footer>
        </div>
    );
};
