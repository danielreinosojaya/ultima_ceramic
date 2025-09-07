import React from 'react';

export const UKFlagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" {...props}>
    <clipPath id="a">
      <path d="M0 0h60v30H0z"/>
    </clipPath>
    <path d="M0 0h60v30H0z" fill="#00247d"/>
    <g clipPath="url(#a)">
      <path d="M0 0l60 30m-60 0L60 0" stroke="#fff" strokeWidth="6"/>
      <path d="M0 0l60 30m-60 0L60 0" stroke="#cf142b" strokeWidth="4"/>
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30 0v30M0 15h60" stroke="#cf142b" strokeWidth="6"/>
    </g>
  </svg>
);