import { AppProvider, useAppContext } from './context/AppContext';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import MoneyStory from './pages/MoneyStory';
import './index.css';
import { useState } from 'react';

const MainApp = () => {
  const { data, isAuthenticated } = useAppContext();
  const [view, setView] = useState<'dashboard' | 'story'>('dashboard');

  if (!isAuthenticated) return <Login />;
  if (!data.isOnboarded) return <Onboarding />;

  return (
    <>
      {view === 'dashboard' ? (
        <Dashboard onOpenStory={() => setView('story')} />
      ) : (
        <MoneyStory />
      )}

      {/* Floating Navigation Pill */}
      <div className="nav-pill">
        <button
          className={`nav-pill-btn ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-pill-btn ${view === 'story' ? 'active' : ''}`}
          onClick={() => setView('story')}
        >
          ✨ My Plan
        </button>
      </div>
    </>
  );
};

function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;
