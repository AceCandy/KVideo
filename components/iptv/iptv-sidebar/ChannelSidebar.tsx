'use client';

import { useRef, useEffect, useState, useCallback, useMemo, useTransition } from 'react';
import { Icons } from '@/components/ui/Icon';
import type { M3UChannel } from '@/lib/utils/m3u-parser';
import type { ChannelSidebarProps } from './types';

/**
 * ChannelSidebar — self-contained IPTV channel sidebar.
 *
 * Mounted by the player shell only while visible. Owns search, source/group
 * expansion, pagination, and scroll state. The active channel is highlighted
 * and auto-scrolled into view; multi-source data renders as a source -> group
 * -> channel tree, otherwise a flat paginated list.
 */
export function ChannelSidebar({ channel, channels, channelsBySource, sources, onChannelChange, onClose }: ChannelSidebarProps) {
  const activeChannelRef = useRef<HTMLButtonElement>(null);

  const [sidebarSearch, setSidebarSearch] = useState('');
  const [filteredResults, setFilteredResults] = useState<M3UChannel[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const [sidebarVisibleCount, setSidebarVisibleCount] = useState(50);

  // Multi-level sidebar state
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Whether we have multi-source data
  const hasMultiSource = channelsBySource && sources && sources.length > 0;
  const activeSourceId = channel.sourceId || null;
  const activeGroupKey = activeSourceId && channel.group ? `${activeSourceId}::${channel.group}` : null;
  const activeSource = useMemo(
    () => (activeSourceId && sources ? sources.find((source) => source.id === activeSourceId) || null : null),
    [activeSourceId, sources]
  );

  // Auto-scroll to active channel in sidebar
  useEffect(() => {
    if (activeChannelRef.current) {
      activeChannelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [channel.url]);

  // Auto-expand the source/group containing the active channel
  useEffect(() => {
    if (channel.sourceId) {
      setExpandedSources(prev => new Set(prev).add(channel.sourceId!));
      if (channel.group) {
        setExpandedGroups(prev => new Set(prev).add(`${channel.sourceId}::${channel.group}`));
      }
    }
  }, [channel.sourceId, channel.group]);

  // Debounce search with useTransition for non-blocking rendering
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = sidebarSearch.toLowerCase().trim();
      if (!q) {
        setFilteredResults([]);
        setSidebarVisibleCount(50);
        return;
      }
      startSearchTransition(() => {
        const results = channels.filter(ch => ch.name.toLowerCase().includes(q));
        setFilteredResults(results);
        setSidebarVisibleCount(50);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [sidebarSearch, channels]);

  const isSearchMode = sidebarSearch.trim().length > 0;

  // Toggle source expansion
  const toggleSource = useCallback((sourceId: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }, []);

  // Toggle group expansion
  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleActiveSource = useCallback(() => {
    if (!activeSourceId) return;
    toggleSource(activeSourceId);
  }, [activeSourceId, toggleSource]);

  const toggleActiveGroup = useCallback(() => {
    if (!activeSourceId || !channel.group) return;
    setExpandedSources(prev => new Set(prev).add(activeSourceId));
    toggleGroup(`${activeSourceId}::${channel.group}`);
  }, [activeSourceId, channel.group, toggleGroup]);

  // Render a channel button
  const renderChannelButton = (ch: M3UChannel, i: number) => {
    const isActive = ch.name === channel.name && ch.url === channel.url;
    return (
      <button
        key={`${ch.sourceId || ''}-${ch.name}-${i}`}
        ref={isActive ? activeChannelRef : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onChannelChange(ch);
        }}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
          isActive
            ? 'bg-[var(--accent-color)] text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 animate-pulse" />
          )}
          <span className="truncate flex-1">{ch.name}</span>
          {ch.routes && ch.routes.length > 1 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
              isActive ? 'bg-white/20' : 'bg-white/5 text-white/40'
            }`}>
              {ch.routes.length}线路
            </span>
          )}
        </div>
      </button>
    );
  };

  // Render multi-level sidebar content
  const renderMultiLevelSidebar = () => {
    if (!channelsBySource || !sources) return null;
    const orderedSources = activeSourceId
      ? [
        ...sources.filter((source) => source.id === activeSourceId),
        ...sources.filter((source) => source.id !== activeSourceId),
      ]
      : sources;

    return (
      <div className="p-1">
        {orderedSources.map(source => {
          const sourceData = channelsBySource[source.id];
          if (!sourceData || sourceData.channels.length === 0) return null;

          const isExpanded = expandedSources.has(source.id);
          const isActiveSource = source.id === activeSourceId;
          const orderedGroups = isActiveSource && channel.group
            ? [channel.group, ...sourceData.groups.filter((group) => group !== channel.group)]
            : sourceData.groups;

          return (
            <div key={source.id} className="mb-1">
              {/* Source Header */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleSource(source.id); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActiveSource
                    ? 'bg-white/10 text-white'
                    : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icons.TV size={14} className="flex-shrink-0 text-[var(--accent-color)]" />
                  <span className="truncate">{source.name}</span>
                  <span className="text-[10px] text-white/40 flex-shrink-0">{sourceData.channels.length}</span>
                </div>
                <Icons.ChevronDown
                  size={14}
                  className={`flex-shrink-0 text-white/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Source Content */}
              {isExpanded && (
                <div className="ml-2 border-l border-white/10 pl-1">
                  {orderedGroups.length > 0 ? (
                    // Has groups — show group-level
                    orderedGroups.map(group => {
                      const groupKey = `${source.id}::${group}`;
                      const groupExpanded = expandedGroups.has(groupKey);
                      const groupChannels = sourceData.channels.filter(ch => ch.group === group);
                      const isActiveGroup = groupKey === activeGroupKey;

                      return (
                        <div key={groupKey} className="mb-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleGroup(groupKey); }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                              isActiveGroup
                                ? 'bg-white/10 text-white'
                                : 'text-white/60 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Icons.Tag size={12} className="flex-shrink-0" />
                              <span className="truncate">{group}</span>
                              <span className="text-[10px] text-white/30 flex-shrink-0">{groupChannels.length}</span>
                            </div>
                            <Icons.ChevronDown
                              size={12}
                              className={`flex-shrink-0 text-white/30 transition-transform duration-200 ${groupExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {groupExpanded && (
                            <div className="ml-2">
                              {groupChannels.map((ch, i) => renderChannelButton(ch, i))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    // No groups — show channels directly
                    sourceData.channels.map((ch, i) => renderChannelButton(ch, i))
                  )}

                  {/* Ungrouped channels */}
                  {sourceData.groups.length > 0 && (() => {
                    const ungrouped = sourceData.channels.filter(ch => !ch.group);
                    if (ungrouped.length === 0) return null;
                    return (
                      <div className="mb-0.5">
                        <div className="px-2 py-1 text-[10px] text-white/30">未分组</div>
                        {ungrouped.map((ch, i) => renderChannelButton(ch, i))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render flat channel list (search results or single-source fallback)
  const renderFlatChannelList = (channelList: M3UChannel[]) => {
    const visible = channelList.slice(0, sidebarVisibleCount);
    return (
      <div className="p-1">
        {visible.map((ch, i) => renderChannelButton(ch, i))}
        {channelList.length > sidebarVisibleCount && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSidebarVisibleCount(prev => prev + 50);
            }}
            className="w-full py-2 text-xs text-white/50 hover:text-white/80 transition-colors cursor-pointer"
          >
            显示更多 ({channelList.length - sidebarVisibleCount} 个频道)
          </button>
        )}
      </div>
    );
  };

  return (
    <div data-sidebar className="w-72 bg-[#111] border-l border-white/10 overflow-y-auto flex-shrink-0">
      <div className="sticky top-0 bg-[#111] z-10">
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white text-sm font-medium">频道列表</h3>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-white/50 hover:text-white cursor-pointer"
          >
            <Icons.X size={16} />
          </button>
        </div>
        <div className="px-3 py-2 border-b border-white/10">
          <div className="relative">
            <Icons.Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="搜索频道..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full pl-7 pr-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
            {isSearching && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
        {(activeSource || channel.group) && (
          <div className="px-3 py-2 border-b border-white/10">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">当前</span>
              {activeSource && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActiveSource();
                  }}
                  className={`px-2 py-1 rounded-full text-[11px] border transition-colors cursor-pointer ${
                    activeSourceId && expandedSources.has(activeSourceId)
                      ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  源: {activeSource.name}
                </button>
              )}
              {channel.group && activeGroupKey && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActiveGroup();
                  }}
                  className={`px-2 py-1 rounded-full text-[11px] border transition-colors cursor-pointer ${
                    expandedGroups.has(activeGroupKey)
                      ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  标签: {channel.group}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Content */}
      {isSearchMode ? (
        // Search mode — flat list of filtered results
        renderFlatChannelList(filteredResults)
      ) : hasMultiSource ? (
        // Multi-source mode — hierarchical list
        renderMultiLevelSidebar()
      ) : (
        // Single source or fallback — flat list
        renderFlatChannelList(channels)
      )}
    </div>
  );
}
