import { useState } from 'react';
import { ArrowLeft, Search, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';

interface ScrapeResult {
    shopId: number;
    shopName: string;
    currentFoodKind: string | null;
    scrapedCategory: string | null;
    allCategories: string[];
    scrapedShopName: string | null;
    scrapedAddress: string | null;
    error?: string;
}

interface BatchResult {
    shopId: number;
    shopName: string;
    oldFoodKind: string | null;
    newCategory: string | null;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
}

interface BatchResponse {
    summary: {
        total: number;
        success: number;
        failed: number;
        skipped: number;
    };
    results: BatchResult[];
}

export const ShopCategoryAdmin = () => {
    const navigate = useNavigate();

    // 개별 조회 상태
    const [shopId, setShopId] = useState<string>('');
    const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
    const [scrapeLoading, setScrapeLoading] = useState(false);
    const [scrapeError, setScrapeError] = useState<string>('');

    // 배치 상태
    const [batchLimit, setBatchLimit] = useState<number>(20);
    const [onlyGeneric, setOnlyGeneric] = useState(true);
    const [batchResult, setBatchResult] = useState<BatchResponse | null>(null);
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchError, setBatchError] = useState<string>('');

    // 선택된 업데이트 항목
    const [selectedUpdates, setSelectedUpdates] = useState<Set<number>>(new Set());

    // 개별 스크래핑
    const handleScrape = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!shopId) {
            setScrapeError('Shop ID를 입력하세요.');
            return;
        }

        const shopIdNum = parseInt(shopId);
        if (isNaN(shopIdNum)) {
            setScrapeError('Shop ID는 숫자여야 합니다.');
            return;
        }

        setScrapeLoading(true);
        setScrapeError('');
        setScrapeResult(null);

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/shop/${shopIdNum}/scrape-category`, {
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to scrape');
            }

            const data = await response.json();
            setScrapeResult(data);
        } catch (err: any) {
            setScrapeError(err.message || 'Unknown error');
        } finally {
            setScrapeLoading(false);
        }
    };

    // 개별 food_kind 업데이트
    const handleApplySingle = async (newFoodKind: string) => {
        if (!scrapeResult) return;

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/shop/${scrapeResult.shopId}/food-kind`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ food_kind: newFoodKind }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update');
            }

            // 결과 업데이트
            setScrapeResult({
                ...scrapeResult,
                currentFoodKind: newFoodKind,
            });
            alert('업데이트 완료!');
        } catch (err: any) {
            alert('업데이트 실패: ' + err.message);
        }
    };

    // 배치 스크래핑
    const handleBatchScrape = async () => {
        setBatchLoading(true);
        setBatchError('');
        setBatchResult(null);
        setSelectedUpdates(new Set());

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/shops/scrape-categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    onlyGeneric,
                    limit: batchLimit,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Batch scraping failed');
            }

            const data: BatchResponse = await response.json();
            setBatchResult(data);

            // 성공한 항목 자동 선택
            const successIds = new Set(
                data.results
                    .filter(r => r.status === 'success' && r.newCategory)
                    .map(r => r.shopId)
            );
            setSelectedUpdates(successIds);
        } catch (err: any) {
            setBatchError(err.message || 'Unknown error');
        } finally {
            setBatchLoading(false);
        }
    };

    // 선택된 항목 일괄 적용
    const handleApplySelected = async () => {
        if (!batchResult || selectedUpdates.size === 0) return;

        const updates = batchResult.results
            .filter(r => selectedUpdates.has(r.shopId) && r.newCategory)
            .map(r => ({
                shopId: r.shopId,
                food_kind: r.newCategory!,
            }));

        if (updates.length === 0) {
            alert('적용할 항목이 없습니다.');
            return;
        }

        try {
            const response = await authFetch(`${API_BASE_URL}/api/admin/shops/apply-categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Apply failed');
            }

            const data = await response.json();
            alert(`${data.updated}개 업데이트 완료!`);

            // 결과 갱신
            setBatchResult({
                ...batchResult,
                results: batchResult.results.map(r => {
                    if (selectedUpdates.has(r.shopId) && r.newCategory) {
                        return { ...r, oldFoodKind: r.newCategory };
                    }
                    return r;
                }),
            });
            setSelectedUpdates(new Set());
        } catch (err: any) {
            alert('적용 실패: ' + err.message);
        }
    };

    const toggleSelect = (shopId: number) => {
        const newSet = new Set(selectedUpdates);
        if (newSet.has(shopId)) {
            newSet.delete(shopId);
        } else {
            newSet.add(shopId);
        }
        setSelectedUpdates(newSet);
    };

    const selectAll = () => {
        if (!batchResult) return;
        const successIds = new Set(
            batchResult.results
                .filter(r => r.status === 'success' && r.newCategory)
                .map(r => r.shopId)
        );
        setSelectedUpdates(successIds);
    };

    const deselectAll = () => {
        setSelectedUpdates(new Set());
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
                    <h1 className="text-xl font-bold">Shop Category Admin</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
                {/* 개별 조회 섹션 */}
                <section className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">개별 Shop 카테고리 조회</h2>

                    <form onSubmit={handleScrape} className="flex gap-3 mb-4">
                        <input
                            type="text"
                            value={shopId}
                            onChange={(e) => setShopId(e.target.value)}
                            placeholder="Shop ID 입력"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={scrapeLoading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                        >
                            {scrapeLoading ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <Search size={18} />
                            )}
                            스크랩
                        </button>
                    </form>

                    {scrapeError && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                            <AlertCircle size={18} />
                            {scrapeError}
                        </div>
                    )}

                    {scrapeResult && (
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Shop Name:</span>
                                    <span className="font-medium">{scrapeResult.shopName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">현재 food_kind:</span>
                                    <span className="font-medium text-orange-600">
                                        {scrapeResult.currentFoodKind || '(없음)'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">스크랩 카테고리:</span>
                                    <span className="font-medium text-blue-600">
                                        {scrapeResult.scrapedCategory || '(못 찾음)'}
                                    </span>
                                </div>
                                {scrapeResult.allCategories.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">모든 카테고리:</span>
                                        <span className="font-medium">
                                            {scrapeResult.allCategories.join(', ')}
                                        </span>
                                    </div>
                                )}
                                {scrapeResult.error && (
                                    <div className="flex justify-between text-red-600">
                                        <span>에러:</span>
                                        <span>{scrapeResult.error}</span>
                                    </div>
                                )}
                            </div>

                            {scrapeResult.scrapedCategory && scrapeResult.scrapedCategory !== scrapeResult.currentFoodKind && (
                                <button
                                    onClick={() => handleApplySingle(scrapeResult.scrapedCategory!)}
                                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    <Check size={18} />
                                    "{scrapeResult.scrapedCategory}" 적용하기
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* 배치 스크래핑 섹션 */}
                <section className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">배치 카테고리 스크래핑</h2>

                    <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <label className="text-gray-600">개수:</label>
                            <input
                                type="number"
                                value={batchLimit}
                                onChange={(e) => setBatchLimit(parseInt(e.target.value) || 20)}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                                min={1}
                                max={100}
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={onlyGeneric}
                                onChange={(e) => setOnlyGeneric(e.target.checked)}
                                className="w-5 h-5 rounded"
                            />
                            <span className="text-gray-600">일반 카테고리만 (음식점, restaurant 등)</span>
                        </label>
                        <button
                            onClick={handleBatchScrape}
                            disabled={batchLoading}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
                        >
                            {batchLoading ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <RefreshCw size={18} />
                            )}
                            배치 스크랩 시작
                        </button>
                    </div>

                    {batchError && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 mb-4">
                            <AlertCircle size={18} />
                            {batchError}
                        </div>
                    )}

                    {batchResult && (
                        <>
                            {/* 요약 */}
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div className="p-3 bg-gray-100 rounded-lg text-center">
                                    <div className="text-2xl font-bold">{batchResult.summary.total}</div>
                                    <div className="text-sm text-gray-600">전체</div>
                                </div>
                                <div className="p-3 bg-green-100 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-700">{batchResult.summary.success}</div>
                                    <div className="text-sm text-green-600">성공</div>
                                </div>
                                <div className="p-3 bg-red-100 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-700">{batchResult.summary.failed}</div>
                                    <div className="text-sm text-red-600">실패</div>
                                </div>
                                <div className="p-3 bg-yellow-100 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-yellow-700">{batchResult.summary.skipped}</div>
                                    <div className="text-sm text-yellow-600">스킵</div>
                                </div>
                            </div>

                            {/* 선택 버튼 */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={selectAll}
                                    className="px-4 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                                >
                                    전체 선택
                                </button>
                                <button
                                    onClick={deselectAll}
                                    className="px-4 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                                >
                                    전체 해제
                                </button>
                                {selectedUpdates.size > 0 && (
                                    <button
                                        onClick={handleApplySelected}
                                        className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                        선택한 {selectedUpdates.size}개 적용
                                    </button>
                                )}
                            </div>

                            {/* 결과 테이블 */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left">선택</th>
                                            <th className="px-3 py-2 text-left">ID</th>
                                            <th className="px-3 py-2 text-left">이름</th>
                                            <th className="px-3 py-2 text-left">기존</th>
                                            <th className="px-3 py-2 text-left">새 카테고리</th>
                                            <th className="px-3 py-2 text-left">상태</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {batchResult.results.map((r) => (
                                            <tr key={r.shopId} className={r.status === 'success' ? 'bg-green-50' : ''}>
                                                <td className="px-3 py-2">
                                                    {r.status === 'success' && r.newCategory && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUpdates.has(r.shopId)}
                                                            onChange={() => toggleSelect(r.shopId)}
                                                            className="w-4 h-4"
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">{r.shopId}</td>
                                                <td className="px-3 py-2 max-w-[150px] truncate">{r.shopName}</td>
                                                <td className="px-3 py-2 text-orange-600">{r.oldFoodKind || '-'}</td>
                                                <td className="px-3 py-2 text-blue-600 font-medium">{r.newCategory || '-'}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        r.status === 'success' ? 'bg-green-200 text-green-800' :
                                                        r.status === 'failed' ? 'bg-red-200 text-red-800' :
                                                        'bg-yellow-200 text-yellow-800'
                                                    }`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ShopCategoryAdmin;
