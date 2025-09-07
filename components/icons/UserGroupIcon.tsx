import React from 'react';

export const UserGroupIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962c.57-1.023-.09-2.317-1.162-2.317h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h1.5c1.072 0 1.732-1.294 1.162-2.317M12.75 18a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM12 15.75a3 3 0 00-3 3h6a3 3 0 00-3-3z" 
    />
  </svg>
);