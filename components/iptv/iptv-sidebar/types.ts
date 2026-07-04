import type { M3UChannel } from '@/lib/utils/m3u-parser';
import type { IPTVSource } from '@/lib/store/iptv-store';

/**
 * Props contract for the IPTV sidebar.
 *
 * The sidebar is mounted by the player shell only while visible, so it owns no
 * visibility flag — it manages search, expansion, and scroll state internally
 * and reports channel selection and close requests back to the shell.
 */
export interface ChannelSidebarProps {
  channel: M3UChannel;
  channels: M3UChannel[];
  channelsBySource?: Record<string, { channels: M3UChannel[]; groups: string[] }>;
  sources?: IPTVSource[];
  onChannelChange: (channel: M3UChannel) => void;
  onClose: () => void;
}
