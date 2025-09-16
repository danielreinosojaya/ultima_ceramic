import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface WelcomeSelectorProps {
  onSelect: (userType: 'new' | 'returning' | 'group_experience' | 'couples_experience' | 'team_building') => void;
}

const ChoiceCard: React.FC<{
    title: string;
    subtitle: string;
    buttonText: string;
    onClick: () => void;
}> = ({ title, subtitle, buttonText, onClick }) => (
    <div className="bg-brand-surface p-8 rounded-xl shadow-subtle hover:shadow-lifted transition-shadow duration-300 flex flex-col items-center text-center h-full">
        <h3 className="text-2xl font-semibold text-brand-text">{title}</h3>
        <p className="text-brand-secondary mt-2 flex-grow mb-6">{subtitle}</p>
        <button
            onClick={onClick}
            className="bg-brand-primary text-white font-bold py-3 px-8 rounded-lg w-full max-w-xs hover:opacity-90 transition-opacity duration-300"
        >
            {buttonText}
        </button>
    </div>
);

const ExperienceCard: React.FC<{
    title: string;
    subtitle: string;
    buttonText: string;
    onClick: () => void;
}> = ({ title, subtitle, buttonText, onClick }) => (
     <div 
        className="bg-brand-surface p-8 rounded-xl shadow-subtle hover:shadow-lifted transition-shadow duration-300 flex flex-col md:flex-row items-center text-center md:text-left gap-6 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex-grow">
            <h3 className="text-2xl font-semibold text-brand-text">{title}</h3>
            <p className="text-brand-secondary mt-2">{subtitle}</p>
        </div>
        <button className="bg-brand-accent text-white font-bold py-3 px-8 rounded-lg w-full md:w-auto hover:opacity-90 transition-opacity duration-300 flex-shrink-0">
            {buttonText}
        </button>
      </div>
);


export const WelcomeSelector: React.FC<WelcomeSelectorProps> = ({ onSelect }) => {
  const { t } = useLanguage();

  return (
    <div className="text-center p-6 bg-transparent animate-fade-in-up max-w-4xl mx-auto">
      <h2 className="text-3xl font-semibold text-brand-text mb-2">{t('welcome.title')}</h2>
      <p className="text-brand-secondary mb-10">{t('welcome.subtitle')}</p>
      <div className="grid md:grid-cols-2 gap-8">
        <ChoiceCard
            title={t('welcome.newUserTitle')}
            subtitle={t('welcome.newUserSubtitle')}
            buttonText={t('welcome.newUserButton')}
            onClick={() => onSelect('new')}
        />
        <ChoiceCard
            title={t('welcome.returningUserTitle')}
            subtitle={t('welcome.returningUserSubtitle')}
            buttonText={t('welcome.returningUserButton')}
            onClick={() => onSelect('returning')}
        />
      </div>
      <div className="mt-8 space-y-8">
          <ExperienceCard 
            title={t('welcome.couplesExperienceTitle')}
            subtitle={t('welcome.couplesExperienceSubtitle')}
            buttonText={t('welcome.couplesExperienceButton')}
            onClick={() => onSelect('couples_experience')}
          />
          <ExperienceCard 
            title={t('welcome.groupExperienceTitle')}
            subtitle={t('welcome.groupExperienceSubtitle')}
            buttonText={t('welcome.groupExperienceButton')}
            onClick={() => onSelect('group_experience')}
          />
          <ExperienceCard 
            title={t('welcome.teamBuildingExperienceTitle')}
            subtitle={t('welcome.teamBuildingExperienceSubtitle')}
            buttonText={t('welcome.teamBuildingExperienceButton')}
            onClick={() => onSelect('team_building')}
          />
      </div>
    </div>
  );
};