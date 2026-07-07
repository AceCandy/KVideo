/**
 * MovieGrid - Grid layout for movie cards with infinite scroll
 * Handles movie display and loading states
 */

import { useMemo } from 'react';
import { MovieCard } from './MovieCard';
import { CardGrid } from '@/components/ui/CardGrid';
import { GridEmpty, GridLoading, GridNoMore, GridSkeleton } from '@/components/ui/GridState';

interface DoubanMovie {
  id: string;
  title: string;
  cover: string;
  rate: string;
  url: string;
}

interface MovieGridProps {
  movies: DoubanMovie[];
  loading: boolean;
  hasMore: boolean;
  onMovieClick: (movie: DoubanMovie) => void;
  prefetchRef: React.RefObject<HTMLDivElement | null>;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}

export function MovieGrid({
  movies,
  loading,
  hasMore,
  onMovieClick,
  prefetchRef,
  loadMoreRef
}: MovieGridProps) {
  // 豆瓣分页接口跨页可能返回重复条目，按 id 保序去重，保证列表项 key 唯一
  const uniqueMovies = useMemo(() => {
    const seen = new Set<string>();
    return movies.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [movies]);

  if (uniqueMovies.length === 0 && loading) {
    return <GridSkeleton />;
  }

  if (uniqueMovies.length === 0 && !loading) {
    return <GridEmpty />;
  }

  return (
    <>
      <CardGrid className="stagger-fade">
        {uniqueMovies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onMovieClick={onMovieClick}
          />
        ))}
      </CardGrid>

      {/* Prefetch Trigger - Earlier */}
      {hasMore && !loading && <div ref={prefetchRef} className="h-1" />}

      {/* Loading Indicator */}
      {loading && <GridLoading />}

      {/* Intersection Observer Target */}
      {hasMore && !loading && <div ref={loadMoreRef} className="h-20" />}

      {/* No More Content */}
      {!hasMore && uniqueMovies.length > 0 && <GridNoMore />}
    </>
  );
}
