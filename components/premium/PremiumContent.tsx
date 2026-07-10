'use client';

import { TagManager } from '@/components/home/TagManager';
import { PremiumContentGrid } from './PremiumContentGrid';
import { usePremiumTagManager } from '@/lib/hooks/usePremiumTagManager';
import { usePremiumContent } from '@/lib/hooks/usePremiumContent';
import type { Video } from '@/lib/types';

interface PremiumContentProps {
    onSearch?: (query: string) => void;
}

/**
 * 高级区主内容：标签筛选 + premium 源内容流。
 * 不再展示「为你推荐」标签——个性化推荐统一收敛到导航的「猜你想看」入口。
 */
export function PremiumContent({ onSearch }: PremiumContentProps) {
    const {
        tags,
        selectedTag,
        newTagInput,
        showTagManager,
        justAddedTag,
        setSelectedTag,
        setNewTagInput,
        setShowTagManager,
        setJustAddedTag,
        handleAddTag,
        handleDeleteTag,
        handleRestoreDefaults,
        handleDragEnd,
    } = usePremiumTagManager();

    const categoryValue = tags.find(t => t.id === selectedTag)?.value || '';

    const {
        videos,
        loading,
        hasMore,
        prefetchRef,
        loadMoreRef,
    } = usePremiumContent(categoryValue);

    const handleVideoClick = (video: Video) => {
        if (onSearch) {
            onSearch(video.vod_name);
        }
    };

    const handleRegularTagSelect = (tagId: string) => {
        setSelectedTag(tagId);
    };

    return (
        <div className="animate-fade-in">
            <TagManager
                tags={tags}
                selectedTag={selectedTag}
                showTagManager={showTagManager}
                newTagInput={newTagInput}
                justAddedTag={justAddedTag}
                onTagSelect={handleRegularTagSelect}
                onTagDelete={handleDeleteTag}
                onToggleManager={() => setShowTagManager(!showTagManager)}
                onRestoreDefaults={handleRestoreDefaults}
                onNewTagInputChange={setNewTagInput}
                onAddTag={handleAddTag}
                onDragEnd={handleDragEnd}
                onJustAddedTagHandled={() => setJustAddedTag(false)}
            />

            <PremiumContentGrid
                videos={videos}
                loading={loading}
                hasMore={hasMore}
                onVideoClick={handleVideoClick}
                prefetchRef={prefetchRef}
                loadMoreRef={loadMoreRef}
            />
        </div>
    );
}
