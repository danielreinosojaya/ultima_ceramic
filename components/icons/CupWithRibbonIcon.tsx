import React from "react";

export const CupWithRibbonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Taza */}
    <ellipse cx="24" cy="34" rx="10" ry="5" fill="#fff" stroke="#A3A3A3" />
    <rect x="14" y="18" width="20" height="16" rx="8" fill="#fff" stroke="#A3A3A3" />
    {/* Asa */}
    <path d="M34 26 Q38 28 34 34" stroke="#A3A3A3" fill="none" />
    {/* Lazito */}
    <path d="M24 18 Q22 14 20 18 Q22 16 24 18 Q26 16 28 18 Q26 14 24 18" stroke="#A3A3A3" fill="#fff" />
    <circle cx="24" cy="18" r="1.5" fill="#A3A3A3" />
  </svg>
);
