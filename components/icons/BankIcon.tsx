import React from 'react';

export const BankIcon = (props) => {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="feather feather-bank"
    >
      <rect x="3" y="6" width="18" height="13" rx="2" ry="2"></rect>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="12" y1="6" x2="12" y2="19"></line>
      <line x1="7" y1="6" x2="7" y2="19"></line>
      <line x1="17" y1="6" x2="17" y2="19"></line>
    </svg>
  );
};