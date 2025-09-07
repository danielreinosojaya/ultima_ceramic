import React from 'react';

export const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 19.05a2.25 2.25 0 01-1.13.622l-2.775.832 2.775.832a2.25 2.25 0 011.13.622l8.47-8.47-1.687-1.688a1.875 1.875 0 010-2.652z" 
        />
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M19.5 14.25l-2.647 2.647" 
        />
    </svg>
);
