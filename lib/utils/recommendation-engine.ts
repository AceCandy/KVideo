/**
 * Recommendation Engine
 * Analyzes viewing history to generate personalized content recommendations.
 *
 * How it works:
 * 1. ANALYSIS: Scans all history items, counts frequency of genres (type_name),
 *    actors (vod_actor), and regions (vod_area).
 * 2. QUERY GENERATION: Produces up to 5 recommendation queries ranked by relevance:
 *    - Top 2 genres by watch count (threshold: 1+)
 *    - Top 1-2 actors if they appear across 2+ different videos
 *    - Top region if 3+ videos are from that region
 * 3. RANDOMIZATION: Each query gets a random page_start offset (0-40) so the
 *    Douban API returns different results on each page load.
 */

import type { VideoHistoryItem } from '@/lib/types';

export interface RecommendationQuery {
  label: string;
  tag: string;
  type: 'movie' | 'tv';
  /** Random offset for Douban API pagination to vary results */
  pageStart: number;
}

/**
 * Analyze viewing history and generate recommendation queries.
 * Returns up to 5 queries based on top genres, actors, and regions.
 */
export function generateRecommendations(
  history: VideoHistoryItem[]
): RecommendationQuery[] {
  if (history.length === 0) return [];

  const queries: RecommendationQuery[] = [];

  // Count genres
  const genreCounts = new Map<string, number>();
  // Count actors
  const actorCounts = new Map<string, number>();
  // Count regions
  const areaCounts = new Map<string, number>();

  for (const item of history) {
    if (item.type_name) {
      const genre = item.type_name.trim();
      if (genre) {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      }
    }

    if (item.vod_actor) {
      const actors = item.vod_actor.split(/[,，/]/).map(s => s.trim()).filter(Boolean);
      for (const actor of actors.slice(0, 3)) {
        actorCounts.set(actor, (actorCounts.get(actor) || 0) + 1);
      }
    }

    if (item.vod_area) {
      const area = item.vod_area.trim();
      if (area) {
        areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
      }
    }
  }

  // Top 2 genres
  const sortedGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  for (const [genre, count] of sortedGenres) {
    if (count >= 1) {
      const type = genre.includes('剧') || genre.includes('电视') ? 'tv' : 'movie';
      queries.push({
        label: `${genre}推荐`,
        tag: genre,
        type,
        pageStart: Math.floor(Math.random() * 40),
      });
    }
  }

  // Top 1-2 actors (if appears in 2+ videos)
  const sortedActors = [...actorCounts.entries()]
    .sort((a, b) => b[1] - a[1]);
  const actorsToAdd = sortedActors.filter(([, count]) => count >= 2).slice(0, 2);
  for (const [actor] of actorsToAdd) {
    queries.push({
      label: `${actor}的作品`,
      tag: actor,
      type: 'movie',
      pageStart: Math.floor(Math.random() * 20),
    });
  }

  // Top region (if 3+ videos)
  const sortedAreas = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1]);
  if (sortedAreas.length > 0 && sortedAreas[0][1] >= 3) {
    queries.push({
      label: `${sortedAreas[0][0]}热门`,
      tag: sortedAreas[0][0],
      type: 'movie',
      pageStart: Math.floor(Math.random() * 40),
    });
  }

  return queries.slice(0, 5);
}

/**
 * Collect titles the user has already watched for exclusion.
 */
export function getWatchedTitles(history: VideoHistoryItem[]): Set<string> {
  const titles = new Set<string>();
  for (const item of history) {
    if (item.title) {
      titles.add(item.title.toLowerCase().trim());
    }
  }
  return titles;
}
