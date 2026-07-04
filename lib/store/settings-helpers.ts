import type { AppSettings } from './settings-store';
import { profiledKey } from '@/lib/utils/profile-storage';

export const SEARCH_HISTORY_KEY = 'kvideo-search-history';
export const WATCH_HISTORY_KEY = 'kvideo-watch-history';

export const sortOptions = {
    'default': '默认排序',
    'relevance': '按相关性',
    'latency-asc': '延迟低到高',
    'date-desc': '发布时间（新到旧）',
    'date-asc': '发布时间（旧到新）',
    'rating-desc': '按评分（高到低）',
    'name-asc': '按名称（A-Z）',
    'name-desc': '按名称（Z-A）',
} as const;

export function exportSettings(settings: AppSettings, includeHistory: boolean = true): string {
    const exportData: Record<string, unknown> = {
        settings,
    };

    if (includeHistory && typeof window !== 'undefined') {
        const searchHistory = localStorage.getItem(profiledKey(SEARCH_HISTORY_KEY));
        const watchHistory = localStorage.getItem(profiledKey(WATCH_HISTORY_KEY));

        if (searchHistory) exportData.searchHistory = JSON.parse(searchHistory);
        if (watchHistory) exportData.watchHistory = JSON.parse(watchHistory);
    }

    return JSON.stringify(exportData, null, 2);
}

import { parseSourcesFromJson, mergeSources } from '@/lib/utils/source-import-utils';

export function importSettings(
    jsonString: string,
    saveSettings: (settings: AppSettings) => void,
    currentSettings?: AppSettings
): boolean {
    try {
        const data = JSON.parse(jsonString);
        let imported = false;

        // Case 1: Full Settings Export
        if (data.settings && typeof data.settings === 'object') {
            saveSettings(data.settings);
            imported = true;
        }

        // Case 2: History only (can be independent)
        if (data.searchHistory && typeof window !== 'undefined') {
            localStorage.setItem(profiledKey(SEARCH_HISTORY_KEY), JSON.stringify(data.searchHistory));
            imported = true;
        }
        if (data.watchHistory && typeof window !== 'undefined') {
            localStorage.setItem(profiledKey(WATCH_HISTORY_KEY), JSON.stringify(data.watchHistory));
            imported = true;
        }

        if (imported) return true;

        // Case 3: Source List (Array or Object wrapper)
        // If we didn't find "settings" key, try to parse the whole thing as sources
        if (currentSettings) {
            try {
                const result = parseSourcesFromJson(jsonString);
                if (result.totalCount > 0) {
                    const newSettings = { ...currentSettings };

                    if (result.normalSources.length > 0) {
                        newSettings.sources = mergeSources(newSettings.sources, result.normalSources);
                    }

                    if (result.premiumSources.length > 0) {
                        newSettings.premiumSources = mergeSources(newSettings.premiumSources, result.premiumSources);
                    }

                    saveSettings(newSettings);
                    return true;
                }
            } catch (e) {
                // Not a valid source format either
            }
        }

        return false;
    } catch {
        return false;
    }
}

type Listener = () => void;

/**
 * 订阅集合原语：手写单例对象 store 共用的 listeners 三件套。
 * subscribe 返回 unsubscribe；notifyListeners 通知全部监听者。
 */
export function createListenerSet() {
    const listeners = new Set<Listener>();
    return {
        subscribe(fn: Listener): () => void {
            listeners.add(fn);
            return () => {
                listeners.delete(fn);
            };
        },
        notifyListeners(): void {
            listeners.forEach((l) => l());
        },
    };
}

/** SSR 安全读 localStorage JSON；非浏览器或读取/解析失败返回 fallback */
export function readJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

/** SSR 安全写 localStorage JSON；非浏览器环境无操作 */
export function writeJson(key: string, value: unknown): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
}
