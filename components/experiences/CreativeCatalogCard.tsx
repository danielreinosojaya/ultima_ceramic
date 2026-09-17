import React from 'react';
import type { CreativeDisplay } from '../../config/creativeExperiences';

interface CreativeCatalogCardProps {
  display: CreativeDisplay;
  priceLabel?: string;
  selected?: boolean;
  onClick: () => void;
}

export const CreativeCatalogCard: React.FC<CreativeCatalogCardProps> = ({
  display,
  priceLabel,
  selected = false,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full overflow-hidden rounded-2xl border-2 bg-brand-surface text-left shadow-subtle transition-all hover:shadow-lifted ${
      selected ? 'border-brand-primary' : 'border-gray-200 hover:border-brand-primary/40'
    }`}
  >
    <div className="relative h-48 sm:h-56 overflow-hidden bg-brand-background">
      <img
        src={display.imageUrl}
        alt={display.label}
        className="h-full w-full object-cover object-bottom"
      />
    </div>
    <div className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-lg sm:text-xl font-semibold text-brand-text leading-snug">
          {display.label}
        </h4>
        {priceLabel && (
          <span className="shrink-0 text-sm font-semibold text-brand-primary text-right">
            {priceLabel}
          </span>
        )}
      </div>
      {display.description && (
        <p className="mt-2 text-sm text-brand-secondary leading-relaxed">
          {display.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex rounded-full bg-brand-background px-3 py-1 text-xs font-medium text-brand-text">
          {display.duration}
        </span>
        <span className="inline-flex rounded-full bg-brand-background px-3 py-1 text-xs font-medium text-brand-text">
          {display.schedule}
        </span>
      </div>
      {display.includes && (
        <p className="mt-3 text-xs text-brand-secondary leading-relaxed">
          <span className="font-semibold text-brand-text">Incluye: </span>
          {display.includes}
        </p>
      )}
      {display.recommendation && (
        <p className="mt-1.5 text-xs text-brand-secondary">{display.recommendation}</p>
      )}
      {display.important && (
        <p className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {display.important}
        </p>
      )}
      {display.extrasNote && (
        <p className="mt-1.5 text-xs text-brand-secondary">{display.extrasNote}</p>
      )}
    </div>
  </button>
);
