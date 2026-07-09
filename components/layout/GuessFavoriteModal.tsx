'use client';

import { useState, useEffect, useId } from 'react';
import Image from 'next/image';
import { RefreshCw, Play, Star, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useHistory } from '@/lib/store/history-store';
import { useFavorites } from '@/lib/store/favorites-store';
import { fetchGuessCandidates, type GuessMovie } from '@/lib/utils/guess';

/**
 * 猜你想看弹窗：基于观看历史与收藏挑选一部推荐影片，
 * 支持「换一部」（同批候选内随机换）与「立即观看」（跳对应区搜索该影片）。
 * isPremium 决定使用普通区还是高级区的历史 / 收藏，以及跳转目标。
 */
export function GuessFavoriteModal({
    isOpen,
    onClose,
    isPremium = false,
}: {
    isOpen: boolean;
    onClose: () => void;
    isPremium?: boolean;
}) {
    const titleId = useId();
    const { viewingHistory } = useHistory(isPremium);
    const { favorites } = useFavorites(isPremium);
    const [candidates, setCandidates] = useState<GuessMovie[]>([]);
    const [index, setIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            const list = await fetchGuessCandidates(viewingHistory, favorites);
            if (cancelled) return;
            setCandidates(list);
            setIndex(0);
            setLoading(false);
        };
        run();
        return () => { cancelled = true; };
    }, [isOpen, viewingHistory, favorites]);

    const current = candidates[index];

    const swap = () => {
        if (candidates.length <= 1) return;
        let next = Math.floor(Math.random() * candidates.length);
        while (next === index) next = Math.floor(Math.random() * candidates.length);
        setIndex(next);
    };

    const watch = () => {
        if (!current) return;
        onClose();
        window.location.href = `${isPremium ? '/premium' : '/'}?q=${encodeURIComponent(current.title)}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} titleId={titleId}>
            <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <h2 id={titleId} className="text-base font-bold text-[var(--text-color)]">猜你想看</h2>
                    <button
                        onClick={onClose}
                        aria-label="关闭"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-color-secondary)] hover:text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--text-color)_8%,transparent)] transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="px-5 pb-6 py-10 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-color)] border-t-transparent" />
                    </div>
                ) : !current ? (
                    <div className="px-5 pb-6 py-10 text-center text-sm text-[var(--text-color-secondary)]">
                        暂时没有推荐，稍后再试
                    </div>
                ) : (
                    <div className="px-5 pb-5">
                        <div className="flex gap-4">
                            <div className="w-24 h-36 flex-shrink-0 relative rounded-lg overflow-hidden bg-[var(--glass-border)]">
                                <Image
                                    src={current.cover}
                                    alt={current.title}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-[var(--text-color)] line-clamp-2">{current.title}</h3>
                                {current.rate && current.rate !== '0' && (
                                    <div className="flex items-center gap-1 text-amber-400 text-sm mt-1">
                                        <Star size={14} fill="currentColor" />
                                        {current.rate}
                                    </div>
                                )}
                                <p className="text-xs text-[var(--text-color-secondary)] mt-auto">根据你的观看历史挑选</p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={swap}
                                disabled={candidates.length <= 1}
                                className="flex-1 py-2 rounded-full border border-[var(--glass-border)] text-sm text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--text-color)_8%,transparent)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <RefreshCw size={14} />
                                换一部
                            </button>
                            <button
                                onClick={watch}
                                className="flex-1 py-2 rounded-full bg-[var(--accent-color)] text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:brightness-110 transition-all cursor-pointer"
                            >
                                <Play size={14} />
                                立即观看
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
