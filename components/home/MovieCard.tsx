/**
 * MovieCard - Individual movie card component
 * Displays movie poster, title, and rating
 */

import { memo, useState } from 'react';
import { Icons } from '@/components/ui/Icon';
import { PosterCard } from '@/components/ui/PosterCard';

interface DoubanMovie {
  id: string;
  title: string;
  cover: string;
  rate: string;
  url: string;
}

interface MovieCardProps {
  movie: DoubanMovie;
  onMovieClick: (movie: DoubanMovie) => void;
}

export const MovieCard = memo(function MovieCard({ movie, onMovieClick }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  return (
    <PosterCard
      href={`/?q=${encodeURIComponent(movie.title)}`}
      onClick={(e) => {
        // Allow default behavior for modifier keys (new tab, etc.)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        e.preventDefault();
        onMovieClick(movie);
      }}
      cardStyle={{ contentVisibility: 'auto' }}
      cardInnerClassName="p-0 h-full shadow-[0_2px_8px_var(--shadow-color)] hover:shadow-[0_8px_24px_var(--shadow-color)] transition-shadow duration-200 ease-out"
      posterClassName="bg-[var(--glass-bg)]"
      image={!imageError ? movie.cover : !fallbackError ? '/placeholder-poster.svg' : undefined}
      imageAlt={movie.title}
      imageSizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
      imageClassName={!imageError ? 'object-cover transition-transform duration-300 group-hover:scale-105' : 'object-cover'}
      onImageError={() => {
        if (!imageError) {
          setImageError(true);
        } else if (!fallbackError) {
          setFallbackError(true);
        }
      }}
      posterChildren={
        <>
          {/* 主图与兜底图全部失败时的文字占位 */}
          {imageError && fallbackError ? (
            <div className="w-full h-full flex items-center justify-center bg-[var(--glass-bg)] rounded-[var(--radius-2xl)]">
              <p className="text-sm text-[var(--text-muted)]">暂无图片</p>
            </div>
          ) : null}
          {movie.rate && parseFloat(movie.rate) > 0 && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); // 阻止事件冒泡，防止触发外层卡片的搜索点击
                window.open(movie.url, '_blank', 'noopener,noreferrer');
              }}
              title="在豆瓣中查看"
              className="absolute top-2 right-2 bg-black/80 hover:bg-black/90 px-2.5 py-1.5 flex items-center gap-1.5 rounded-[var(--radius-full)] z-20 hover:scale-105 transition-all shadow-md"
            >
              <Icons.Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-white">
                {movie.rate}
              </span>
            </div>
          )}
        </>
      }
      footerClassName="pt-3"
      footer={
        <h3 className="font-semibold text-sm text-center text-[var(--text-color)] line-clamp-2 group-hover:text-[var(--accent-color)] transition-colors">
          {movie.title}
        </h3>
      }
    />
  );
});
