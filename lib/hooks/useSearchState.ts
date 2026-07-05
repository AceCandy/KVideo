import { useState, useRef, useCallback } from 'react';
import { Video, SourceBadge } from '@/lib/types';

export function useSearchState() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Video[]>([]);
    const [availableSources, setAvailableSources] = useState<SourceBadge[]>([]);
    const [completedSources, setCompletedSources] = useState(0);
    const [totalSources, setTotalSources] = useState(0);
    const [totalVideosFound, setTotalVideosFound] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [maxPageCount, setMaxPageCount] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    // Search failure message (network error, all sources failed). Kept separate
    // from "zero results" so the UI can distinguish "failed, retry" from
    // "succeeded but empty". AbortError never sets this.
    const [error, setError] = useState<string | null>(null);
    const currentQueryRef = useRef<string>('');

    const resetState = useCallback(() => {
        setLoading(false);
        setResults([]);
        setAvailableSources([]);
        setCompletedSources(0);
        setTotalSources(0);
        setTotalVideosFound(0);
        setCurrentPage(1);
        setMaxPageCount(1);
        setLoadingMore(false);
        setError(null);
        currentQueryRef.current = '';
    }, []);

    const startSearch = useCallback((query: string) => {
        setLoading(true);
        setResults([]);
        setAvailableSources([]);
        setCompletedSources(0);
        setTotalSources(0);
        setTotalVideosFound(0);
        setCurrentPage(1);
        setMaxPageCount(1);
        setLoadingMore(false);
        setError(null);
        currentQueryRef.current = query;
    }, []);

    return {
        loading,
        setLoading,
        results,
        setResults,
        availableSources,
        setAvailableSources,
        completedSources,
        setCompletedSources,
        totalSources,
        setTotalSources,
        totalVideosFound,
        setTotalVideosFound,
        currentPage,
        setCurrentPage,
        maxPageCount,
        setMaxPageCount,
        loadingMore,
        setLoadingMore,
        error,
        setError,
        currentQueryRef,
        resetState,
        startSearch,
    };
}
