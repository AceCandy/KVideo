'use client';

import { Suspense, useMemo } from 'react';
import { SearchForm } from '@/components/search/SearchForm';
import { NoResults } from '@/components/search/NoResults';
import { PopularFeatures } from '@/components/home/PopularFeatures';
import { FavoritesSidebar } from '@/components/favorites/FavoritesSidebar';
import { Navbar } from '@/components/layout/Navbar';
import { SearchResults } from '@/components/home/SearchResults';
import { useHomePage } from '@/lib/hooks/useHomePage';
import { useLatencyPing } from '@/lib/hooks/useLatencyPing';

function HomePage() {
  const {
    query,
    hasSearched,
    loading,
    results,
    availableSources,
    completedSources,
    totalSources,
    handleSearch,
    handleReset,
    handleCancelSearch,
    loadMore,
    hasMore,
    loadingMore,
    error,
  } = useHomePage();

  // Real-time latency pinging
  const sourceUrls = useMemo(() =>
    availableSources.map(s => ({ id: s.id, baseUrl: s.id })), // Using id as baseUrl if not available elsewhere
    [availableSources]
  );

  const { latencies } = useLatencyPing({
    sourceUrls,
    enabled: hasSearched && results.length > 0,
  });

  return (
    <div className="min-h-screen">
      {/* Glass Navbar */}
      <Navbar onReset={handleReset} />

      {/* Search Form - Separate from navbar */}
      <div className="max-w-7xl mx-auto px-4 mt-6 mb-8 relative" style={{
        transform: 'translate3d(0, 0, 0)',
        zIndex: 1000
      }}>
        <SearchForm
          onSearch={handleSearch}
          onClear={handleReset}
          onCancelSearch={handleCancelSearch}
          isLoading={loading}
          initialQuery={query}
          currentSource=""
          checkedSources={completedSources}
          totalSources={totalSources}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Results Section */}
        {(results.length >= 1 || (!loading && results.length > 0)) && (
          <SearchResults
            results={results}
            availableSources={availableSources}
            loading={loading}
            latencies={latencies}
            loadMore={loadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
          />
        )}

        {/* Popular Features - Homepage */}
        {!loading && !hasSearched && (
          <>
            <PopularFeatures onSearch={handleSearch} />
          </>
        )}

        {/* Search failed (network / all sources failed) — offer retry */}
        {!loading && hasSearched && error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="glass-card rounded-[var(--radius-2xl)] p-8 max-w-md">
              <p className="text-[var(--text-color)] mb-4">搜索失败，请检查网络后重试</p>
              <button
                onClick={() => query && handleSearch(query)}
                className="btn-glass px-6 py-2.5"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && hasSearched && results.length === 0 && !error && (
          <NoResults onReset={handleReset} />
        )}
      </main>

      {/* Favorites Sidebar - Left */}
      <FavoritesSidebar />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--accent-color)] border-t-transparent"></div>
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}
