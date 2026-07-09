/**
 * 猜你想看：基于观看历史推荐影片，剔除已看与已收藏。
 * 精准推荐耗尽时扩大范围（热门，优先电影）兜底，尽量保证总有候选。
 */

import { generateRecommendations, getWatchedTitles } from './recommendation-engine';
import type { VideoHistoryItem, FavoriteItem } from '@/lib/types';

export interface GuessMovie {
  id: string;
  title: string;
  cover: string;
  rate: string;
  url: string;
}

interface DoubanSubject {
  id: string | number;
  title: string;
  cover: string;
  rate: string;
  url: string;
}

async function fetchByTag(tag: string, type: 'movie' | 'tv', limit = 20): Promise<GuessMovie[]> {
  try {
    const pageStart = Math.floor(Math.random() * 20);
    const res = await fetch(
      `/api/douban/recommend?tag=${encodeURIComponent(tag)}&type=${type}&page_limit=${limit}&page_start=${pageStart}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const subjects: DoubanSubject[] = data.subjects || [];
    return subjects.map(s => ({
      id: String(s.id),
      title: s.title,
      cover: s.cover,
      rate: s.rate,
      url: s.url,
    }));
  } catch {
    return [];
  }
}

/** 按 id 保序去重 */
function dedup(list: GuessMovie[]): GuessMovie[] {
  const seen = new Set<string>();
  return list.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

/**
 * 获取推荐候选列表（已剔除已看 / 已收藏）。
 * 流程：历史精准推荐 → 若剔除后为空，扩大范围（热门电影 + 最新电影）→ 仍为空再回退电视剧热门。
 */
export async function fetchGuessCandidates(
  history: VideoHistoryItem[],
  favorites: FavoriteItem[]
): Promise<GuessMovie[]> {
  const watched = getWatchedTitles(history);
  const favTitles = new Set(
    favorites.map(f => f.title.toLowerCase().trim()).filter(Boolean)
  );
  const isExcluded = (m: GuessMovie) => {
    const t = m.title.toLowerCase().trim();
    return watched.has(t) || favTitles.has(t);
  };

  // 1. 基于历史的精准推荐
  let pool: GuessMovie[] = [];
  if (history.length >= 2) {
    const queries = generateRecommendations(history);
    if (queries.length > 0) {
      const results = await Promise.all(queries.map(q => fetchByTag(q.tag, q.type, 10)));
      pool = dedup(results.flat());
    }
  }

  // 2. 精准结果剔除后为空 → 扩大范围，优先电影
  if (pool.filter(m => !isExcluded(m)).length === 0) {
    const hot = await Promise.all([
      fetchByTag('热门', 'movie', 20),
      fetchByTag('最新', 'movie', 20),
    ]);
    pool = dedup([...pool, ...hot.flat()]);
  }

  // 3. 仍为空 → 电视剧热门兜底
  if (pool.filter(m => !isExcluded(m)).length === 0) {
    const tv = await fetchByTag('热门', 'tv', 20);
    pool = dedup([...pool, ...tv]);
  }

  const candidates = pool.filter(m => !isExcluded(m));
  if (candidates.length > 0) return candidates;
  // 极端：所有都已看 / 已收藏 → 返回 pool 不再剔除，保证尽量有推荐
  return pool;
}
