import React from 'react';

export const InstagramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    aria-label="Instagram"
    fill="currentColor"
    role="img" 
    viewBox="0 0 24 24"
    {...props}
  >
    <rect 
        width="20" 
        height="20" 
        x="2" 
        y="2" 
        fill="none" 
        stroke="currentColor" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth="2" 
        rx="5.4"
    />
    <path 
        d="M16.9 7.1a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0z"
    />
    <circle 
        cx="12" 
        cy="12" 
        r="4.1" 
        fill="none" 
        stroke="currentColor" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth="2"
    />
  </svg>
);