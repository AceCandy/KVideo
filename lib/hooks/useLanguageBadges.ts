'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { LanguageBadge } from '@/lib/types';

// 语言标签的等价别名，统一归并到同一展示名（聚合 key 即展示名）
const LANG_SYNONYMS: Record<string, string> = {
  '汉语普通话': '国语',
  '普通话': '国语',
  '国语': '国语',
};

// 把原始语言映射到 {聚合 key, 展示名}；命中同义表的组用固定展示名
function classifyLangName(raw: string): { key: string; display: string } {
  const t = raw.replace(/\s+/g, '').trim().normalize('NFC');
  const canonical = LANG_SYNONYMS[t];
  if (canonical) return { key: canonical, display: canonical };
  return { key: t, display: raw };
}

/**
 * Custom hook to collect and filter by vod_lang values from video results
 * Mirrors useTypeBadges pattern
 */
export function useLanguageBadges<T extends { vod_lang?: string }>(videos: T[]) {
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(new Set());

  // Collect and count language badges from videos
  const languageBadges = useMemo<LanguageBadge[]>(() => {
    const langMap = new Map<string, { display: string; count: number }>();

    videos.forEach(video => {
      if (video.vod_lang && video.vod_lang.trim()) {
        const raw = video.vod_lang.trim();
        const { key, display } = classifyLangName(raw);
        const existing = langMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          langMap.set(key, { display, count: 1 });
        }
      }
    });

    return Array.from(langMap.entries())
      .map(([, val]) => ({ lang: val.display, count: val.count }))
      .sort((a, b) => b.count - a.count);
  }, [videos]);

  // Filter videos by selected languages
  const filteredVideos = useMemo(() => {
    if (selectedLangs.size === 0) {
      return videos;
    }

    const selectedKeys = new Set(
      Array.from(selectedLangs).map(l => classifyLangName(l).key)
    );

    return videos.filter(video =>
      video.vod_lang && selectedKeys.has(classifyLangName(video.vod_lang.trim()).key)
    );
  }, [videos, selectedLangs]);

  // Toggle language selection
  const toggleLang = useCallback((lang: string) => {
    setSelectedLangs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lang)) {
        newSet.delete(lang);
      } else {
        newSet.add(lang);
      }
      return newSet;
    });
  }, []);

  // Auto-cleanup: remove selected langs that no longer exist in badges
  useEffect(() => {
    const availableLangs = new Set(languageBadges.map(b => b.lang));

    setSelectedLangs(prev => {
      const filtered = new Set(
        Array.from(prev).filter(lang => availableLangs.has(lang))
      );

      if (filtered.size !== prev.size) {
        return filtered;
      }
      return prev;
    });
  }, [languageBadges]);

  return {
    languageBadges,
    selectedLangs,
    filteredVideos,
    toggleLang,
  };
}
