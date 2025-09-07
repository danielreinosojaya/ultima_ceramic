import React from 'react';

export const ChatBubbleLeftRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}>
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72.372a3.75 3.75 0 01-3.696-3.693l.372-3.72c.093-1.133.957-1.98 2.193-1.98H16.5c.969 0 1.813.616 2.097 1.5M15.75 15.75l-3.75-3.75M8.25 8.25l3.75 3.75M3 16.5v-4.286c0-1.136.847-2.1 1.98-2.193l3.72-.372a3.75 3.75 0 013.696 3.693l-.372 3.72c-.093 1.133-.957 1.98-2.193 1.98H5.25c-.969 0-1.813-.616-2.097-1.5M15 9.75l-4.5 4.5M9 15.75l4.5-4.5" 
    />
  </svg>
);