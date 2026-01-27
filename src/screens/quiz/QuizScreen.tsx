import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

import { motion, AnimatePresence } from 'framer-motion';
import { QUESTIONS } from '@/data/quiz';

export const QuizScreen = () => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentQuestion = QUESTIONS[currentIndex];
    const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;

    const handleAnswer = (val: number) => {
        // Update answers for UI state
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));

        // Next Question
        if (currentIndex < QUESTIONS.length - 1) {
            setTimeout(() => setCurrentIndex(prev => prev + 1), 250);
        } else {
            // Wait a bit to show selection
            setTimeout(() => finishQuiz({ ...answers, [currentQuestion.id]: val }), 250);
        }
    };

    const finishQuiz = async (finalAnswers: Record<number, number>) => {
        setIsSubmitting(true);
        try {
            const userId = localStorage.getItem("mimy_user_id");
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

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            navigate(-1);
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
            {/* Header / Progress */}
            <div className="px-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-muted">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-muted-foreground">
                        {currentIndex + 1} / {QUESTIONS.length}
                    </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>

            {/* Question Card */}
            <main className="flex-1 flex flex-col justify-center p-6 space-y-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        <h2 className="text-3xl font-bold leading-tight">
                            {currentQuestion.text}
                        </h2>
                    </motion.div>
                </AnimatePresence>

                {/* Likert Scale */}
                <div className="space-y-4">
                    <div className="flex justify-between px-2 text-sm text-muted-foreground font-medium">
                        <span>Disagree</span>
                        <span>Agree</span>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                            <button
                                key={val}
                                onClick={() => handleAnswer(val)}
                                className={`
                                    rounded-full flex items-center justify-center transition-all duration-200 border-2
                                    ${val === 3 ? "w-12 h-12" : "w-14 h-14"} 
                                    ${answers[currentQuestion.id] === val
                                        ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg"
                                        : "bg-background border-muted hover:border-primary/50 text-muted-foreground"}
                                `}
                            >
                                {answers[currentQuestion.id] === val && <Check className="w-6 h-6" />}
                            </button>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};
