/**
 * FavoriteButton - Reusable favorite toggle button
 * Heart icon that fills when favorited, with animation.
 *
 * Subscribes to only this card's favorite slice via useStore(api, selector),
 * so a favorite change elsewhere no longer re-renders every button in the grid.
 */

'use client';

import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { favoritesApi, premiumFavoritesApi } from '@/lib/store/favorites-store';
import { toast } from '@/lib/store/toast-store';
import { Icons } from '@/components/ui/Icon';

interface FavoriteButtonProps {
    videoId: string | number;
    source: string;
    title: string;
    poster?: string;
    sourceName?: string;
    type?: string;
    year?: string;
    remarks?: string;
    sourceMap?: Record<string, string | number>;
    className?: string;
    size?: number;
    showTooltip?: boolean;
    isPremium?: boolean;
}

export const FavoriteButton = memo<FavoriteButtonProps>(({
    videoId,
    source,
    title,
    poster,
    sourceName,
    type,
    year,
    remarks,
    sourceMap,
    className = '',
    size = 20,
    showTooltip = true,
    isPremium = false,
}) => {
    // Pick the store dynamically (parameter, not a conditional hook call) and
    // subscribe only to whether THIS item is favorited + the toggle action.
    // Both selectors return stable primitives/references, so unrelated favorites
    // changes do not re-render this button.
    const api = isPremium ? premiumFavoritesApi : favoritesApi;
    const isFav = useStore(api, (s) =>
        s.favorites.some((f) => f.videoId === videoId && f.source === source)
    );
    const toggleFavorite = useStore(api, (s) => s.toggleFavorite);

    const [isAnimating, setIsAnimating] = useState(false);
    const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (animTimerRef.current) clearTimeout(animTimerRef.current);
        };
    }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsAnimating(true);
        const wasAdded = toggleFavorite({
            videoId,
            source,
            title,
            poster,
            sourceName,
            type,
            year,
            remarks,
            sourceMap,
        });

        const trimmedTitle = title && title.length > 20 ? `${title.slice(0, 20)}…` : (title || '');
        if (wasAdded) {
            toast.success(trimmedTitle ? `已收藏「${trimmedTitle}」` : '已收藏', { duration: 2500 });
        } else {
            toast.info('已取消收藏', { duration: 2500 });
        }

        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        animTimerRef.current = setTimeout(() => setIsAnimating(false), 300);
    }, [videoId, source, title, poster, sourceName, type, year, remarks, sourceMap, toggleFavorite]);

    return (
        <button
            onClick={handleClick}
            className={`
        flex items-center justify-center
        p-2 rounded-full
        bg-[var(--glass-bg)] backdrop-blur-[8px]
        border border-[var(--glass-border)]
        hover:scale-110 active:scale-95
        transition-all duration-200 ease-out
        cursor-pointer
        ${isAnimating ? 'scale-125' : ''}
        ${className}
      `}
            aria-label={isFav ? '取消收藏' : '收藏'}
            title={showTooltip ? (isFav ? '取消收藏' : '收藏') : undefined}
        >
            {isFav ? (
                <span
                    className="transition-transform duration-200"
                    style={{
                        transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
                        filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))',
                        display: 'flex',
                    }}
                >
                    <Icons.HeartFilled
                        size={size}
                        className="text-red-500"
                    />
                </span>
            ) : (
                <Icons.Heart
                    size={size}
                    className="text-[var(--text-color-secondary)] hover:text-red-400 transition-colors"
                />
            )}
        </button>
    );
});

FavoriteButton.displayName = 'FavoriteButton';
