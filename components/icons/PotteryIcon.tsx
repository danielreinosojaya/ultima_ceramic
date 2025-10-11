import React from "react";

export const PotteryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    {/* Base del torno */}
    <ellipse cx="24" cy="40" rx="14" ry="4" fill="#fff" stroke="#A3A3A3" />
    {/* Cuerpo de la vasija */}
    <path d="M16 40 Q18 28 24 28 Q30 28 32 40" fill="#fff" stroke="#A3A3A3" />
    {/* Boca de la vasija */}
    <ellipse cx="24" cy="28" rx="6" ry="2.5" fill="#fff" stroke="#A3A3A3" />
    {/* Detalle de arcilla */}
    <path d="M22 32 Q24 34 26 32" stroke="#A3A3A3" />
  </svg>
);
