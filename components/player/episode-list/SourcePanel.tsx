'use client';

import { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { settingsStore } from '@/lib/store/settings-store';
import type { VideoResolutionInfo } from '../hooks/useVideoResolution';
import type { ResolutionInfo } from '@/lib/hooks/useResolutionProbe';
import { getCachedResolution } from '@/lib/player/resolution-cache';
import { getSourceResolutionBadge, shouldExpandForCurrentSource } from '@/lib/player/source-list-utils';
import { SourceRow } from './SourceRow';
import type { SourceInfo } from './types';

const MAX_VISIBLE = 5;

interface SourcePanelProps {
  sources: SourceInfo[];
  currentSource?: string;
  onSourceChange: (source: SourceInfo) => void;
  currentResolution?: VideoResolutionInfo | null;
  sourceResolutions?: Record<string, ResolutionInfo | null>;
  sourceSectionCollapsed?: boolean;
  onSourceSectionCollapseChange?: (collapsed: boolean) => void;
}

export function SourcePanel({
  sources,
  currentSource,
  onSourceChange,
  currentResolution,
  sourceResolutions,
  sourceSectionCollapsed = false,
  onSourceSectionCollapseChange,
}: SourcePanelProps) {
  const sourceItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const [latencies, setLatencies] = useState<Record<string, number>>({});
  const [isLoadingLatency, setIsLoadingLatency] = useState(false);

  const getResBadge = useCallback((source: SourceInfo, isCurrent: boolean) => {
    const probeKey = `${source.source}:${source.id}`;
    return getSourceResolutionBadge({
      isCurrent,
      currentResolution: currentResolution || undefined,
      probedResolution: sourceResolutions?.[probeKey] || undefined,
      cachedResolution: getCachedResolution(source.source, source.id) || undefined,
      remarks: source.remarks,
    });
  }, [currentResolution, sourceResolutions]);

  const currentSourceInfo = useMemo(() => {
    if (!currentSource) return null;
    return sources.find(s => s.source === currentSource) || null;
  }, [sources, currentSource]);

  const initialLatencies = useMemo(() => {
    return sources.reduce<Record<string, number>>((accumulator, source) => {
      if (source.latency !== undefined) {
        accumulator[source.source] = source.latency;
      }
      return accumulator;
    }, {});
  }, [sources]);

  const mergedLatencies = useMemo(() => ({
    ...initialLatencies,
    ...latencies,
  }), [initialLatencies, latencies]);

  const sortedSources = useMemo(() => {
    return [...sources].sort((a, b) => {
      const latA = mergedLatencies[a.source] ?? a.latency ?? Infinity;
      const latB = mergedLatencies[b.source] ?? b.latency ?? Infinity;
      return latA - latB;
    });
  }, [mergedLatencies, sources]);

  const isSourceListOpen = !sourceSectionCollapsed && sourceExpanded;
  const forceExpandedForCurrentSource = !!currentSource && shouldExpandForCurrentSource(sortedSources, currentSource);
  const showAllVisibleSources = showAllSources || forceExpandedForCurrentSource;

  useEffect(() => {
    if (!isSourceListOpen || !currentSource) return;

    const frame = requestAnimationFrame(() => {
      sourceItemRefs.current[currentSource]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [currentSource, isSourceListOpen, showAllVisibleSources, sortedSources]);

  const getSourcePingUrl = useCallback((sourceId: string): string | null => {
    const settings = settingsStore.getSettings();
    const allConfigs = [
      ...settings.sources,
      ...settings.premiumSources,
    ];
    const config = allConfigs.find(s => s.id === sourceId);
    return config?.baseUrl || null;
  }, []);

  useEffect(() => {
    const hasMissing = sources.some((source) => source.latency === undefined);

    if (hasMissing && sources.length > 1) {
      const autoRefresh = async () => {
        const missing = sources.filter(s => s.latency === undefined);
        const results = await Promise.all(
          missing.map(async (source) => {
            try {
              const pingUrl = getSourcePingUrl(source.source);
              if (!pingUrl) return { source: source.source, latency: undefined };
              const response = await fetch('/api/ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: pingUrl }),
              });
              if (response.ok) {
                const data = await response.json();
                return { source: source.source, latency: data.latency as number | undefined };
              }
            } catch { /* ignore */ }
            return { source: source.source, latency: undefined };
          })
        );
        setLatencies(prev => {
          const updated = { ...prev };
          results.forEach(({ source, latency }) => {
            if (latency !== undefined) updated[source] = latency;
          });
          return updated;
        });
      };
      autoRefresh();
    }
  }, [sources, getSourcePingUrl]);

  const refreshLatencies = useCallback(async () => {
    setIsLoadingLatency(true);

    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const pingUrl = getSourcePingUrl(source.source);
          if (!pingUrl) return { source: source.source, latency: undefined };
          const response = await fetch('/api/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pingUrl }),
          });
          if (response.ok) {
            const data = await response.json();
            return { source: source.source, latency: data.latency };
          }
        } catch {
          // Ignore errors
        }
        return { source: source.source, latency: undefined };
      })
    );

    const newLatencies: Record<string, number> = {};
    results.forEach(({ source, latency }) => {
      if (latency !== undefined) {
        newLatencies[source] = latency;
      }
    });
    setLatencies(newLatencies);
    setIsLoadingLatency(false);
  }, [sources, getSourcePingUrl]);

  const registerRef = useCallback((key: string, el: HTMLButtonElement | null) => {
    sourceItemRefs.current[key] = el;
  }, []);

  const handleSourceSelect = useCallback((source: SourceInfo) => {
    onSourceChange(source);
    setSourceExpanded(false);
  }, [onSourceChange]);

  const visibleSources = showAllVisibleSources ? sortedSources : sortedSources.slice(0, MAX_VISIBLE);
  const hasMoreSources = sortedSources.length > MAX_VISIBLE;

  const renderSourceRow = (source: SourceInfo) => {
    const isCurrent = source.source === currentSource;
    const latency = mergedLatencies[source.source] ?? source.latency;
    const globalIndex = sortedSources.indexOf(source);
    const badge = getResBadge(source, isCurrent);
    return (
      <SourceRow
        key={`${source.source}-${globalIndex}`}
        source={source}
        isCurrent={isCurrent}
        latency={latency}
        badge={badge}
        globalIndex={globalIndex}
        onSelect={handleSourceSelect}
        registerRef={registerRef}
      />
    );
  };

  const groupedByType = new Map<string, SourceInfo[]>();
  for (const source of visibleSources) {
    const typeName = source.typeName || '';
    if (!groupedByType.has(typeName)) groupedByType.set(typeName, []);
    groupedByType.get(typeName)!.push(source);
  }
  const hasTypeGroups = groupedByType.size > 1 || (groupedByType.size === 1 && !groupedByType.has(''));

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icons.Layers size={18} className="text-[var(--text-color)]" />
          <span className="text-base sm:text-lg font-semibold text-[var(--text-color)]">
            源列表
          </span>
          <Badge variant="primary">{sources.length}</Badge>
        </div>
        <button
          onClick={() => onSourceSectionCollapseChange?.(!sourceSectionCollapsed)}
          className="ml-auto p-1.5 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] text-[var(--text-color-secondary)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)] transition-all duration-200 cursor-pointer"
          aria-label={sourceSectionCollapsed ? '展开源列表' : '折叠源列表'}
          title={sourceSectionCollapsed ? '展开源列表' : '折叠源列表'}
        >
          <Icons.ChevronDown
            size={16}
            className={`transition-transform duration-200 ${sourceSectionCollapsed ? '-rotate-90' : 'rotate-0'}`}
          />
        </button>
      </div>

      <div className="p-3 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <div className="flex items-start gap-3">
          <button
            onClick={() => {
              if (!sourceSectionCollapsed) {
                setSourceExpanded((current) => !current);
              }
            }}
            className={`flex-1 min-w-0 flex items-center justify-between gap-3 text-left ${sourceSectionCollapsed ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-[var(--text-color)] truncate">
                {currentSourceInfo?.sourceName || currentSourceInfo?.source || '当前来源'}
              </span>
              {currentResolution && (
                <span className={`inline-flex items-center px-1 py-0 rounded text-[9px] font-bold text-white ${currentResolution.color} flex-shrink-0`}>
                  {currentResolution.label}
                </span>
              )}
            </div>
            {!sourceSectionCollapsed && (
              <Icons.ChevronDown
                size={16}
                className={`flex-shrink-0 text-[var(--text-color-secondary)] transition-transform duration-200 ${isSourceListOpen ? 'rotate-180' : 'rotate-0'}`}
              />
            )}
          </button>

          {!sourceSectionCollapsed && (
            <Button
              variant="secondary"
              onClick={(event) => {
                event.stopPropagation();
                refreshLatencies();
              }}
              disabled={isLoadingLatency}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 min-h-[36px] md:px-3 md:py-1.5 md:text-sm"
            >
              <Icons.RefreshCw size={12} className={isLoadingLatency ? 'animate-spin' : ''} />
              刷新延迟
            </Button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-color-secondary)]">
          <span className="truncate">
            当前线路：{currentSourceInfo?.sourceName || currentSourceInfo?.source || '未知来源'}
          </span>
          <span className="shrink-0">共 {sources.length} 条</span>
        </div>
      </div>

      {isSourceListOpen && (
        <div className="mt-2 space-y-2">
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {hasTypeGroups ? (
              Array.from(groupedByType.entries()).map(([typeName, typeSources]) => (
                <div key={typeName || '__default'}>
                  {typeName && (
                    <div className="text-[10px] font-medium text-[var(--text-color-secondary)] uppercase tracking-wider px-2 pt-2 pb-1">
                      {typeName}
                    </div>
                  )}
                  {typeSources.map(renderSourceRow)}
                </div>
              ))
            ) : (
              visibleSources.map(renderSourceRow)
            )}
          </div>
          {hasMoreSources && (
            <button
              onClick={() => setShowAllSources((current) => !current)}
              className="w-full mt-1.5 py-1.5 text-xs text-[var(--text-color-secondary)] hover:text-[var(--accent-color)] flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              {showAllVisibleSources ? (
                <>收起 <Icons.ChevronDown size={12} className="rotate-180" /></>
              ) : (
                <>展开更多 ({sortedSources.length - MAX_VISIBLE}) <Icons.ChevronDown size={12} /></>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
