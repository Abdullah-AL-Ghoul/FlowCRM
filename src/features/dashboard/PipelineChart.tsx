import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { StageSummary } from '../../types/crm.types';
import { useI18n } from '../../i18n/I18nContext';
import { formatCurrency } from '../../lib/utils';

export interface PipelineChartProps {
  data: StageSummary[];
}

export const PipelineChart: React.FC<PipelineChartProps> = ({ data }) => {
  const { t, locale } = useI18n();

  const stageColors: Record<string, string> = {
    new: '#94A3B8',
    qualified: '#38BDF8',
    proposal: '#818CF8',
    negotiation: '#C9A961',
    won: '#10B981',
    lost: '#F43F5E',
  };

  const chartData = data.map(item => ({
    stage: item.stage,
    name: t(`deals.stages.${item.stage}`),
    count: item.count,
    totalValue: item.totalValue,
    color: stageColors[item.stage] || '#64748B',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700">
          <p className="font-bold text-brand-goldPale mb-1">{d.name}</p>
          <p className="text-slate-300">
            Deals: <span className="font-semibold text-white">{d.count}</span>
          </p>
          <p className="text-slate-300">
            Value: <span className="font-semibold text-white">{formatCurrency(d.totalValue, 'USD', locale)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748B' }}
            interval={0}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748B' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
            tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
          <Bar dataKey="totalValue" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
