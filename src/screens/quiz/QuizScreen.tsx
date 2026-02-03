import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ThumbsUp, X, Minus } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { QUESTIONS } from '@/data/quiz';
import { useUser } from '@/context/UserContext';

export const QuizScreen = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);

    const currentQuestion = QUESTIONS[currentIndex];
    const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;
    const hasExistingProfile = !!user?.taste_result;

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    const handleClose = () => {
        navigate(-1);
    };

    const handleSwipe = (direction: 'left' | 'right' | 'up') => {
        // Map swipe direction to answer value
        // left = -1 (싫어요), up = 0 (별생각없어요), right = +1 (좋아요)
        const val = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;

        setExitDirection(direction);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));

        // Next Question
        setTimeout(() => {
            setExitDirection(null);
            if (currentIndex < QUESTIONS.length - 1) {
                setCurrentIndex(prev => prev + 1);
                x.set(0);
                y.set(0);
            } else {
                finishQuiz({ ...answers, [currentQuestion.id]: val });
            }
        }, 300);
    };

    const handleDragEnd = (_: any, info: PanInfo) => {
        const xOffset = info.offset.x;
        const yOffset = info.offset.y;
        const xVelocity = info.velocity.x;
        const yVelocity = info.velocity.y;

        // Determine swipe direction based on offset and velocity
        if (Math.abs(yOffset) > 100 && Math.abs(yVelocity) > 300 && yOffset < 0) {
            // Up swipe
            handleSwipe('up');
        } else if (Math.abs(xOffset) > 150 || Math.abs(xVelocity) > 500) {
            if (xOffset > 0) {
                // Right swipe
                handleSwipe('right');
            } else {
                // Left swipe
                handleSwipe('left');
            }
        } else {
            // Reset position if not swiped far enough
            x.set(0);
            y.set(0);
        }
    };

    const finishQuiz = async (finalAnswers: Record<number, number>) => {
        setIsSubmitting(true);
        try {
            const userId = user?.id || localStorage.getItem("mimy_user_id");
            console.log('[QuizScreen] Submitting quiz with userId:', userId);

            if (!userId) {
                console.error('[QuizScreen] No userId found!');
                alert('로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
                navigate('/start');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/quiz/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, answers: finalAnswers })
            });

            if (!response.ok) throw new Error("Quiz submission failed");

            const data = await response.json();
            // Expected data.result = { clusterId, clusterData, scores }

            navigate('/quiz/result', { state: { result: data.result } });

        } catch (error) {
            console.error(error);
            alert("Failed to submit quiz. Please try again.");
            setIsSubmitting(false);
        }
    };

    if (isSubmitting) {
        return (
            <div className="flex items-center justify-center h-full bg-background">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                    <p className="text-lg font-medium text-muted-foreground">Analyzing your taste profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            {/* Header with counter and close button */}
            <div className="px-6 pb-4">
                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-muted-foreground">
                        {currentIndex + 1} / {QUESTIONS.length}
                    </span>
                    {hasExistingProfile && (
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Swipe Instructions */}
            <div className="px-6 py-4 flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <X className="w-5 h-5 text-red-500" />
                    <span>싫어요</span>
                </div>
                <div className="flex items-center gap-2">
                    <Minus className="w-5 h-5 text-gray-400" />
                    <span>별로</span>
                </div>
                <div className="flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-green-500" />
                    <span>좋아요</span>
                </div>
            </div>

            {/* Stacked Cards Container */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-6 relative">
                {/* Card Stack - wider cards */}
                <div className="relative w-full max-w-md aspect-[3/4]">
                    {/* Background stacked cards (next 2 cards) */}
                    {currentIndex + 2 < QUESTIONS.length && (
                        <div className="absolute inset-0 bg-card border border-border rounded-3xl shadow-lg"
                            style={{
                                transform: 'translateY(16px) scale(0.92)',
                                opacity: 0.4,
                                zIndex: 1
                            }}
                        />
                    )}
                    {currentIndex + 1 < QUESTIONS.length && (
                        <div className="absolute inset-0 bg-card border border-border rounded-3xl shadow-xl"
                            style={{
                                transform: 'translateY(8px) scale(0.96)',
                                opacity: 0.7,
                                zIndex: 2
                            }}
                        />
                    )}

                    {/* Active Card */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            style={{
                                x: exitDirection ? (exitDirection === 'left' ? -300 : exitDirection === 'right' ? 300 : 0) : x,
                                y: exitDirection === 'up' ? -300 : y,
                                rotate,
                                opacity: exitDirection ? 0 : opacity,
                                zIndex: 3
                            }}
                            drag={!exitDirection}
                            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                            dragElastic={1}
                            onDragEnd={handleDragEnd}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-card border-2 border-border rounded-3xl shadow-2xl p-10 cursor-grab active:cursor-grabbing flex items-center"
                        >
                            <h2 className="text-3xl font-bold leading-tight text-left w-full">
                                {currentQuestion.text}
                            </h2>

                            {/* Visual feedback indicators */}
                            <motion.div
                                className="absolute top-6 right-6 bg-green-500 text-white rounded-full p-3 shadow-lg"
                                style={{
                                    opacity: useTransform(x, [0, 100], [0, 1])
                                }}
                            >
                                <ThumbsUp className="w-6 h-6" />
                            </motion.div>

                            <motion.div
                                className="absolute top-6 left-6 bg-red-500 text-white rounded-full p-3 shadow-lg"
                                style={{
                                    opacity: useTransform(x, [-100, 0], [1, 0])
                                }}
                            >
                                <X className="w-6 h-6" />
                            </motion.div>

                            <motion.div
                                className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-400 text-white rounded-full p-3 shadow-lg"
                                style={{
                                    opacity: useTransform(y, [-100, 0], [1, 0])
                                }}
                            >
                                <Minus className="w-6 h-6" />
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Button Controls */}
                <div className="flex items-center justify-center gap-6 mt-8">
                    <button
                        onClick={() => handleSwipe('left')}
                        disabled={!!exitDirection}
                        className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-full p-4 shadow-lg transition-all active:scale-95"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <button
                        onClick={() => handleSwipe('up')}
                        disabled={!!exitDirection}
                        className="bg-gray-400 hover:bg-gray-500 disabled:opacity-50 text-white rounded-full p-4 shadow-lg transition-all active:scale-95"
                    >
                        <Minus className="w-8 h-8" />
                    </button>

                    <button
                        onClick={() => handleSwipe('right')}
                        disabled={!!exitDirection}
                        className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-full p-4 shadow-lg transition-all active:scale-95"
                    >
                        <ThumbsUp className="w-8 h-8" />
                    </button>
                </div>

                {/* Helper text */}
                <div className="mt-6 text-center text-sm text-muted-foreground">
                    카드를 밀거나 버튼을 눌러주세요
                </div>
            </main>
        </div>
    );
};
