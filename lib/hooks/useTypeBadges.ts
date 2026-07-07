'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TypeBadge } from '@/lib/types';

/**
 * Custom hook to automatically collect and track type badges from video results
 *
 * Features:
 * - Auto-collects unique type_name values
 * - Normalizes similar type names (e.g., "动作片" and "动作" merge)
 * - Tracks count per type
 * - Updates dynamically as videos are added/removed
 * - Removes badges when count reaches 0
 * - Supports filtering by selected types
 */

// 类型标签的等价别名，统一归并到同一展示名（聚合 key 即展示名）
const TYPE_SYNONYMS: Record<string, string> = {
  '国产': '国产剧',
  '大陆': '国产剧',
  '内地': '国产剧',
};

// 基础归一：去空白、NFC、去片/剧/类后缀、小写
function baseNormalizeType(type: string): string {
  let t = type.replace(/\s+/g, '').trim();
  t = t.normalize('NFC');
  if (t.length > 2 && (t.endsWith('片') || t.endsWith('剧') || t.endsWith('类'))) {
    t = t.slice(0, -1);
  }
  return t.toLowerCase();
}

// 把原始类型映射到 {聚合 key, 展示名}；命中同义表的组用固定展示名
function classifyTypeName(raw: string): { key: string; display: string } {
  const base = baseNormalizeType(raw);
  const canonical = TYPE_SYNONYMS[base];
  if (canonical) return { key: canonical, display: canonical };
  return { key: base, display: raw };
}

export function useTypeBadges<T extends { type_name?: string }>(videos: T[]) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  // Collect and count type badges from videos
  const typeBadges = useMemo<TypeBadge[]>(() => {
    const typeMap = new Map<string, { display: string; count: number }>();

    videos.forEach(video => {
      if (video.type_name && video.type_name.trim()) {
        const raw = video.type_name.trim();
        const { key, display } = classifyTypeName(raw);
        const canonical = TYPE_SYNONYMS[baseNormalizeType(raw)];
        const existing = typeMap.get(key);
        if (existing) {
          existing.count++;
          // 同义组展示名固定；其余沿用较短展示名（如 "动作" 优于 "动作片"）
          if (!canonical && raw.length < existing.display.length) {
            existing.display = raw;
          }
        } else {
          typeMap.set(key, { display, count: 1 });
        }
      }
    });

    // Convert to array and sort by count (descending)
    return Array.from(typeMap.entries())
      .map(([, val]) => ({ type: val.display, count: val.count }))
      .sort((a, b) => b.count - a.count);
  }, [videos]);

  // Filter videos by selected types
  const filteredVideos = useMemo(() => {
    if (selectedTypes.size === 0) {
      return videos;
    }

    // Build a set of normalized selected types
    const selectedKeys = new Set(
      Array.from(selectedTypes).map(t => classifyTypeName(t).key)
    );

    return videos.filter(video =>
      video.type_name && selectedKeys.has(classifyTypeName(video.type_name.trim()).key)
    );
  }, [videos, selectedTypes]);

  // Toggle type selection - useCallback to prevent re-creation
  const toggleType = useCallback((type: string) => {
    // Update selected types immediately (high priority)
    setSelectedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  // Auto-cleanup: remove selected types that no longer exist in badges
  useEffect(() => {
    const availableTypes = new Set(typeBadges.map(b => b.type));

    setSelectedTypes(prev => {
      const filtered = new Set(
        Array.from(prev).filter(type => availableTypes.has(type))
      );

      // Only update if changed
      if (filtered.size !== prev.size) {
        return filtered;
      }
      return prev;
    });
  }, [typeBadges]);

  return {
    typeBadges,
    selectedTypes,
    filteredVideos,
    toggleType,
  };
}
