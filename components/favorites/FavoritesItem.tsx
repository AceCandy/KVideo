/**
 * FavoritesItem - Individual favorite item card
 * Layout shared with HistoryItem via ListItemRow
 */

import { Icons } from '@/components/ui/Icon';
import { formatDate } from '@/lib/utils/format-utils';
import { buildListItemVideoUrl } from '@/lib/utils/video-url';
import { ListItemRow } from '@/components/ui/ListItemRow';
import type { FavoriteItem } from '@/lib/types';

interface FavoritesItemProps {
    item: FavoriteItem;
    onRemove: () => void;
    isPremium?: boolean;
}

export function FavoritesItem({ item, onRemove, isPremium = false }: FavoritesItemProps) {
    const href = buildListItemVideoUrl({
        videoId: item.videoId,
        source: item.source,
        title: item.title,
        poster: item.poster,
        sourceMap: item.sourceMap,
        isPremium,
    });

    return (
        <ListItemRow
            href={href}
            title={item.title}
            poster={
                <div className="relative w-28 h-16 flex-shrink-0 bg-[var(--glass-bg)] rounded-[var(--radius-2xl)] overflow-hidden">
                    {item.poster ? (
                        <img
                            src={item.poster}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.style.display = 'none';
                            }}
                        />
                    ) : null}
                    {/* Fallback icon */}
                    <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <Icons.Film size={32} className="text-[var(--text-color-secondary)] opacity-30" />
                    </div>
                </div>
            }
            meta={
                <>
                    {item.year && (
                        <p className="text-xs text-[var(--text-color-secondary)] mb-1">
                            {item.year}
                        </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-[var(--text-color-secondary)]">
                        {item.remarks && (
                            <span className="truncate">{item.remarks}</span>
                        )}
                        <span className="flex-shrink-0">
                            {formatDate(item.addedAt)}
                        </span>
                    </div>
                </>
            }
            actions={
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="p-1.5 hover:bg-[var(--glass-bg)] rounded-full cursor-pointer"
                    aria-label="取消收藏"
                >
                    <Icons.Trash size={14} className="text-[var(--text-color-secondary)]" />
                </button>
            }
        />
    );
}
