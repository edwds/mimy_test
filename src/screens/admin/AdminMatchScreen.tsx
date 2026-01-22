import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminMatchScreen = () => {
    const navigate = useNavigate();
    const [shopId, setShopId] = useState('');
    const [viewerId, setViewerId] = useState('');

    // Default params
    const [power, setPower] = useState(2);
    const [alpha, setAlpha] = useState(5);
    const [minReviewers, setMinReviewers] = useState(3);

    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Auto-fill viewer ID from local storage
    useEffect(() => {
        const uid = localStorage.getItem("mimy_user_id");
        if (uid) setViewerId(uid);
    }, []);

    const handleSimulate = async () => {
        if (!shopId || !viewerId) return alert("Shop ID & Viewer ID required");
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/match/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shopId: parseInt(shopId),
                    viewerId: parseInt(viewerId),
                    options: {
                        power,
                        alpha,
                        minReviewers
                    }
                })
            });
            const data = await res.json();
            setResult(data);
        } catch (e) {
            console.error(e);
            alert("Simulation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto border-x bg-white">
            <div className="h-14 flex items-center px-4 border-b bg-white top-0 sticky z-10">
                <button onClick={() => navigate(-1)} className="mr-4">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="font-bold text-lg">Match Score Simulator</h1>
            </div>

            <div className="p-4 space-y-6 overflow-y-auto pb-20">
                {/* Inputs */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <h2 className="font-bold text-gray-700">Inputs</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Shop ID</label>
                            <input
                                value={shopId}
                                onChange={e => setShopId(e.target.value)}
                                className="w-full p-2 border rounded-lg"
                                placeholder="123"
                                inputMode="numeric"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Viewer ID</label>
                            <input
                                value={viewerId}
                                onChange={e => setViewerId(e.target.value)}
                                className="w-full p-2 border rounded-lg"
                                placeholder="456"
                                inputMode="numeric"
                            />
                        </div>
                    </div>
                </div>

                {/* Tunables */}
                <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h2 className="font-bold text-blue-700">Parameters</h2>

                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-gray-600">Power (Quadratic if 2)</label>
                            <span className="text-xs font-mono font-bold">{power}</span>
                        </div>
                        <input
                            type="range" min="1" max="5" step="0.5"
                            value={power} onChange={e => setPower(parseFloat(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-gray-600">Alpha (Prior Weight)</label>
                            <span className="text-xs font-mono font-bold">{alpha}</span>
                        </div>
                        <input
                            type="range" min="0" max="20" step="1"
                            value={alpha} onChange={e => setAlpha(parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-xs font-bold text-gray-600">Min Reviewers</label>
                            <span className="text-xs font-mono font-bold">{minReviewers}</span>
                        </div>
                        <input
                            type="range" min="1" max="10" step="1"
                            value={minReviewers} onChange={e => setMinReviewers(parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <button
                        onClick={handleSimulate}
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-transform"
                    >
                        {loading ? 'Calculating...' : 'Calculate Score'}
                    </button>
                </div>

                {/* Results */}
                {result && (
                    <div className="space-y-4">
                        <div className="text-center p-6 bg-gray-900 text-white rounded-2xl shadow-lg">
                            <div className="text-sm text-gray-400 mb-1">Calculated Score</div>
                            <div className="text-5xl font-black">
                                {result.score === null ? 'NULL' : result.score}
                            </div>
                            {result.score !== null && <div className="text-sm text-orange-400 font-bold mt-2">Match {result.score}%</div>}
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-bold text-gray-900">Reviewers Breakdown</h3>
                            {result.reviewers?.map((r: any, i: number) => (
                                <div key={i} className={`p-3 rounded-lg border text-sm ${r.eligible ? 'bg-white border-gray-200' : 'bg-red-50 border-red-100 opacity-60'}`}>
                                    <div className="flex justify-between font-bold mb-1">
                                        <span>{r.nickname} (ID: {r.userId})</span>
                                        <span className={r.eligible ? "text-green-600" : "text-red-500"}>
                                            {r.eligible ? 'Eligible' : r.reason}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                        <div>Rank: {r.rankPosition} / {r.totalRankedCount}</div>
                                        <div>Match: {r.match_score?.toFixed(1) ?? '-'}%</div>
                                        {r.eligible && (
                                            <>
                                                <div>Percentile: {(r.percentile * 100).toFixed(0)}%</div>
                                                <div>Weight: {r.weight?.toFixed(4)}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
