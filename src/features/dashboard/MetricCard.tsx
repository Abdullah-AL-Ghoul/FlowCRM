import React from 'react';
import { Card, CardContent } from '../../components/common/Card';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlight = false,
}) => {
  return (
    <Card hover className={cn(highlight && 'border-brand-gold/50 shadow-sm bg-gradient-to-b from-white to-amber-50/20')}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
              highlight
                ? 'bg-brand-gold/15 text-brand-gold border-brand-gold/30'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
          {trend && (
            <span
              className={cn(
                'text-xs font-semibold px-1.5 py-0.5 rounded',
                trend.positive
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-rose-700 bg-rose-50'
              )}
            >
              {trend.value}
            </span>
          )}
        </div>

        {subtitle && <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};
