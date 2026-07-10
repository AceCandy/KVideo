'use client';

import { memo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { LatencyBadge } from '@/components/ui/LatencyBadge';
import { PosterCard } from '@/components/ui/PosterCard';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';

import { Video } from '@/lib/types';
import { parseVideoTitle } from '@/lib/utils/video';
import type { ResolutionInfo } from '@/lib/hooks/useResolutionProbe';

interface VideoCardProps {
    video: Video;
    videoUrl: string;
    cardId: string;
    isActive: boolean;
    onCardClick: (e: React.MouseEvent, cardId: string, videoUrl: string) => void;
    isPremium?: boolean;
    latencies?: Record<string, number>;
    resolution?: ResolutionInfo | null;
    isProbing?: boolean;
}

export const VideoCard = memo<VideoCardProps>(({
    video,
    videoUrl,
    cardId,
    isActive,
    onCardClick,
    isPremium = false,
    latencies = {},
    resolution,
    isProbing = false,
}) => {
    const displayLatency = latencies[video.source] ?? video.latency;
    return (
        <PosterCard
            href={videoUrl}
            onClick={(e) => onCardClick(e, cardId, videoUrl)}
            role="listitem"
            ariaLabel={`${video.vod_name}${video.vod_remarks ? ` - ${video.vod_remarks}` : ''}`}
            cardInnerClassName="p-0 flex flex-col h-full bg-[var(--bg-color)]/50 backdrop-blur-none saturate-100 shadow-[var(--shadow-sm)] border-[var(--glass-border)] hover:shadow-[var(--shadow-lg)] transition-shadow"
            cardInnerStyle={{ backfaceVisibility: 'hidden' }}
            posterClassName="bg-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)] overflow-hidden"
            image={video.vod_pic}
            imageAlt={video.vod_name}
            imageSizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
            imageClassName="object-cover"
            onImageError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.opacity = '0';
            }}
            posterChildren={
                <>
                    {/* vod_pic 为空时的居中占位图标（有图时不渲染，Image 失败由 onError 改 opacity 露出下方兜底层） */}
                    {!video.vod_pic ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <Icons.Film size={64} className="text-[var(--text-color-secondary)]" />
                        </div>
                    ) : null}

                    {/* 兜底层：Image 加载失败（opacity:0）或无图时露出 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 gap-2">
                        <Icons.Film size={48} className="text-[var(--text-color-secondary)] opacity-40" />
                        <span className="text-xs text-[var(--text-color-secondary)] opacity-60 px-2 text-center line-clamp-2">{video.vod_name}</span>
                    </div>

                    {/* Badge 容器：来源 / 类型 / 延迟 */}
                    <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                            {video.sourceName && (
                                <Badge variant="primary" className="bg-[var(--accent-color)] flex-shrink-0 max-w-[50%] truncate">
                                    {video.sourceName}
                                </Badge>
                            )}
                            {video.type_name && (
                                <Badge variant="secondary" className="flex-shrink-0 max-w-[40%] truncate text-[10px]">
                                    {video.type_name}
                                </Badge>
                            )}
                        </div>

                        {displayLatency !== undefined && (
                            <LatencyBadge latency={displayLatency} className="flex-shrink-0" />
                        )}
                    </div>

                    {/* 收藏按钮（右上，激活或 hover 可见） */}
                    <div className={`absolute top-2 right-2 z-20 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <FavoriteButton
                            videoId={video.vod_id}
                            source={video.source}
                            title={video.vod_name}
                            poster={video.vod_pic}
                            sourceName={video.sourceName}
                            type={video.type_name}
                            year={video.vod_year}
                            remarks={video.vod_remarks}
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
                            {video.type_name && (
                                <Badge variant="secondary" className="text-xs mb-2">
                                    {video.type_name}
                                </Badge>
                            )}
                            {video.vod_year && (
                                <div className="flex items-center gap-1 text-white/80 text-xs">
                                    <Icons.Calendar size={12} />
                                    <span>{video.vod_year}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            }
            footer={
                (() => {
                    const { cleanTitle } = parseVideoTitle(video.vod_name);

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
                            {video.vod_lang && (
                                <p className="text-xs text-[var(--text-color-secondary)] mt-1">
                                    {video.vod_lang}
                                </p>
                            )}
                        </>
                    );
                })()
            }
        />
    );
});

VideoCard.displayName = 'VideoCard';
