import type { ComponentType, SVGProps } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  note: string;
  accentColor: string;
}

export function StatCard({ title, value, icon: Icon, note, accentColor }: StatCardProps) {
  return (
    <div className="rounded-[32px] border border-white/10 bg-card p-6 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-textSecondary">{title}</p>
          <p className="mt-4 text-4xl font-semibold text-white">{value}</p>
        </div>
        <div className="rounded-3xl p-3" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-5 text-sm text-textSecondary">{note}</p>
    </div>
  );
}
