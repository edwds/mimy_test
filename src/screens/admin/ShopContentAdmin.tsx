import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';

interface ApiResponse {
    success: boolean;
    shopId: number;
    totalUsers: number;
    selectedUsers: number;
    percentage: number;
    targetRank: number;
    satisfaction: string;
    updatedRankings: number;
    updatedReviews: number;
    clearedCacheKeys: number;
    selectedUserAccounts: string[];
}

export const ShopContentAdmin = () => {
    const navigate = useNavigate();

    const [shopId, setShopId] = useState<string>('');
    const [percentage, setPercentage] = useState<number>(50);
    const [rank, setRank] = useState<string>('1');
    const [satisfaction, setSatisfaction] = useState<string>('good');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ApiResponse | null>(null);
    const [error, setError] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!shopId || !rank) {
            setError('Shop ID와 Rank는 필수입니다.');
            return;
        }

        const shopIdNum = parseInt(shopId);
        const rankNum = parseInt(rank);

        if (isNaN(shopIdNum) || isNaN(rankNum)) {
            setError('Shop ID와 Rank는 숫자여야 합니다.');
            return;
        }

        if (rankNum < 1) {
            setError('Rank는 1 이상이어야 합니다.');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/shop-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shopId: shopIdNum,
                    percentage,
                    rank: rankNum,
                    satisfaction,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update');
            }

            const data = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold">Shop Content Admin</h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-bold mb-6">레스토랑 랭킹 일괄 변경</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Shop ID */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Shop ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={shopId}
                                onChange={(e) => setShopId(e.target.value)}
                                placeholder="158"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 mt-1">변경할 레스토랑의 ID를 입력하세요</p>
                        </div>

                        {/* Percentage */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                변경할 유저 비율: {percentage}%
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={percentage}
                                onChange={(e) => setPercentage(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                disabled={loading}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0%</span>
                                <span>25%</span>
                                <span>50%</span>
                                <span>75%</span>
                                <span>100%</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                해당 샵을 방문한 유저 중 랜덤으로 선택
                            </p>
                        </div>

                        {/* Rank */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                목표 순위 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={rank}
                                onChange={(e) => setRank(e.target.value)}
                                placeholder="1"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 mt-1">해당 샵을 몇 위로 만들지 (1 이상)</p>
                        </div>

                        {/* Satisfaction */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                만족도
                            </label>
                            <select
                                value={satisfaction}
                                onChange={(e) => setSatisfaction(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                                disabled={loading}
                            >
                                <option value="best">Best (최고)</option>
                                <option value="good">Good (좋음)</option>
                                <option value="ok">OK (괜찮음)</option>
                                <option value="bad">Bad (별로)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">리뷰의 만족도 값</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? '처리 중...' : '실행하기'}
                        </button>
                    </form>
                </div>

                {/* Result */}
                {result && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="text-green-500">✓</span> 작업 완료
                        </h2>

                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 mb-1">Shop ID</p>
                                    <p className="text-2xl font-bold text-gray-900">{result.shopId}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 mb-1">목표 순위</p>
                                    <p className="text-2xl font-bold text-gray-900">{result.targetRank}위</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 mb-1">전체 유저</p>
                                    <p className="text-2xl font-bold text-gray-900">{result.totalUsers}명</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 mb-1">선택된 유저</p>
                                    <p className="text-2xl font-bold text-orange-500">{result.selectedUsers}명</p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-600">변경 비율</span>
                                    <span className="text-sm font-bold text-gray-900">{result.percentage}%</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-600">만족도</span>
                                    <span className="text-sm font-bold text-gray-900">{result.satisfaction}</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-600">업데이트된 랭킹</span>
                                    <span className="text-sm font-bold text-gray-900">{result.updatedRankings}개</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-600">업데이트된 리뷰</span>
                                    <span className="text-sm font-bold text-gray-900">{result.updatedReviews}개</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-600">삭제된 캐시</span>
                                    <span className="text-sm font-bold text-gray-900">{result.clearedCacheKeys}개</span>
                                </div>
                            </div>

                            {/* Selected Users */}
                            {result.selectedUserAccounts.length > 0 && (
                                <div className="border-t border-gray-200 pt-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                        선택된 유저 ({result.selectedUserAccounts.length}명)
                                    </p>
                                    <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
                                        <div className="flex flex-wrap gap-2">
                                            {result.selectedUserAccounts.map((account, idx) => (
                                                <span
                                                    key={idx}
                                                    className="bg-white px-3 py-1 rounded-full text-xs font-medium text-gray-700 border border-gray-200"
                                                >
                                                    @{account}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-blue-900 mb-2">사용 안내</h3>
                    <ul className="text-xs text-blue-700 space-y-1">
                        <li>• 특정 레스토랑의 유저 랭킹과 리뷰 만족도를 일괄 변경합니다</li>
                        <li>• 변경할 유저는 랜덤으로 선택됩니다</li>
                        <li>• 랭킹 변경 시 다른 샵들의 순위가 자동으로 조정됩니다</li>
                        <li>• 캐시가 자동으로 삭제되어 앱에 즉시 반영됩니다</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
