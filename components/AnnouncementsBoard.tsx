import React from 'react';
import type { Announcement } from '../types';
import { InfoCircleIcon } from './icons/InfoCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

const URGENCY_STYLES = {
  info: {
    bg: 'bg-blue-100',
    border: 'border-blue-500',
    iconColor: 'text-blue-500',
    Icon: InfoCircleIcon,
  },
  warning: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-500',
    iconColor: 'text-yellow-500',
    Icon: ExclamationTriangleIcon,
  },
  urgent: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    iconColor: 'text-red-500',
    Icon: ExclamationTriangleIcon,
  },
};

interface AnnouncementsBoardProps {
  announcements: Announcement[];
}

export const AnnouncementsBoard: React.FC<AnnouncementsBoardProps> = ({ announcements }) => {
  if (!announcements || announcements.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {announcements.map((ann) => {
          const styles = URGENCY_STYLES[ann.urgency];
          const { Icon } = styles;
          return (
            <div
              key={ann.id}
              className={`border-l-4 p-4 rounded-r-lg ${styles.bg} ${styles.border} animate-fade-in`}
              role="alert"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <Icon className={`h-5 w-5 ${styles.iconColor}`} aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-bold text-brand-text">{ann.title}</p>
                  <p className="mt-1 text-sm text-brand-secondary">{ann.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};