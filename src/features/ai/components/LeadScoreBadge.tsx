import React from 'react';
import { LeadScoreBreakdown } from '../types/ai.types';
import { Flame, Thermometer, Snowflake } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface LeadScoreBadgeProps {
  score: LeadScoreBreakdown;
  showDetails?: boolean;
}

export const LeadScoreBadge: React.FC<LeadScoreBadgeProps> = ({ score, showDetails = false }) => {
  const getTierConfig = () => {
    switch (score.tier) {
      case 'hot':
        return {
          icon: Flame,
          label: 'Hot Lead',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dotClass: 'bg-emerald-500',
        };
      case 'warm':
        return {
          icon: Thermometer,
          label: 'Warm Lead',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
          dotClass: 'bg-amber-500',
        };
      case 'cold':
      default:
        return {
          icon: Snowflake,
          label: 'Cold Lead',
          badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
          dotClass: 'bg-slate-400',
        };
    }
  };

  const config = getTierConfig();
  const Icon = config.icon;

  return (
    <div className="inline-flex flex-col">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs',
          config.badgeClass
        )}
        title={`Score: ${score.totalScore}/100 based on verified CRM signals`}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span>{score.totalScore}/100</span>
        <span className="text-[10px] font-medium opacity-80">({config.label})</span>
      </span>

      {showDetails && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-2 shadow-2xs">
          <div className="flex items-center justify-between font-bold text-slate-800 border-b pb-1">
            <span>Rule-Based Score Factors</span>
            <span className="text-[10px] text-slate-400 font-normal">Deterministic</span>
          </div>
          <div className="space-y-1.5">
            {score.factors.map((f, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-[11px]">
                <div>
                  <p className="font-semibold text-slate-700">{f.factor}</p>
                  <p className="text-[10px] text-slate-400">{f.reason}</p>
                </div>
                <span className="font-bold text-slate-900 shrink-0">
                  {f.points}/{f.maxPoints}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
