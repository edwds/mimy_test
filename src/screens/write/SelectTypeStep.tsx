import React from "react";
import { Utensils, PenLine } from "lucide-react";

interface Props {
    onSelect: (type: "review" | "post") => void;
    onClose?: () => void;
    open?: boolean;
}

export const SelectTypeBottomSheet: React.FC<Props> = ({
    onSelect,
    onClose,
    open = true,
}) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Overlay (backdrop) */}
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 bg-black/40"
            />

            {/* Sheet Panel */}
            <div
                className="
          absolute inset-x-0 bottom-0
          rounded-t-3xl
          bg-[var(--color-surface)]
          border-t border-[var(--color-border)]
          shadow-[0_-12px_40px_rgba(0,0,0,0.25)]
        "
                style={{
                    // iOS safe-area 대응
                    paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
                }}
            >
                {/* Grab handle */}
                <div className="flex justify-center pt-3">
                    <div className="h-1 w-10 rounded-full bg-black/15" />
                </div>

                <div className="px-6 pt-4 pb-2">
                    <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                        어떤 이야기를 기록하시겠어요?
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        기록 타입을 선택하세요
                    </p>
                </div>

                <div className="px-6 pb-4">
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => onSelect("review")}
                            className="
                w-full text-left
                rounded-2xl
                bg-[var(--color-background)]
                border border-[var(--color-border)]
                px-5 py-4
                hover:border-[var(--color-primary)]
                active:scale-[0.99]
                transition
              "
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center">
                                    <Utensils className="w-5 h-5 text-orange-600" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-base font-bold text-[var(--color-text-primary)]">
                                        방문 후기 쓰기
                                    </div>
                                    <div className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                                        다녀온 맛집을 기록하고 랭킹을 매겨보세요
                                    </div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => onSelect("post")}
                            className="
                w-full text-left
                rounded-2xl
                bg-[var(--color-background)]
                border border-[var(--color-border)]
                px-5 py-4
                hover:border-[var(--color-primary)]
                active:scale-[0.99]
                transition
              "
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center">
                                    <PenLine className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-base font-bold text-[var(--color-text-primary)]">
                                        자유 글쓰기
                                    </div>
                                    <div className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                                        맛집 이야기나 미식 경험을 자유롭게 나눠요
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};