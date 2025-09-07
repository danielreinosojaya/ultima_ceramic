import React from 'react';

export const Logo: React.FC = () => (
  <a href="/" aria-label="CeramicAlma Homepage">
    <svg width="40" height="40" viewBox="0 0 100 100">
      {/* Subtle background guide circle, using the original outer oval shape */}
      <path
        d="M50,10 C75,10 90,30 90,50 C90,70 75,90 50,90 C25,90 10,70 10,50 C10,30 25,10 50,10 Z"
        fill="none"
        className="stroke-brand-border"
        strokeWidth="1"
      />
      {/* Main deconstructed arc (top half of the original outer oval) */}
      <path
        d="M10,50 C10,30 25,10 50,10 C75,10 90,30 90,50"
        fill="none"
        className="stroke-brand-text"
        strokeWidth="4"
      />
      {/* Small accent guide arc */}
      <path
        d="M50,90 C35,90 25,80 20,65"
        fill="none"
        className="stroke-brand-border"
        strokeWidth="1"
      />
      {/* Inner filled oval */}
      <path
        d="M50,30 C58,30 65,40 65,50 C65,60 58,70 50,70 C42,70 35,60 35,50 C35,40 42,30 50,30 Z"
        className="fill-brand-accent"
      />
    </svg>
  </a>
);