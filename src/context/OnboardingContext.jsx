import { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [experience, setExperience] = useState(null);
  const [goal, setGoal] = useState(null);

  return (
    <OnboardingContext.Provider value={{ experience, setExperience, goal, setGoal }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
