'use client';

import { Card } from '@/components/ui/Card';
import { SourcePanel } from './episode-list/SourcePanel';
import { EpisodeSection } from './episode-list/EpisodeSection';
import type { EpisodeListProps } from './episode-list/types';

export type { SourceInfo } from './episode-list/types';

export function EpisodeList({
  episodes,
  currentEpisode,
  isReversed = false,
  onEpisodeClick,
  onToggleReverse,
  sources,
  currentSource,
  onSourceChange,
  currentResolution,
  sourceResolutions,
  sourcePlayables,
  sourceSectionCollapsed = false,
  onSourceSectionCollapseChange,
  episodeSectionCollapsed = false,
  onEpisodeSectionCollapseChange,
}: EpisodeListProps) {
  const showSourceSelector = !!sources && sources.length > 1 && !!onSourceChange;

  return (
    <Card hover={false}>
      {showSourceSelector && (
        <SourcePanel
          sources={sources!}
          currentSource={currentSource}
          onSourceChange={onSourceChange!}
          currentResolution={currentResolution}
          sourceResolutions={sourceResolutions}
          sourcePlayables={sourcePlayables}
          sourceSectionCollapsed={sourceSectionCollapsed}
          onSourceSectionCollapseChange={onSourceSectionCollapseChange}
        />
      )}
      <EpisodeSection
        episodes={episodes}
        currentEpisode={currentEpisode}
        isReversed={isReversed}
        onEpisodeClick={onEpisodeClick}
        onToggleReverse={onToggleReverse}
        episodeSectionCollapsed={episodeSectionCollapsed}
        onEpisodeSectionCollapseChange={onEpisodeSectionCollapseChange}
      />
    </Card>
  );
}
