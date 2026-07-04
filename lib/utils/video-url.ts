import { getSourceName } from './source-names';
import { storeGroupedSources } from './grouped-sources-cache';

interface ListItemVideoUrlParams {
  videoId: string | number;
  source: string;
  title: string;
  poster?: string;
  sourceMap?: Record<string, string | number>;
  episode?: number;
  isPremium?: boolean;
}

/**
 * 构造播放页 URL：基础参数 + 可选集数；多源时把 sourceMap 写入 sessionStorage 换短 key。
 * 供收藏 / 历史 list-item 复用，避免 url 构造逻辑在各 Item 重复。
 */
export function buildListItemVideoUrl({
  videoId,
  source,
  title,
  poster,
  sourceMap,
  episode,
  isPremium,
}: ListItemVideoUrlParams): string {
  const params = new URLSearchParams({
    id: videoId.toString(),
    source,
    title,
  });

  if (episode !== undefined) {
    params.set('episode', episode.toString());
  }

  if (sourceMap && Object.keys(sourceMap).length > 1) {
    const groupData = Object.entries(sourceMap).map(([sourceName, vid]) => ({
      id: vid,
      source: sourceName,
      sourceName: getSourceName(sourceName),
      pic: poster,
    }));
    const cacheKey = storeGroupedSources(groupData);
    if (cacheKey) {
      params.set('gs', cacheKey);
    }
  }

  if (isPremium) {
    params.set('premium', '1');
  }

  return `/player?${params.toString()}`;
}
