import React from 'react';

export const GiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        d="M21 11.25v8.25a2.25 2.25 0 01-2.25 2.25H5.25a2.25 2.25 0 01-2.25-2.25v-8.25M12 15v6M3 11.25h18M12 11.25a2.25 2.25 0 00-2.25-2.25c-1.356 0-2.093.232-2.232.324a.75.75 0 00-.5.862 2.25 2.25 0 01-4.134 1.072c-.115-.421-.343-1.003-.343-1.616a2.25 2.25 0 012.25-2.25c1.125 0 2.136.636 2.62 1.543.483-.907 1.495-1.543 2.62-1.543a2.25 2.25 0 012.25 2.25c0 .613-.228 1.195-.343 1.616a2.25 2.25 0 01-4.134-1.072.75.75 0 00-.5-.862c-.139-.092-.876-.324-2.232-.324A2.25 2.25 0 0012 11.25z" 
    />
  </svg>
);