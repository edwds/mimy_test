import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface Banner {
    id: number;
    title: string;
    description: string | null;
    action_type: 'write' | 'link' | 'navigate';
    action_value: string | null;
    background_gradient: string;
    icon_type: 'pen' | 'user' | 'custom' | null;
    icon_url: string | null;
    is_active: boolean;
    display_order: number;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    updated_at: string;
}

interface BannerFormData {
    title: string;
    description: string;
    action_type: 'write' | 'link' | 'navigate';
    action_value: string;
    background_gradient: string;
    icon_type: 'pen' | 'user' | 'custom' | null;
    icon_url: string;
    is_active: boolean;
    display_order: number;
    start_date: string;
    end_date: string;
}

export const BannerAdminScreen = () => {
    const navigate = useNavigate();
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<BannerFormData>({
        title: '',
        description: '',
        action_type: 'write',
        action_value: '',
        background_gradient: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)',
        icon_type: 'pen',
        icon_url: '',
        is_active: true,
        display_order: 0,
        start_date: '',
        end_date: '',
    });

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/banners/all`);
            if (res.ok) {
                const data = await res.json();
                setBanners(data);
            }
        } catch (error) {
            console.error('Failed to fetch banners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setIsCreating(true);
        setFormData({
            title: '',
            description: '',
            action_type: 'write',
            action_value: '',
            background_gradient: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)',
            icon_type: 'pen',
            icon_url: '',
            is_active: true,
            display_order: banners.length,
            start_date: '',
            end_date: '',
        });
    };

    const handleEdit = (banner: Banner) => {
        setEditingId(banner.id);
        setFormData({
            title: banner.title,
            description: banner.description || '',
            action_type: banner.action_type,
            action_value: banner.action_value || '',
            background_gradient: banner.background_gradient,
            icon_type: banner.icon_type,
            icon_url: banner.icon_url || '',
            is_active: banner.is_active,
            display_order: banner.display_order,
            start_date: banner.start_date ? banner.start_date.split('T')[0] : '',
            end_date: banner.end_date ? banner.end_date.split('T')[0] : '',
        });
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
            };

            if (isCreating) {
                const res = await authFetch(`${API_BASE_URL}/api/banners`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    await fetchBanners();
                    setIsCreating(false);
                }
            } else if (editingId) {
                const res = await authFetch(`${API_BASE_URL}/api/banners/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    await fetchBanners();
                    setEditingId(null);
                }
            }
        } catch (error) {
            console.error('Failed to save banner:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            const res = await authFetch(`${API_BASE_URL}/api/banners/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                await fetchBanners();
            }
        } catch (error) {
            console.error('Failed to delete banner:', error);
        }
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingId(null);
    };

    const toggleActive = async (banner: Banner) => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/banners/${banner.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !banner.is_active }),
            });

            if (res.ok) {
                await fetchBanners();
            }
        } catch (error) {
            console.error('Failed to toggle banner:', error);
        }
    };

    const presetGradients = [
        { name: '기본 (라이트 퍼플)', value: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' },
        { name: '오렌지 선셋', value: 'linear-gradient(135deg, #FFF5E1 0%, #FFE4E1 100%)' },
        { name: '민트 프레시', value: 'linear-gradient(135deg, #E0F7F7 0%, #E8F8F5 100%)' },
        { name: '핑크 블러시', value: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4F3 100%)' },
        { name: '블루 스카이', value: 'linear-gradient(135deg, #E6F3FF 0%, #F0F8FF 100%)' },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto p-6 pb-20">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">배너 관리</h1>
                        <p className="text-muted-foreground mt-2">홈 피드 상단에 표시될 배너를 관리합니다</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/main')}>
                            홈으로
                        </Button>
                        <Button onClick={handleCreate} disabled={isCreating || editingId !== null}>
                            <Plus size={16} className="mr-2" />
                            새 배너 추가
                        </Button>
                    </div>
                </div>

                {/* Create/Edit Form */}
                {(isCreating || editingId) && (
                    <div className="bg-card p-6 rounded-lg border mb-8">
                        <h2 className="text-xl font-bold mb-4">
                            {isCreating ? '새 배너 만들기' : '배너 수정'}
                        </h2>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    제목 ({`{{name}}`}: 사용자 이름으로 치환)
                                </label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-md"
                                    rows={2}
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={`예: {{name}}님,\n오늘 뭐 먹었어요?`}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium mb-2">설명 (선택)</label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-md"
                                    rows={2}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="간단한 사진 한 장으로\n내 미식 취향을 완성하세요"
                                />
                            </div>

                            {/* Action Type */}
                            <div>
                                <label className="block text-sm font-medium mb-2">액션 타입</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-md"
                                    value={formData.action_type}
                                    onChange={(e) => setFormData({ ...formData, action_type: e.target.value as any })}
                                >
                                    <option value="write">글쓰기</option>
                                    <option value="link">외부 링크</option>
                                    <option value="navigate">내부 페이지 이동</option>
                                </select>
                            </div>

                            {/* Action Value */}
                            {(formData.action_type === 'link' || formData.action_type === 'navigate') && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        {formData.action_type === 'link' ? 'URL' : '라우트 경로'}
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-md"
                                        value={formData.action_value}
                                        onChange={(e) => setFormData({ ...formData, action_value: e.target.value })}
                                        placeholder={formData.action_type === 'link' ? 'https://example.com' : '/main/profile'}
                                    />
                                </div>
                            )}

                            {/* Background Gradient */}
                            <div>
                                <label className="block text-sm font-medium mb-2">배경 그라데이션</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                                    {presetGradients.map((preset) => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            className={`p-3 rounded-lg border-2 text-left ${
                                                formData.background_gradient === preset.value
                                                    ? 'border-primary'
                                                    : 'border-transparent'
                                            }`}
                                            style={{ background: preset.value }}
                                            onClick={() => setFormData({ ...formData, background_gradient: preset.value })}
                                        >
                                            <span className="text-xs font-medium">{preset.name}</span>
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                    value={formData.background_gradient}
                                    onChange={(e) => setFormData({ ...formData, background_gradient: e.target.value })}
                                    placeholder="linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)"
                                />
                            </div>

                            {/* Icon Type */}
                            <div>
                                <label className="block text-sm font-medium mb-2">아이콘 타입</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-md"
                                    value={formData.icon_type || ''}
                                    onChange={(e) => setFormData({ ...formData, icon_type: e.target.value as any || null })}
                                >
                                    <option value="">없음</option>
                                    <option value="pen">펜 아이콘</option>
                                    <option value="user">사용자 프로필 + 펜</option>
                                    <option value="custom">커스텀 이미지</option>
                                </select>
                            </div>

                            {/* Icon URL */}
                            {formData.icon_type === 'custom' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">아이콘 이미지 URL</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-md"
                                        value={formData.icon_url}
                                        onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                                        placeholder="https://example.com/icon.png"
                                    />
                                </div>
                            )}

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">시작일 (선택)</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border rounded-md"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">종료일 (선택)</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border rounded-md"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Display Order & Active */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">표시 순서</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-md"
                                        value={formData.display_order}
                                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">활성화</label>
                                    <label className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <span>배너 활성화</span>
                                    </label>
                                </div>
                            </div>

                            {/* Preview */}
                            <div>
                                <label className="block text-sm font-medium mb-2">미리보기</label>
                                <div
                                    className="p-6 rounded-3xl shadow-sm relative overflow-hidden"
                                    style={{ background: formData.background_gradient }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 pr-4">
                                            <h2 className="text-xl font-bold mb-2 whitespace-pre-line">
                                                {formData.title.replace('{{name}}', '홍길동')}
                                            </h2>
                                            {formData.description && (
                                                <p className="text-muted-foreground text-sm whitespace-pre-line">
                                                    {formData.description}
                                                </p>
                                            )}
                                        </div>
                                        {formData.icon_type === 'pen' && (
                                            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                                ✏️
                                            </div>
                                        )}
                                        {formData.icon_type === 'custom' && formData.icon_url && (
                                            <img
                                                src={formData.icon_url}
                                                alt="Icon"
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4">
                                <Button onClick={handleSave}>
                                    <Save size={16} className="mr-2" />
                                    저장
                                </Button>
                                <Button variant="outline" onClick={handleCancel}>
                                    <X size={16} className="mr-2" />
                                    취소
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Banner List */}
                <div className="space-y-4">
                    {banners.map((banner) => {
                        // 현재 편집 중인 배너는 리스트에서 숨김
                        if (editingId === banner.id) {
                            return null;
                        }

                        return (
                            <div
                                key={banner.id}
                                className={`bg-card p-6 rounded-lg border ${
                                    !banner.is_active ? 'opacity-50' : ''
                                }`}
                            >
                            <div className="flex items-start gap-4">
                                <div className="cursor-move text-muted-foreground">
                                    <GripVertical size={20} />
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg whitespace-pre-line">{banner.title}</h3>
                                            {banner.description && (
                                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                                    {banner.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleActive(banner)}
                                                className="p-2 hover:bg-muted rounded"
                                                title={banner.is_active ? '비활성화' : '활성화'}
                                            >
                                                {banner.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(banner)}
                                                className="p-2 hover:bg-muted rounded"
                                                disabled={editingId !== null || isCreating}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(banner.id)}
                                                className="p-2 hover:bg-muted rounded text-red-500"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span className="px-2 py-1 bg-muted rounded">
                                            {banner.action_type === 'write' && '글쓰기'}
                                            {banner.action_type === 'link' && `링크: ${banner.action_value}`}
                                            {banner.action_type === 'navigate' && `이동: ${banner.action_value}`}
                                        </span>
                                        <span className="px-2 py-1 bg-muted rounded">순서: {banner.display_order}</span>
                                        {banner.start_date && (
                                            <span className="px-2 py-1 bg-muted rounded">
                                                시작: {new Date(banner.start_date).toLocaleDateString()}
                                            </span>
                                        )}
                                        {banner.end_date && (
                                            <span className="px-2 py-1 bg-muted rounded">
                                                종료: {new Date(banner.end_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Preview */}
                                    <div
                                        className="mt-4 p-4 rounded-2xl"
                                        style={{ background: banner.background_gradient }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm whitespace-pre-line">
                                                    {banner.title.replace('{{name}}', '홍길동')}
                                                </p>
                                            </div>
                                            {banner.icon_type === 'pen' && <span>✏️</span>}
                                            {banner.icon_type === 'custom' && banner.icon_url && (
                                                <img
                                                    src={banner.icon_url}
                                                    alt="Icon"
                                                    className="w-8 h-8 rounded-full object-cover"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })}

                    {banners.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground">
                            배너가 없습니다. 새 배너를 추가해주세요.
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
};
