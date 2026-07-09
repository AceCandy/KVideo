/**
 * 猜你想看：基于观看历史推荐影片，剔除已看与已收藏。
 * 精准推荐耗尽时扩大范围（热门，优先电影）兜底，尽量保证总有候选。
 */

import { generateRecommendations, getWatchedTitles } from './recommendation-engine';
import type { VideoHistoryItem, FavoriteItem, VideoSource } from '@/lib/types';

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

interface PremiumVideo {
  vod_id: string | number;
  vod_name: string;
  vod_pic?: string;
}

/**
 * 今日推荐：聚合各 premium 源默认内容流（category 为空）。
 * 仅高级区猜你想看在精准推荐耗尽时用作补充池，避免回退到普通区的豆瓣热门。
 */
async function fetchPremiumToday(premiumSources: VideoSource[]): Promise<GuessMovie[]> {
  if (premiumSources.length === 0) return [];
  try {
    const res = await fetch('/api/premium/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: premiumSources, category: '', page: '1', limit: '20' }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const videos: PremiumVideo[] = data.videos || [];
    return videos.map(v => ({
      id: String(v.vod_id),
      title: v.vod_name,
      cover: v.vod_pic || '',
      rate: '',
      url: '',
    }));
  } catch {
    return [];
  }
}

/**
 * 获取推荐候选列表（已剔除已看 / 已收藏）。
 * 流程：历史精准推荐 → 剔除后为空时兜底 → 仍为空再终极兜底。
 *   高级区兜底用今日推荐（premium 源内容流）；普通区用豆瓣热门 + 最新。
 */
export async function fetchGuessCandidates(
  history: VideoHistoryItem[],
  favorites: FavoriteItem[],
  opts: { isPremium?: boolean; premiumSources?: VideoSource[] } = {}
): Promise<GuessMovie[]> {
  const { isPremium = false, premiumSources = [] } = opts;
  const usePremiumFallback = isPremium && premiumSources.length > 0;

  const watched = getWatchedTitles(history);
  const favTitles = new Set(
    favorites.map(f => f.title.toLowerCase().trim()).filter(Boolean)
  );
  const isExcluded = (m: GuessMovie) => {
    const t = m.title.toLowerCase().trim();
    return watched.has(t) || favTitles.has(t);
  };

  // 1. 基于历史的精准推荐（高级区 / 普通区都基于各自历史走豆瓣推荐）
  let pool: GuessMovie[] = [];
  if (history.length >= 2) {
    const queries = generateRecommendations(history);
    if (queries.length > 0) {
      const results = await Promise.all(queries.map(q => fetchByTag(q.tag, q.type, 10)));
      pool = dedup(results.flat());
    }
  }

  // 2. 精准结果剔除后为空 → 兜底
  if (pool.filter(m => !isExcluded(m)).length === 0) {
    if (usePremiumFallback) {
      // 高级区：今日推荐内容流
      const today = await fetchPremiumToday(premiumSources);
      pool = dedup([...pool, ...today]);
    } else {
      // 普通区：豆瓣热门 + 最新
      const hot = await Promise.all([
        fetchByTag('热门', 'movie', 20),
        fetchByTag('最新', 'movie', 20),
      ]);
      pool = dedup([...pool, ...hot.flat()]);
    }
  }

  // 3. 仍为空 → 终极兜底
  if (pool.filter(m => !isExcluded(m)).length === 0) {
    if (usePremiumFallback) {
      // 今日推荐也空（极端），退化为豆瓣热门电影保证有内容
      const hot = await fetchByTag('热门', 'movie', 20);
      pool = dedup([...pool, ...hot]);
    } else {
      const tv = await fetchByTag('热门', 'tv', 20);
      pool = dedup([...pool, ...tv]);
    }
  }

  const candidates = pool.filter(m => !isExcluded(m));
  if (candidates.length > 0) return candidates;
  // 极端：所有都已看 / 已收藏 → 返回 pool 不再剔除，保证尽量有推荐
  return pool;
}
