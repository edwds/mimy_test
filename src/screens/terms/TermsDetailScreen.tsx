import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = import.meta.env.VITE_API_URL || '';

interface Term {
    id: number;
    code: string;
    title: string;
    content: string;
    summary: string | null;
    is_required: boolean;
    version: string;
    effective_date: string;
}

export const TermsDetailScreen = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const [term, setTerm] = useState<Term | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTerm = async () => {
            try {
                const response = await fetch(`${API_URL}/api/terms/${code}`);
                if (!response.ok) {
                    throw new Error('Term not found');
                }
                const data = await response.json();
                setTerm(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load term');
            } finally {
                setLoading(false);
            }
        };

        if (code) {
            fetchTerm();
        }
    }, [code]);

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-background px-6 pt-safe-offset-6 pb-safe-offset-6">
                <header className="flex items-center mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                </div>
            </div>
        );
    }

    if (error || !term) {
        return (
            <div className="flex flex-col h-full bg-background px-6 pt-safe-offset-6 pb-safe-offset-6">
                <header className="flex items-center mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-muted-foreground">{error || 'Term not found'}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            <header className="flex items-center px-6 mb-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-semibold ml-2">{term.title}</h1>
            </header>

            <div className="flex-1 overflow-y-auto px-6 pb-8">
                <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-table:text-sm prose-th:text-left prose-th:font-semibold prose-th:text-foreground prose-td:text-muted-foreground prose-hr:border-border">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{term.content}</ReactMarkdown>
                </article>
            </div>
        </div>
    );
};
