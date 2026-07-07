import { SourceSettingsPanel } from '@/components/settings/SourceSettingsPanel';
import type { VideoSource } from '@/lib/types';
import { PREMIUM_SOURCES } from '@/lib/api/premium-sources';

interface PremiumSourceSettingsProps {
    sources: VideoSource[];
    onSourcesChange: (sources: VideoSource[]) => void;
    onAddSource: () => void;
    onEditSource?: (source: VideoSource) => void;
}

export function PremiumSourceSettings({
    sources,
    onSourcesChange,
    onAddSource,
    onEditSource,
}: PremiumSourceSettingsProps) {
    return (
        <SourceSettingsPanel
            title="高级源管理"
            description="管理高级内容来源，调整优先级和启用状态"
            sources={sources}
            defaultIds={PREMIUM_SOURCES.map(s => s.id)}
            onSourcesChange={onSourcesChange}
            onAddSource={onAddSource}
            onEditSource={onEditSource}
        />
    );
}
