import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import { Card } from '@/components/ui/Card';

export interface PosterCardProps {
    /** 卡片跳转地址 */
    href: string;
    /** 点击回调（修饰键放行逻辑由消费方在回调内自行处理） */
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    /** 外层交互元素的可访问性标签 */
    ariaLabel?: string;
    /** 外层 role（部分业务卡需要 listitem） */
    role?: React.AriaRole;
    /** 外层额外 class（默认已含 group/hover 抬升/transition） */
    cardClassName?: string;
    /** 外层额外 style（如 contentVisibility） */
    cardStyle?: React.CSSProperties;

    /** 内层 Card 的 className，各业务卡视觉差异通过此 prop 逐字迁移 */
    cardInnerClassName?: string;
    /** 内层 Card 的 style */
    cardInnerStyle?: React.CSSProperties;
    /** 内层 Card 的 hover 开关（默认 false，与现有海报卡一致） */
    cardInnerHover?: boolean;

    /** 海报容器额外 class（容器默认已含 relative aspect-[2/3] rounded） */
    posterClassName?: string;

    /** 海报图地址；为空时跳过 Image 直接渲染 posterChildren 作为兜底 */
    image?: string;
    imageAlt: string;
    imageSizes: string;
    imageClassName?: string;
    /** Image 加载失败回调，由消费方决定如何处理（改 opacity / 切换兜底图等） */
    onImageError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
    /** 海报容器内 Image 之外的子内容：overlay / badge / 兜底层等 */
    posterChildren?: React.ReactNode;

    /** 卡底部 info 区内容；为空则不渲染底部外壳 */
    footer?: React.ReactNode;
    /** 底部外壳额外 class（默认 p-3 flex-1 flex flex-col） */
    footerClassName?: string;
}

/**
 * 海报卡共享骨架：统一 4 处重复结构。
 * - 外层交互元素 + group hover + z-index hover hack（hover 时提升至顶层）
 * - relative aspect-[2/3] 海报容器 + Image fill + 兜底渲染
 * - 底部 info 区外壳
 *
 * 不收纳：各卡的业务内容（收藏按钮、延迟徽章、解析标题、URL 构造、评分跳转、
 * 移动端激活态等）—— 由消费方通过 slot 传入。
 */
export function PosterCard({
    href,
    onClick,
    ariaLabel,
    role,
    cardClassName = '',
    cardStyle,
    cardInnerClassName = '',
    cardInnerStyle,
    cardInnerHover = false,
    posterClassName = '',
    image,
    imageAlt,
    imageSizes,
    imageClassName = '',
    onImageError,
    posterChildren,
    footer,
    footerClassName = 'p-3 flex-1 flex flex-col',
}: PosterCardProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            aria-label={ariaLabel}
            role={role}
            prefetch={false}
            data-focusable
            className={`group cursor-pointer hover:translate-y-[-2px] transition-transform duration-200 ease-out block h-full ${cardClassName}`}
            style={{
                position: 'relative',
                zIndex: 1,
                ...cardStyle,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.zIndex = '100')}
            onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
        >
            <Card
                className={cardInnerClassName}
                hover={cardInnerHover}
                blur={false}
                style={cardInnerStyle}
            >
                <div className={`relative aspect-[2/3] rounded-[var(--radius-2xl)] ${posterClassName}`}>
                    {image ? (
                        <Image
                            src={image}
                            alt={imageAlt}
                            fill
                            className={`object-cover rounded-[var(--radius-2xl)] ${imageClassName}`}
                            sizes={imageSizes}
                            loading="eager"
                            unoptimized
                            referrerPolicy="no-referrer"
                            onError={onImageError}
                        />
                    ) : null}
                    {posterChildren}
                </div>
                {footer ? <div className={footerClassName}>{footer}</div> : null}
            </Card>
        </Link>
    );
}
