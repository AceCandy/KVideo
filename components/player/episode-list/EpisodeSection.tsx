'use client';

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';
import type { EpisodeListProps } from './types';

type EpisodeSectionProps = Pick<
  EpisodeListProps,
  'episodes' | 'currentEpisode' | 'isReversed' | 'onEpisodeClick' | 'onToggleReverse' | 'episodeSectionCollapsed' | 'onEpisodeSectionCollapseChange'
>;

const EPISODES_PER_PAGE = 50;

export function EpisodeSection({
  episodes,
  currentEpisode,
  isReversed = false,
  onEpisodeClick,
  onToggleReverse,
  episodeSectionCollapsed = false,
  onEpisodeSectionCollapseChange,
}: EpisodeSectionProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [episodeLayout, setEpisodeLayout] = useState<'list' | 'grid'>('grid');
  const [episodePage, setEpisodePage] = useState(0);

  const displayEpisodes = useMemo(() => {
    if (!episodes) return null;
    return isReversed ? [...episodes].reverse() : episodes;
  }, [episodes, isReversed]);

  const getOriginalIndex = useCallback((displayIndex: number) => {
    if (!episodes || !isReversed) return displayIndex;
    return episodes.length - 1 - displayIndex;
  }, [episodes, isReversed]);

  const getDisplayIndex = useCallback((originalIndex: number) => {
    if (!episodes || !isReversed) return originalIndex;
    return episodes.length - 1 - originalIndex;
  }, [episodes, isReversed]);

  const totalEpisodePages = useMemo(() => {
    if (!displayEpisodes?.length) return 1;
    return Math.max(1, Math.ceil(displayEpisodes.length / EPISODES_PER_PAGE));
  }, [displayEpisodes]);

  useEffect(() => {
    let frame: number;
    if (!episodes?.length) {
      frame = requestAnimationFrame(() => setEpisodePage(0));
      return () => cancelAnimationFrame(frame);
    }
    const displayIndex = getDisplayIndex(currentEpisode);
    frame = requestAnimationFrame(() => {
      setEpisodePage(Math.floor(displayIndex / EPISODES_PER_PAGE));
    });
    return () => cancelAnimationFrame(frame);
  }, [currentEpisode, episodeLayout, episodes, getDisplayIndex]);

  const pagedEpisodes = useMemo(() => {
    if (!displayEpisodes) return null;
    if (episodeLayout === 'list' || displayEpisodes.length <= EPISODES_PER_PAGE) {
      return displayEpisodes.map((episode, displayIndex) => ({ episode, displayIndex }));
    }
    const start = episodePage * EPISODES_PER_PAGE;
    return displayEpisodes
      .slice(start, start + EPISODES_PER_PAGE)
      .map((episode, offset) => ({ episode, displayIndex: start + offset }));
  }, [displayEpisodes, episodeLayout, episodePage]);

  const pageRangeLabels = useMemo(() => {
    if (!displayEpisodes) return [];
    return Array.from({ length: totalEpisodePages }, (_, page) => {
      const start = page * EPISODES_PER_PAGE + 1;
      const end = Math.min((page + 1) * EPISODES_PER_PAGE, displayEpisodes.length);
      return `${start}-${end}`;
    });
  }, [displayEpisodes, totalEpisodePages]);

  useKeyboardNavigation({
    enabled: !episodeSectionCollapsed,
    containerRef: listRef,
    currentIndex: getDisplayIndex(currentEpisode),
    itemCount: episodes?.length || 0,
    orientation: 'vertical',
    onNavigate: useCallback((index: number) => {
      if (episodeLayout === 'grid' && (episodes?.length || 0) > EPISODES_PER_PAGE) {
        setEpisodePage(Math.floor(index / EPISODES_PER_PAGE));
        requestAnimationFrame(() => {
          buttonRefs.current[index]?.focus();
          buttonRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        return;
      }
      buttonRefs.current[index]?.focus();
      buttonRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [episodeLayout, episodes]),
    onSelect: useCallback((displayIndex: number) => {
      if (episodes) {
        const originalIndex = getOriginalIndex(displayIndex);
        if (episodes[originalIndex]) {
          onEpisodeClick(episodes[originalIndex], originalIndex);
        }
      }
    }, [episodes, onEpisodeClick, getOriginalIndex]),
  });

  const showReverseToggle = episodes && episodes.length > 1;
  const currentEpisodeLabel = episodes?.[currentEpisode]?.name || `第${currentEpisode + 1}集`;

  return (
    <>
      <div className="text-lg sm:text-xl font-bold text-[var(--text-color)] mb-4 flex items-center gap-2 flex-wrap">
        <Icons.List size={20} className="sm:w-6 sm:h-6" />
        <span>选集</span>
        {episodes && (
          <Badge variant="primary">{episodes.length}</Badge>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {showReverseToggle && !episodeSectionCollapsed && (
            <button
              onClick={() => setEpisodeLayout((current) => current === 'grid' ? 'list' : 'grid')}
              className={`p-1.5 rounded-[var(--radius-2xl)] transition-all duration-200 cursor-pointer ${episodeLayout === 'grid' ? 'bg-[var(--accent-color)] text-white' : 'bg-[var(--glass-bg)] text-[var(--text-color-secondary)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)]'}`}
              aria-label={episodeLayout === 'grid' ? '切换为列表' : '切换为网格'}
              title={episodeLayout === 'grid' ? '切换为列表' : '切换为网格'}
            >
              <Icons.Layers size={16} />
            </button>
          )}
          {showReverseToggle && !episodeSectionCollapsed && (
            <button
              onClick={() => onToggleReverse?.(!isReversed)}
              className={`p-1.5 rounded-[var(--radius-2xl)] transition-all duration-200 cursor-pointer ${isReversed ? 'bg-[var(--accent-color)] text-white' : 'bg-[var(--glass-bg)] text-[var(--text-color-secondary)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)]'}`}
              aria-label={isReversed ? '恢复正序' : '倒序排列'}
              title={isReversed ? '恢复正序' : '倒序排列'}
            >
              <Icons.ArrowUpDown size={16} />
            </button>
          )}
          <button
            onClick={() => onEpisodeSectionCollapseChange?.(!episodeSectionCollapsed)}
            className="p-1.5 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] text-[var(--text-color-secondary)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)] transition-all duration-200 cursor-pointer"
            aria-label={episodeSectionCollapsed ? '展开选集列表' : '折叠选集列表'}
            title={episodeSectionCollapsed ? '展开选集列表' : '折叠选集列表'}
          >
            <Icons.ChevronDown size={16} className={`transition-transform duration-200 ${episodeSectionCollapsed ? '-rotate-90' : 'rotate-0'}`} />
          </button>
        </div>
      </div>

      {episodeSectionCollapsed ? (
        <div className="rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--text-color-secondary)]">当前选集</span>
            <span className="font-medium text-[var(--text-color)] truncate">
              {currentEpisodeLabel}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {episodeLayout === 'grid' && totalEpisodePages > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {pageRangeLabels.map((label, page) => (
                <button
                  key={label}
                  onClick={() => setEpisodePage(page)}
                  className={`px-2.5 py-1 rounded-[var(--radius-2xl)] text-xs font-medium transition-all duration-200 cursor-pointer ${episodePage === page ? 'bg-[var(--accent-color)] text-white' : 'bg-[var(--glass-bg)] text-[var(--text-color-secondary)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)]'}`}
                  aria-current={episodePage === page ? 'true' : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div
            ref={listRef}
            className={`max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-1 ${episodeLayout === 'grid' ? 'grid grid-cols-3 sm:grid-cols-4 gap-2' : 'space-y-2'}`}
            role="radiogroup"
            aria-label="剧集选择"
          >
          {pagedEpisodes && pagedEpisodes.length > 0 ? (
            pagedEpisodes.map(({ episode, displayIndex }) => {
              const originalIndex = getOriginalIndex(displayIndex);
              const isCurrentEpisode = currentEpisode === originalIndex;
              const isGrid = episodeLayout === 'grid';

              return (
                <button
                  key={originalIndex}
                  ref={(el) => { buttonRefs.current[displayIndex] = el; }}
                  onClick={() => onEpisodeClick(episode, originalIndex)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onEpisodeClick(episode, originalIndex);
                    }
                  }}
                  tabIndex={0}
                  role="radio"
                  aria-checked={isCurrentEpisode}
                  aria-current={isCurrentEpisode ? 'true' : undefined}
                  aria-label={`${episode.name || `第 ${originalIndex + 1} 集`}${isCurrentEpisode ? '，当前播放' : ''}`}
                  className={`
                    rounded-[var(--radius-2xl)] transition-[var(--transition-fluid)] cursor-pointer
                    ${isGrid ? 'px-2 py-2.5 text-center' : 'w-full px-3 py-2 sm:px-4 sm:py-3 text-left'}
                    ${isCurrentEpisode
                      ? 'bg-[var(--accent-color)] text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--accent-color)_50%,transparent)] brightness-110'
                      : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-hover)] text-[var(--text-color)] border border-[var(--glass-border)]'
                    }
                    focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2
                  `}
                >
                  <div className={`flex items-center ${isGrid ? 'justify-center gap-1' : 'justify-between'}`}>
                    <span className={`font-medium ${isGrid ? 'text-xs sm:text-sm truncate' : 'text-sm sm:text-base'}`}>
                      {episode.name || `第 ${originalIndex + 1} 集`}
                    </span>
                    {isCurrentEpisode && !isGrid && (
                      <Icons.Play size={16} />
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-8 text-[var(--text-secondary)] col-span-full">
              <Icons.Inbox size={48} className="text-[var(--text-color-secondary)] mx-auto mb-2" />
              <p>暂无剧集信息</p>
            </div>
          )}
          </div>
        </div>
      )}
    </>
  );
}
