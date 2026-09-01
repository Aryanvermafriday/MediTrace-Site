import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
  className?: string;
  variant?: 'light' | 'dark' | 'transparent' | 'header';
  size?: 'default' | 'large' | 'compact';
}

/**
 * Standardized, accessible global in-app back button for MediTrace.
 * Complies with min 44x44px touch target for elderly and rural users,
 * accessible ARIA labels, and consistent top-left navigation placement.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label,
  ariaLabel = 'Go back',
  className = '',
  variant = 'light',
  size = 'default',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'dark':
        return 'bg-slate-800/90 text-white hover:bg-slate-700 active:bg-slate-600 border border-slate-700/80 shadow-xs';
      case 'header':
        return 'bg-white/15 text-white hover:bg-white/25 active:bg-white/30 border border-white/20 shadow-xs backdrop-blur-xs';
      case 'transparent':
        return 'bg-transparent text-slate-700 hover:bg-slate-100/80 active:bg-slate-200';
      case 'light':
      default:
        return 'bg-white text-slate-700 hover:bg-slate-50 hover:text-teal-900 active:bg-slate-100 border border-slate-200 shadow-xs';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'compact':
        return 'min-w-[44px] min-h-[44px] px-2.5 py-2 text-xs';
      case 'large':
        return 'min-w-[48px] min-h-[48px] px-4 py-2.5 text-sm font-extrabold';
      case 'default':
      default:
        return 'min-w-[44px] min-h-[44px] px-3 py-2 text-xs font-bold';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${getVariantStyles()} ${getSizeStyles()} ${className}`}
    >
      <ArrowLeft className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
      {label && <span className="back-button-label whitespace-nowrap">{label}</span>}
    </button>
  );
};
