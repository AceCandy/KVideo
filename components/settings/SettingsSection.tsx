interface SettingsSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    headerAction?: React.ReactNode;
}

export function SettingsSection({
    title,
    description,
    children,
    headerAction,
}: SettingsSectionProps) {
    return (
        <div className="bg-[var(--glass-bg)] backdrop-filter backdrop-blur-[18px] saturate-[140%] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6 mb-6 transition-[border-color,box-shadow] duration-200 ease-out hover:border-[color-mix(in_srgb,var(--accent-color)_22%,var(--glass-border))] hover:shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--text-color)]">{title}</h2>
                {headerAction && <div className="flex gap-2 flex-wrap">{headerAction}</div>}
            </div>
            {description && (
                <p className="text-sm text-[var(--text-color-secondary)] mb-6 leading-[1.6]">
                    {description}
                </p>
            )}
            {children}
        </div>
    );
}
