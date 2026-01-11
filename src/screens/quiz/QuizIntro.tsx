import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Utensils } from 'lucide-react';
import { motion } from 'framer-motion';

export const QuizIntro = () => {
    const navigate = useNavigate();
    const nickname = "User"; // TODO: Fetch from context/localstorage

    return (
        <div className="flex flex-col h-full bg-background p-6 items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-4"
            >
                <Utensils className="w-16 h-16 text-primary" />
            </motion.div>

            <div className="space-y-4">
                <h1 className="text-3xl font-bold">
                    Hello, {nickname}!<br />
                    Let's find your taste.
                </h1>
                <p className="text-muted-foreground text-lg">
                    Discover your unique taste profile in just 3 minutes.
                </p>
            </div>

            <Button
                size="lg"
                className="w-full max-w-xs text-lg py-6 rounded-full"
                onClick={() => navigate('/quiz/test')}
            >
                Start Quiz
            </Button>
        </div>
    );
};
