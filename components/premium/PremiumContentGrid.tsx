'use client';

import { Video } from '@/lib/types';
import React from 'react';
import { CardGrid } from '@/components/ui/CardGrid';
import { GridEmpty, GridLoading, GridNoMore } from '@/components/ui/GridState';
import { PosterCard } from '@/components/ui/PosterCard';

interface PremiumContentGridProps {
    videos: Video[];
    loading: boolean;
    hasMore: boolean;
    onVideoClick?: (video: Video) => void;
    prefetchRef: React.RefObject<HTMLDivElement | null>;
    loadMoreRef: React.RefObject<HTMLDivElement | null>;
}

export function PremiumContentGrid({
    videos,
    loading,
    hasMore,
    onVideoClick,
    prefetchRef,
    loadMoreRef,
}: PremiumContentGridProps) {
    if (videos.length === 0 && !loading) {
        return <GridEmpty />;
    }

    return (
        <>
            <CardGrid>
                {videos.map((video) => (
                    <PosterCard
                        key={`${video.source}-${video.vod_id}`}
                        href={`/premium?q=${encodeURIComponent(video.vod_name)}`}
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            // Allow default behavior for modifier keys (new tab, etc.)
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

                            e.preventDefault();
                            onVideoClick?.(video);
                        }}
                        cardStyle={{ contentVisibility: 'auto' }}
                        cardInnerClassName="p-0 h-full shadow-[0_2px_8px_var(--shadow-color)] hover:shadow-[0_8px_24px_var(--shadow-color)] transition-shadow duration-200 ease-out"
                        posterClassName="bg-[var(--glass-bg)]"
                        image={video.vod_pic}
                        imageAlt={video.vod_name}
                        imageSizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        imageClassName="object-cover transition-transform duration-300 group-hover:scale-105"
                        posterChildren={
                            <>
                                {/* 无封面兜底 */}
                                {!video.vod_pic ? (
                                    <div className="w-full h-full flex items-center justify-center text-[var(--text-color-secondary)]">
                                        无封面
                                    </div>
                                ) : null}
                                {video.vod_remarks && (
                                    <div className="absolute top-2 right-2 bg-black/80 px-2.5 py-1.5 flex items-center gap-1.5 rounded-[var(--radius-full)]">
                                        <span className="text-xs font-bold text-white">
                                            {video.vod_remarks}
                                        </span>
                                    </div>
                                )}
                            </>
                        }
                        footerClassName="p-3"
                        footer={
                            <>
                                <h3 className="font-semibold text-sm text-[var(--text-color)] line-clamp-2 group-hover:text-[var(--accent-color)] transition-colors">
                                    {video.vod_name}
                                </h3>
                                {video.type_name && (
                                    <p className="text-xs text-[var(--text-color-secondary)] mt-1">
                                        {video.type_name}
                                    </p>
                                )}
                            </>
                        }
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
            {!hasMore && videos.length > 0 && <GridNoMore />}
        </>
    );
}
