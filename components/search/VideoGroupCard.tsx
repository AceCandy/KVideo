'use client';

/**
 * VideoGroupCard - Displays grouped videos with same name as single card
 * Following Liquid Glass design system
 */

import { memo, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { LatencyBadge } from '@/components/ui/LatencyBadge';
import { PosterCard } from '@/components/ui/PosterCard';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { Video } from '@/lib/types';
import { parseVideoTitle } from '@/lib/utils/video';
import { storeGroupedSources } from '@/lib/utils/grouped-sources-cache';
import type { ResolutionInfo } from '@/lib/hooks/useResolutionProbe';

export interface GroupedVideo {
    /** Representative video (lowest latency) */
    representative: Video;
    /** All videos in this group */
    videos: Video[];
    /** Group name (vod_name) */
    name: string;
}

interface VideoGroupCardProps {
    group: GroupedVideo;
    cardId: string;
    isActive: boolean;
    onCardClick: (e: React.MouseEvent, cardId: string, videoUrl: string) => void;
    isPremium?: boolean;
    latencies?: Record<string, number>;
    resolution?: ResolutionInfo | null;
    isProbing?: boolean;
}

export const VideoGroupCard = memo<VideoGroupCardProps>(({
    group,
    cardId,
    isActive,
    onCardClick,
    isPremium = false,
    latencies = {},
    resolution,
    isProbing = false,
}) => {
    const { representative, videos, name } = group;

    // Best latency from the group, preferring real-time updates
    const bestLatency = useMemo(() => {
        const currentLatencies = videos.map(v => latencies[v.source] ?? v.latency).filter(l => l !== undefined) as number[];
        return currentLatencies.length > 0 ? Math.min(...currentLatencies) : undefined;
    }, [videos, latencies]);

    // Generate URL with grouped sources stored in sessionStorage (avoids long URLs / 414 errors)
    const videoUrl = useMemo(() => {
        const params = new URLSearchParams({
            id: String(representative.vod_id),
            source: representative.source,
            title: representative.vod_name,
        });

        // Store group data in sessionStorage and pass short key in URL
        if (videos.length > 1) {
            const groupData = videos.map(v => ({
                id: v.vod_id,
                source: v.source,
                sourceName: v.sourceName,
                latency: v.latency,
                pic: v.vod_pic,
                typeName: v.type_name,
                remarks: v.vod_remarks,
            }));
            const cacheKey = storeGroupedSources(groupData);
            if (cacheKey) {
                params.set('gs', cacheKey);
            }
        }

        if (isPremium) {
            params.set('premium', '1');
        }

        return `/player?${params.toString()}`;
    }, [representative, videos, isPremium]);

    return (
        <PosterCard
            href={videoUrl}
            onClick={(e) => onCardClick(e, cardId, videoUrl)}
            role="listitem"
            ariaLabel={`${name} - ${videos.length} 个源${representative.vod_remarks ? ` - ${representative.vod_remarks}` : ''}`}
            cardInnerClassName="p-0 flex flex-col h-full bg-[var(--bg-color)]/50 backdrop-blur-none saturate-100 shadow-[var(--shadow-sm)] border-[var(--glass-border)] hover:shadow-[var(--shadow-lg)] transition-shadow"
            cardInnerStyle={{ backfaceVisibility: 'hidden' }}
            posterClassName="bg-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)] overflow-hidden"
            image={representative.vod_pic}
            imageAlt={name}
            imageSizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
            imageClassName="object-cover"
            onImageError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.opacity = '0';
            }}
            posterChildren={
                <>
                    {/* 代表图缺失时的居中占位图标 */}
                    {!representative.vod_pic ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <Icons.Film size={64} className="text-[var(--text-color-secondary)]" />
                        </div>
                    ) : null}

                    {/* 兜底层：Image 失败（opacity:0）或无图时露出 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 gap-2">
                        <Icons.Film size={48} className="text-[var(--text-color-secondary)] opacity-40" />
                        <span className="text-xs text-[var(--text-color-secondary)] opacity-60 px-2 text-center line-clamp-2">{name}</span>
                    </div>

                    {/* Badge 容器：源数量 / 最佳延迟 */}
                    <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-1">
                        <Badge variant="primary" className="bg-[var(--accent-color)] flex-shrink-0">
                            <Icons.Layers size={12} className="mr-1" />
                            {videos.length} 源
                        </Badge>

                        {bestLatency !== undefined && (
                            <LatencyBadge latency={bestLatency} className="flex-shrink-0" />
                        )}
                    </div>

                    {/* 收藏按钮（右上，激活或 hover 可见） */}
                    <div className={`absolute top-2 right-2 z-20 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <FavoriteButton
                            videoId={representative.vod_id}
                            source={representative.source}
                            title={name}
                            poster={representative.vod_pic}
                            sourceName={representative.sourceName}
                            type={representative.type_name}
                            year={representative.vod_year}
                            remarks={representative.vod_remarks}
                            sourceMap={Object.fromEntries(videos.map((video) => [video.source, video.vod_id]))}
                            size={16}
                            className="shadow-md"
                            isPremium={isPremium}
                        />
                    </div>

                    {/* 激活/悬停遮罩 */}
                    <div
                        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${isActive ? 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100' : 'opacity-0 lg:group-hover:opacity-100'
                            }`}
                    >
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            {isActive && (
                                <div className="lg:hidden text-white/90 text-xs mb-2 font-medium">
                                    再次点击播放 →
                                </div>
                            )}
                            {representative.type_name && (
                                <Badge variant="secondary" className="text-xs mb-2">
                                    {representative.type_name}
                                </Badge>
                            )}
                            {representative.vod_year && (
                                <div className="flex items-center gap-1 text-white/80 text-xs">
                                    <Icons.Calendar size={12} />
                                    <span>{representative.vod_year}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            }
            footer={
                (() => {
                    const { cleanTitle } = parseVideoTitle(name);

                    return (
                        <>
                            <h4 className="font-semibold text-sm text-[var(--text-color)] line-clamp-2 min-h-[2.5rem] mb-1">
                                {cleanTitle}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {resolution ? (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${resolution.color}`}>
                                        {resolution.label}
                                    </span>
                                ) : isProbing ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white/50 bg-gray-500/50 animate-pulse">
                                        ...
                                    </span>
                                ) : null}
                            </div>
                            {representative.vod_lang && (
                                <p className="text-xs text-[var(--text-color-secondary)] mt-1">
                                    {representative.vod_lang}
                                </p>
                            )}
                        </>
                    );
                })()
            }
        />
    );
});

VideoGroupCard.displayName = 'VideoGroupCard';
