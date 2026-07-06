import { useRef, useCallback } from 'react';
import { SOURCE_IDS } from '@/lib/utils/source-names';
import { sortVideos } from '@/lib/utils/sort';
import { binaryInsertVideos } from '@/lib/utils/sorted-insert';
import { processSearchStream } from '@/lib/utils/search-stream';
import { announce } from '@/lib/utils/aria-announce';
import type { SortOption } from '@/lib/store/settings-store';
import { settingsStore } from '@/lib/store/settings-store';
import type { Video } from '@/lib/types';
import { useSearchState } from './useSearchState';

type SearchState = ReturnType<typeof useSearchState>;

interface UseSearchActionProps {
    state: SearchState;
    onCacheUpdate: (query: string, results: any[], sources: any[]) => void;
    onUrlUpdate: (query: string) => void;
}

// 将搜索接口的非 2xx 响应解析为面向用户的中文提示。
// 后端错误体格式不统一（429 用 message，400 用 error），这里统一兼容。
async function resolveSearchError(response: Response): Promise<string> {
    const status = response.status;
    let detail = '';
    try {
        const body = await response.json();
        detail = (body && (body.message || body.error)) || '';
    } catch {
        // 响应体非 JSON 或已被消费，忽略
    }
    if (status === 429) return '搜索过于频繁，请稍后再试';
    if (detail === 'Too many sources') return '启用的源过多，请在设置中关闭部分源后重试';
    if (status >= 400 && status < 500) return detail ? `搜索失败：${detail}` : `搜索失败（${status}）`;
    return `搜索失败（${status}）`;
}

export function useSearchAction({ state, onCacheUpdate, onUrlUpdate }: UseSearchActionProps) {
    const {
        setLoading,
        setResults,
        setAvailableSources,
        setCompletedSources,
        setTotalSources,
        setTotalVideosFound,
        setCurrentPage,
        setMaxPageCount,
        setLoadingMore,
        setError,
        currentPage,
        maxPageCount,
        startSearch,
    } = state;

    const abortControllerRef = useRef<AbortController | null>(null);
    // Keep track of the last search params so loadMore can re-use them
    const lastSearchParamsRef = useRef<{ query: string; sources: any[]; sortBy: SortOption } | null>(null);

    const performSearch = useCallback(async (searchQuery: string, sources: any[] = [], sortBy: SortOption = 'default') => {
        if (!searchQuery.trim()) return;

        // Resolve sources if not provided
        let targetSources = sources;
        if (!targetSources || targetSources.length === 0) {
            const settings = settingsStore.getSettings();
            // 订阅展开后的真实源已合并进 settings.sources；subscriptions 仅是订阅元数据（无 baseUrl），
            // 不能作为可搜索源直接发送给后端，否则会构造出无效请求并占用计数。
            targetSources = settings.sources.filter(s => (s as any).enabled !== false);
        }

        // Abort any ongoing search
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Reset state
        startSearch(searchQuery.trim());

        // Save search params for loadMore
        lastSearchParamsRef.current = { query: searchQuery.trim(), sources: targetSources, sortBy };

        // Update URL
        onUrlUpdate(searchQuery);

        try {
            const response = await fetch('/api/search-parallel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery, sources: targetSources, page: 1 }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) throw new Error(await resolveSearchError(response));

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response stream');

            const sourcesMap = new Map<string, { count: number; name: string }>();

            await processSearchStream({
                reader,
                currentQuery: searchQuery.trim(),
                onStart: (total) => setTotalSources(total),
                onVideos: (newVideos, sourceId) => {
                    // Optimized: Insert new videos in sorted position
                    setResults((prev) => binaryInsertVideos(prev, newVideos));

                    // Update source stats (accumulate across pages)
                    const existing = sourcesMap.get(sourceId);
                    if (existing) {
                        existing.count += newVideos.length;
                    } else {
                        sourcesMap.set(sourceId, {
                            count: newVideos.length,
                            name: newVideos[0]?.sourceName || sourceId,
                        });
                    }
                },
                onProgress: (completed, found) => {
                    setCompletedSources(completed);
                    setTotalVideosFound(found);
                },
                onPageInfo: (pageCount) => {
                    setMaxPageCount((prev) => Math.max(prev, pageCount));
                },
                onComplete: () => {
                    setLoading(false);
                    setError(null);

                    // Update available sources with correct property names
                    const sources = Array.from(sourcesMap.entries()).map(([id, info]) => ({
                        id: id,
                        name: info.name,
                        count: info.count,
                    }));
                    setAvailableSources(sources);

                    // Tell screen-reader users the search outcome so they do not
                    // have to explore the result area to learn it.
                    const totalFound = sources.reduce((sum, s) => sum + s.count, 0);
                    announce(totalFound > 0 ? `搜索完成，找到 ${totalFound} 条结果` : '未找到相关内容');

                    // Apply final sorting after all results are received
                    setResults((currentResults) => {
                        const sorted = sortVideos(currentResults, sortBy);

                        // Cache results
                        setTimeout(() => {
                            onCacheUpdate(searchQuery, sorted, sources);
                        }, 100);

                        return sorted;
                    });
                },
                onError: (message) => {
                    console.error('Search error:', message);
                    setLoading(false);
                    setError(message);
                },
            });

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Ignore abort errors and DO NOT set loading to false
                // because a new search might have already started
                return;
            } else {
                console.error('Search error:', error);
                setError(error instanceof Error ? error.message : '搜索失败，请重试');
            }
            setLoading(false);
        }
    }, [startSearch, onUrlUpdate, onCacheUpdate, setTotalSources, setResults, setCompletedSources, setTotalVideosFound, setLoading, setAvailableSources, setMaxPageCount, setError]);

    const loadMore = useCallback(async () => {
        const params = lastSearchParamsRef.current;
        if (!params) return;

        const nextPage = currentPage + 1;
        if (nextPage > maxPageCount) return;

        // Abort any ongoing load-more (but not the main search)
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoadingMore(true);

        try {
            const response = await fetch('/api/search-parallel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: params.query, sources: params.sources, page: nextPage }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                console.error('Load more failed:', response.status, detail);
                setLoadingMore(false);
                return;
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response stream');

            await processSearchStream({
                reader,
                currentQuery: params.query,
                onStart: () => { },
                onVideos: (newVideos) => {
                    // Append new videos to existing results
                    setResults((prev) => binaryInsertVideos(prev, newVideos));
                },
                onProgress: (_, found) => {
                    setTotalVideosFound((prev) => prev + found);
                },
                onPageInfo: (pageCount) => {
                    setMaxPageCount((prev) => Math.max(prev, pageCount));
                },
                onComplete: () => {
                    setCurrentPage(nextPage);
                    setLoadingMore(false);
                },
                onError: (message) => {
                    console.error('Load more error:', message);
                    setLoadingMore(false);
                },
            });

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }
            console.error('Load more error:', error);
            setLoadingMore(false);
        }
    }, [currentPage, maxPageCount, setLoadingMore, setResults, setTotalVideosFound, setCurrentPage, setMaxPageCount]);

    const cancelSearch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    return { performSearch, loadMore, cancelSearch };
}
