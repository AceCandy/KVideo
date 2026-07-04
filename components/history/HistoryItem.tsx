/**
 * HistoryItem - Individual watch history item
 * Layout shared with FavoritesItem via ListItemRow
 */

import { Icons } from '@/components/ui/Icon';
import { formatTime, formatDate } from '@/lib/utils/format-utils';
import { PosterImage } from './PosterImage';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { buildListItemVideoUrl } from '@/lib/utils/video-url';
import { ListItemRow } from '@/components/ui/ListItemRow';
import type { VideoHistoryItem } from '@/lib/types';

interface HistoryItemProps {
  item: VideoHistoryItem;
  onRemove: () => void;
  isPremium?: boolean;
}

export function HistoryItem({ item, onRemove, isPremium = false }: HistoryItemProps) {
  const href = buildListItemVideoUrl({
    videoId: item.videoId,
    source: item.source,
    title: item.title,
    poster: item.poster,
    sourceMap: item.sourceMap,
    episode: item.episodeIndex,
    isPremium,
  });

  const progress = (item.playbackPosition / item.duration) * 100;
  const episodeText = item.episodes && item.episodes.length > 0
    ? item.episodes[item.episodeIndex]?.name || `第${item.episodeIndex + 1}集`
    : '';

  return (
    <ListItemRow
      href={href}
      title={item.title}
      poster={<PosterImage poster={item.poster} title={item.title} progress={progress} />}
      meta={
        <>
          {episodeText && (
            <p className="text-xs text-[var(--text-color-secondary)] mb-1">
              {episodeText}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-[var(--text-color-secondary)]">
            <span>{formatTime(item.playbackPosition)} / {formatTime(item.duration)}</span>
            <span>{formatDate(item.timestamp)}</span>
          </div>
        </>
      }
      actions={
        <>
          <FavoriteButton
            videoId={item.videoId}
            source={item.source}
            title={item.title}
            poster={item.poster}
            remarks={episodeText}
            sourceMap={item.sourceMap}
            size={14}
            className="!p-1.5 !bg-transparent !border-0 !shadow-none hover:!bg-[var(--glass-bg)]"
            showTooltip={false}
            isPremium={isPremium}
          />

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 hover:bg-[var(--glass-bg)] rounded-full cursor-pointer"
            aria-label="删除"
          >
            <Icons.Trash size={14} className="text-[var(--text-color-secondary)]" />
          </button>
        </>
      }
    />
  );
}
