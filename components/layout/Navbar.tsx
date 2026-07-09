'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSiteIcon } from '@/components/SiteIconProvider';
import { Icons } from '@/components/ui/Icon';
import { siteConfig } from '@/lib/config/site-config';
import { hasPermission } from '@/lib/store/auth-store';
import { useRuntimeFeatures } from '@/components/RuntimeFeaturesProvider';
import { UserMenu } from '@/components/layout/UserMenu';

interface NavbarProps {
    onReset: () => void;
    isPremiumMode?: boolean;
}

export function Navbar({ onReset, isPremiumMode = false }: NavbarProps) {
    const { iptvEnabled } = useRuntimeFeatures();
    const siteIconSrc = useSiteIcon();

    return (
        <nav className="sticky top-0 z-[2000] pt-4 pb-2" style={{
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform'
        }}>
            <div className="max-w-7xl mx-auto px-4">
                <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-[var(--shadow-sm)] px-3 sm:px-6 py-2 sm:py-4 rounded-[var(--radius-2xl)]" style={{
                    transform: 'translate3d(0, 0, 0)'
                }}>
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <Link
                            href={isPremiumMode ? '/premium' : '/'}
                            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer min-w-0"
                            onClick={onReset}
                            data-focusable
                        >
                            <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center flex-shrink-0">
                                <Image
                                    src={siteIconSrc}
                                    alt={siteConfig.name}
                                    width={40}
                                    height={40}
                                    unoptimized
                                    className="object-contain"
                                />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-color)] truncate">{siteConfig.name}</h1>
                                <p className="text-xs text-[var(--text-color-secondary)] hidden sm:block truncate">{siteConfig.description}</p>
                            </div>
                        </Link>

                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            {/* IPTV Link - only show if user has iptv_access or no auth configured */}
                            {iptvEnabled && hasPermission('iptv_access') && (
                            <Link
                                href="/iptv"
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
                                aria-label="直播"
                                title="直播"
                                data-focusable
                            >
                                <Icons.TV size={16} className="sm:w-5 sm:h-5" />
                            </Link>
                            )}

                            <UserMenu />
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
