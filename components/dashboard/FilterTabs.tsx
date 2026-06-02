'use client';

interface FilterTab {
  label: string;
  count?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

interface FilterTabsProps {
  tabs: FilterTab[];
  active: string;
  onChange: (label: string) => void;
}

const dotStyles: Record<NonNullable<FilterTab['variant']>, string> = {
  default: 'bg-nx-muted',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger:  'bg-rose-400',
};

export function FilterTabs({ tabs, active, onChange }: FilterTabsProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl glass-pill">
      {tabs.map((tab) => {
        const isActive = active === tab.label;
        const variant = tab.variant ?? 'default';
        return (
          <button
            key={tab.label}
            onClick={() => onChange(tab.label)}
            className={`relative inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-white/[0.06] text-nx-text-bright'
                : 'text-nx-muted hover:text-nx-text'
            }`}
          >
            {variant !== 'default' && (
              <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]} ${isActive ? 'shadow-[0_0_6px_currentColor]' : 'opacity-70'}`} />
            )}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-[10px] font-mono ${isActive ? 'text-nx-text' : 'text-nx-muted'}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
