import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RegionResult {
    name: string;
    fullName: string;
    lat: number;
    lon: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (region: { name: string; lat: number; lon: number }) => void;
    currentRegion?: string;
}

// MapTiler place_type → 행정구역 필터
const ADMIN_TYPES = new Set([
    'region',               // 도/특별시/광역시 (서울특별시, 경기도)
    'county',               // 시/구 (강남구, 성남시)
    'joint_municipality',   // 구 (분당구)
    'subregion',            // 군
    'municipality',         // 시
    'municipal_district',   // 구
]);

export const RegionSearchSheet: React.FC<Props> = ({ open, onClose, onSelect, currentRegion }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<RegionResult[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 300);
        } else {
            setQuery('');
            setResults([]);
        }
    }, [open]);

    // Debounced MapTiler geocoding search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query || query.length < 1 || !apiKey) {
            setResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                // MapTiler forward geocoding - filter to admin regions only
                const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${apiKey}&language=ko&limit=10`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('Geocoding failed');

                const data = await res.json();
                const features = (data.features || []) as any[];

                const mapped: RegionResult[] = features
                    .filter((f: any) => {
                        // Only keep admin-level features
                        const types = f.place_type || [];
                        return types.some((t: string) => ADMIN_TYPES.has(t));
                    })
                    .map((f: any) => ({
                        name: f.text || f.place_name,
                        fullName: f.place_name || f.text,
                        lat: f.center?.[1] || 0,
                        lon: f.center?.[0] || 0,
                    }));

                setResults(mapped);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, apiKey]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={onClose} />

            {/* Sheet */}
            <div className="relative w-full max-w-lg bg-background rounded-t-2xl animate-in slide-in-from-bottom duration-300 max-h-[70vh] flex flex-col">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3">
                    <h3 className="text-lg font-bold">{t('home.sections.search_region')}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
                        <X size={20} />
                    </button>
                </div>

                {/* Search Input */}
                <div className="px-5 pb-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('home.sections.search_region_placeholder')}
                            className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto px-5 pb-8">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-1">
                            {results.map((region, idx) => (
                                <button
                                    key={`${region.name}-${idx}`}
                                    onClick={() => {
                                        onSelect({ name: region.name, lat: region.lat, lon: region.lon });
                                        onClose();
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                                        region.name === currentRegion
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-muted'
                                    }`}
                                >
                                    <MapPin size={16} className="text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{region.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{region.fullName}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : query.length > 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">
                            {t('home.sections.no_region_results')}
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
