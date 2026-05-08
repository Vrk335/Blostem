import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { LogIn, UserPlus } from 'lucide-react';
import { api } from '../services/api';

const Login: React.FC = () => {
  const { login } = useAppContext();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const data = await api.post('/auth/signup', { name, email, password });
        localStorage.setItem('blostem_token', data.token);
        login();
      } else {
        const data = await api.post('/auth/login', { email, password });
        localStorage.setItem('blostem_token', data.token);
        login();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div className="card-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="text-gradient" style={{ fontSize: '2rem' }}>Blostem</h2>
          <p style={{ color: 'var(--text-muted)' }}>{isSignUp ? 'Create your financial planner account' : 'Sign in to your financial planner'}</p>
        </div>

        {error && <div style={{ color: 'var(--accent-danger)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Name</label>
              <input 
                type="text" 
                className="flat-input" 
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
              />
            </div>
          )}
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email</label>
            <input 
              type="email" 
              className="flat-input" 
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Password</label>
            <input 
              type="password" 
              className="flat-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {isSignUp ? 'Sign Up' : 'Sign In'} {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
          </button>
        </form>
        
        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"} {' '}
          <span 
            style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
