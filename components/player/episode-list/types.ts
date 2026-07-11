import type { VideoResolutionInfo } from '../hooks/useVideoResolution';
import type { ResolutionInfo } from '@/lib/hooks/useResolutionProbe';
import type { ResolutionBadge } from '@/lib/player/source-list-utils';

export interface Episode {
  name?: string;
  url: string;
}

export interface SourceInfo {
  id: string | number;
  source: string;
  sourceName?: string;
  latency?: number;
  pic?: string;
  typeName?: string;
  remarks?: string;
}

export interface EpisodeListProps {
  episodes: Episode[] | null;
  currentEpisode: number;
  isReversed?: boolean;
  onEpisodeClick: (episode: Episode, index: number) => void;
  onToggleReverse?: (reversed: boolean) => void;
  sources?: SourceInfo[];
  currentSource?: string;
  onSourceChange?: (source: SourceInfo) => void;
  currentResolution?: VideoResolutionInfo | null;
  sourceResolutions?: Record<string, ResolutionInfo | null>;
  sourcePlayables?: Record<string, boolean>;
  sourceSectionCollapsed?: boolean;
  onSourceSectionCollapseChange?: (collapsed: boolean) => void;
  episodeSectionCollapsed?: boolean;
  onEpisodeSectionCollapseChange?: (collapsed: boolean) => void;
}

export interface SourceRowProps {
  source: SourceInfo;
  isCurrent: boolean;
  latency: number | undefined;
  badge: ResolutionBadge | null;
  globalIndex: number;
  unplayable?: boolean;
  onSelect: (source: SourceInfo) => void;
  registerRef: (key: string, el: HTMLButtonElement | null) => void;
}
