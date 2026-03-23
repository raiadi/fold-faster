import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OnboardingProvider } from './context/OnboardingContext';
import Welcome from './pages/onboarding/Welcome';
import Experience from './pages/onboarding/Experience';
import Goal from './pages/onboarding/Goal';
import Signup from './pages/onboarding/Signup';
import SkillCheck from './pages/SkillCheck';
import SkillCheckResults from './pages/SkillCheckResults';
import ModuleDrill from './pages/ModuleDrill';
import ModuleDrillResults from './pages/ModuleDrillResults';
import Login from './pages/Login';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <OnboardingProvider>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/onboarding/experience" element={<Experience />} />
          <Route path="/onboarding/goal" element={<Goal />} />
          <Route path="/onboarding/signup" element={<Signup />} />
          <Route path="/skill-check" element={<SkillCheck />} />
          <Route path="/skill-check/results" element={<SkillCheckResults />} />
          <Route path="/module/:moduleId" element={<ModuleDrill />} />
          <Route path="/module/:moduleId/results" element={<ModuleDrillResults />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </OnboardingProvider>
    </BrowserRouter>
  );
}

export default App;
