
import { ResultsHeader } from '@/components/search/ResultsHeader';
import { SourceBadges } from '@/components/search/SourceBadges';
import { TypeBadges } from '@/components/search/TypeBadges';
import { LanguageBadges } from '@/components/search/LanguageBadges';
import { VideoGrid } from '@/components/search/VideoGrid';
import { useSourceBadges } from '@/lib/hooks/useSourceBadges';
import { useTypeBadges } from '@/lib/hooks/useTypeBadges';
import { useLanguageBadges } from '@/lib/hooks/useLanguageBadges';
import { Video, SourceBadge } from '@/lib/types';

interface SearchResultsProps {
    results: Video[];
    availableSources: SourceBadge[];
    loading: boolean;
    isPremium?: boolean;
    latencies?: Record<string, number>;
    loadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
}

export function SearchResults({
    results,
    availableSources,
    loading,
    isPremium = false,
    latencies = {},
    loadMore,
    hasMore = false,
    loadingMore = false,
}: SearchResultsProps) {
    // Source badges hook - filters by video source
    const {
        selectedSources,
        filteredVideos: sourceFilteredVideos,
        toggleSource,
    } = useSourceBadges(results, availableSources);

    // Type badges hook - auto-collects and filters by type_name
    // Apply on source-filtered results for combined filtering
    const {
        typeBadges,
        selectedTypes,
        filteredVideos: typeFilteredVideos,
        toggleType,
    } = useTypeBadges(sourceFilteredVideos);

    // Language badges hook - auto-collects and filters by vod_lang
    // Apply on type-filtered results for combined filtering
    const {
        languageBadges,
        selectedLangs,
        filteredVideos: finalFilteredVideos,
        toggleLang,
    } = useLanguageBadges(typeFilteredVideos);

    if (results.length === 0 && !loading) return null;

    return (
        <div className="animate-fade-in">
            <ResultsHeader
                loading={loading}
                resultsCount={results.length}
                availableSources={availableSources}
            />

            {/* Source Badges - Clickable video source filtering */}
            {availableSources.length > 0 && (
                <SourceBadges
                    sources={availableSources}
                    selectedSources={selectedSources}
                    onToggleSource={toggleSource}
                    className="mb-6"
                />
            )}

            {/* Type Badges - Auto-collected from search results */}
            {typeBadges.length > 0 && (
                <TypeBadges
                    badges={typeBadges}
                    selectedTypes={selectedTypes}
                    onToggleType={toggleType}
                    className="mb-6"
                />
            )}

            {/* Language Badges - Auto-collected from search results */}
            {languageBadges.length > 0 && (
                <LanguageBadges
                    badges={languageBadges}
                    selectedLangs={selectedLangs}
                    onToggleLang={toggleLang}
                    className="mb-6"
                />
            )}

            {/* Display filtered videos (source, type, and language filters applied) */}
            <VideoGrid
                videos={finalFilteredVideos}
                isPremium={isPremium}
                latencies={latencies}
            />

            {/* Load next page when sources report additional pages available */}
            {hasMore && loadMore && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="btn-glass px-6 py-2.5 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loadingMore ? (
                            <>
                                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span>加载中…</span>
                            </>
                        ) : (
                            <span>加载更多</span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}


