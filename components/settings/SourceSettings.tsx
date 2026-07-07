import { SourceSettingsPanel } from '@/components/settings/SourceSettingsPanel';
import type { VideoSource } from '@/lib/types';
import { DEFAULT_SOURCES } from '@/lib/api/default-sources';

interface SourceSettingsProps {
    sources: VideoSource[];
    onSourcesChange: (sources: VideoSource[]) => void;
    onAddSource: () => void;
    onEditSource?: (source: VideoSource) => void;
}

export function SourceSettings({
    sources,
    onSourcesChange,
    onAddSource,
    onEditSource,
}: SourceSettingsProps) {
    return (
        <SourceSettingsPanel
            title="视频源管理"
            description="管理视频来源，调整优先级和启用状态"
            sources={sources}
            defaultIds={DEFAULT_SOURCES.map(s => s.id)}
            onSourcesChange={onSourcesChange}
            onAddSource={onAddSource}
            onEditSource={onEditSource}
        />
    );
}
