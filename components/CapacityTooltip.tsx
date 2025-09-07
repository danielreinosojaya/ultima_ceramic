import React from 'react';
import ReactDOM from 'react-dom';

interface CapacityTooltipProps {
  message: string;
  position: { top: number; left: number; width: number; height: number } | null;
}

export const CapacityTooltip: React.FC<CapacityTooltipProps> = ({ message, position }) => {
  if (!position) {
    return null;
  }

  // Style to position the tooltip perfectly above the center of the indicator
  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${position.top}px`,
    left: `${position.left + position.width / 2}px`,
    transform: 'translate(-50%, -100%) translateY(-8px)', // Center horizontally, move up, add 8px margin
    pointerEvents: 'none', // Prevent the tooltip from blocking mouse events on elements below it
  };

  const tooltipJsx = (
    <div
      style={style}
      className="w-max max-w-xs z-50 p-2 text-xs text-white bg-brand-text rounded-md shadow-lg animate-fade-in-fast"
      role="tooltip"
    >
      {message}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-brand-text"></div>
    </div>
  );

  return ReactDOM.createPortal(tooltipJsx, document.body);
};
