import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GroundedEvidence } from '../types/ai.types';
import { Users, Kanban, CheckSquare, Clock, BarChart3, ExternalLink } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface EvidenceCitationProps {
  evidence: GroundedEvidence;
  className?: string;
  onNavigate?: () => void;
}

export const EvidenceCitation: React.FC<EvidenceCitationProps> = ({
  evidence,
  className,
  onNavigate,
}) => {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (evidence.type) {
      case 'contact':
        return <Users className="w-3 h-3 text-sky-600" />;
      case 'deal':
        return <Kanban className="w-3 h-3 text-amber-600" />;
      case 'task':
        return <CheckSquare className="w-3 h-3 text-emerald-600" />;
      case 'activity':
        return <Clock className="w-3 h-3 text-purple-600" />;
      case 'metric':
        return <BarChart3 className="w-3 h-3 text-brand-gold" />;
      default:
        return <ExternalLink className="w-3 h-3 text-slate-500" />;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate();
    }
    navigate(evidence.route);
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium',
        'bg-white border border-slate-200/90 shadow-2xs hover:border-brand-gold/60 hover:bg-amber-50/30',
        'text-slate-800 transition-all text-start group cursor-pointer',
        className
      )}
      title={`Open ${evidence.title} in CRM`}
    >
      <span className="shrink-0">{getIcon()}</span>
      <span className="font-semibold text-slate-900 group-hover:text-brand-goldHover transition-colors truncate max-w-[140px]">
        {evidence.title}
      </span>
      {evidence.subtitle && (
        <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
          ({evidence.subtitle})
        </span>
      )}
      <ExternalLink className="w-2.5 h-2.5 text-slate-300 group-hover:text-slate-500 ms-0.5" />
    </button>
  );
};
