'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { LatencyBadge } from '@/components/ui/LatencyBadge';
import type { SourceRowProps } from './types';

export function SourceRow({
  source,
  isCurrent,
  latency,
  badge,
  globalIndex,
  onSelect,
  registerRef,
}: SourceRowProps) {
  return (
    <button
      ref={(element) => registerRef(source.source, element)}
      onClick={() => {
        if (!isCurrent) {
          onSelect(source);
        }
      }}
      className={`
        w-full p-2.5 rounded-[var(--radius-2xl)] text-left transition-all duration-200
        flex items-center gap-2.5
        ${isCurrent
          ? 'bg-[var(--accent-color)] text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--accent-color)_50%,transparent)]'
          : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-hover)] text-[var(--text-color)] border border-[var(--glass-border)] cursor-pointer'
        }
      `}
      aria-current={isCurrent ? 'true' : undefined}
    >
      {source.pic && (
        <div className="w-10 h-14 rounded-[var(--radius-2xl)] overflow-hidden flex-shrink-0 bg-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)]">
          <Image
            src={source.pic}
            alt=""
            width={40}
            height={56}
            className="w-full h-full object-cover"
            unoptimized
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate flex items-center gap-1.5">
          {source.sourceName || source.source}
          {badge ? (
            <span className={`inline-flex items-center px-1 py-0 rounded text-[9px] font-bold text-white ${badge.color}`}>
              {badge.label}
            </span>
          ) : null}
        </div>
        {source.remarks && !badge && (
          <div className="text-[10px] text-[var(--text-color-secondary)] truncate mt-0.5">{source.remarks}</div>
        )}
        {latency !== undefined && (
          <div className="mt-0.5">
            <LatencyBadge latency={latency} />
          </div>
        )}
      </div>
      {isCurrent && (
        <Icons.Play size={14} className="flex-shrink-0" />
      )}
      {!isCurrent && globalIndex < 3 && (
        <Badge
          variant="secondary"
          className={`flex-shrink-0 ${globalIndex === 0 ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500' :
            globalIndex === 1 ? 'bg-gray-400/20 text-gray-600 border-gray-400' :
              'bg-orange-400/20 text-orange-600 border-orange-400'
          }`}
        >
          #{globalIndex + 1}
        </Badge>
      )}
    </button>
  );
}
