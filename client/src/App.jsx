import { useEffect, useState } from 'react';
import SiteHeader from './components/SiteHeader.jsx';
import HeroSection from './components/HeroSection.jsx';
import WorkspaceSection from './components/WorkspaceSection.jsx';
import AssistantSection from './components/AssistantSection.jsx';
import IdeasSection from './components/IdeasSection.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import Dashboard from './components/Dashboard.jsx';
import AuthPage from './components/AuthPage.jsx';

function getScreenFromLocation() {
  if (window.location.pathname === '/dashboard') return 'dashboard';
  if (window.location.pathname === '/preview') return 'preview';
  if (window.location.pathname === '/reset-password') return 'reset';
  if (window.location.pathname === '/signin' || window.location.pathname === '/signup') return 'auth';
  return 'home';
}

function getStoredSession() {
  try {
    const stored = JSON.parse(localStorage.getItem('lifeofhub-session'));
    if (stored?.token && stored?.user) return { ...stored, remember: true };
    const tabSession = JSON.parse(sessionStorage.getItem('lifeofhub-session'));
    if (tabSession?.token && tabSession?.user) return { ...tabSession, remember: false };
    const previewUser = JSON.parse(localStorage.getItem('lifeofhub-user'));
    return previewUser ? { user: previewUser, preview: true } : null;
  } catch (error) {
    console.error('Unable to restore the saved sign-in session:', error);
    return null;
  }
}

function clearStoredSession() {
  localStorage.removeItem('lifeofhub-session');
  sessionStorage.removeItem('lifeofhub-session');
  localStorage.removeItem('lifeofhub-user');
}

function routeForScreen(screen) {
  if (screen === 'dashboard') return '/dashboard';
  if (screen === 'preview') return '/preview';
  if (screen === 'auth') return '/signin';
  if (screen === 'reset') return '/reset-password';
  return '/';
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState(getScreenFromLocation);
  const [initialSession] = useState(getStoredSession);
  const [session, setSession] = useState(initialSession);
  const [sessionReady, setSessionReady] = useState(() => !initialSession?.token);
  const [sessionError, setSessionError] = useState('');
  const user = session?.user ?? null;

  const navigate = (nextScreen, replace = false) => {
    const path = routeForScreen(nextScreen);
    if (window.location.pathname !== path) {
      if (replace) window.history.replaceState(null, '', path);
      else window.history.pushState(null, '', path);
    }
    setScreen(nextScreen);
  };

  useEffect(() => {
    if (!initialSession?.token) {
      setSessionReady(true);
      return undefined;
    }

    let active = true;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${initialSession.token}` } })
      .then(async (response) => {
        if (response.status === 401) return { unauthorized: true };
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Your session has expired. Please sign in again.');
        return { user: result.user };
      })
      .then(({ user: verifiedUser, unauthorized }) => {
        if (!active) return;
        if (unauthorized) {
          clearStoredSession();
          setSession(null);
          setSessionReady(true);
          if (window.location.pathname === '/dashboard') navigate('auth', true);
          return;
        }
        setSession((current) => current?.token === initialSession.token
          ? { ...current, user: verifiedUser }
          : current);
        setSessionError('');
        setSessionReady(true);
      })
      .catch((error) => {
        if (!active) return;
        console.error('Unable to verify the saved sign-in session:', error);
        setSessionError(error instanceof Error ? error.message : 'Unable to verify your sign-in session.');
        setSessionReady(true);
      });

    return () => { active = false; };
  }, [initialSession]);

  useEffect(() => {
    const handlePopState = () => setScreen(getScreenFromLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (screen === 'dashboard' && !session?.token) navigate('auth', true);
    if (screen === 'preview' && !session?.preview) navigate('home', true);
  }, [screen, session, sessionReady]);

  const enterWorkspace = (nextSession) => {
    clearStoredSession();
    if (nextSession.preview) {
      localStorage.setItem('lifeofhub-user', JSON.stringify(nextSession.user));
    } else if (nextSession.remember) {
      localStorage.setItem('lifeofhub-session', JSON.stringify(nextSession));
    } else {
      sessionStorage.setItem('lifeofhub-session', JSON.stringify(nextSession));
    }
    setSession(nextSession);
    navigate(nextSession.preview ? 'preview' : 'dashboard');
  };

  const signOut = async () => {
    if (session?.token) {
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (!response.ok && response.status !== 401) {
          throw new Error('The server could not invalidate this session.');
        }
      } catch (error) {
        console.error('Unable to invalidate the server session:', error);
      }
    }
    clearStoredSession();
    setSession(null);
    navigate('home');
  };

  if ((!sessionReady || sessionError) && screen === 'dashboard') {
    return (
      <main className="auth-loading" aria-live="polite">
        {sessionError
          ? <div><p>Unable to verify your sign-in session. {sessionError}</p><button onClick={() => window.location.reload()} type="button">Try again</button></div>
          : 'Checking your sign-in session…'}
      </main>
    );
  }

  if (screen === 'dashboard' && session?.token) {
    return <Dashboard token={session.token} user={user} onSignOut={signOut} />;
  }

  if (screen === 'preview' && session?.preview) {
    return <Dashboard user={user} onSignOut={signOut} />;
  }

  if (screen === 'auth' || screen === 'reset') {
    return (
      <AuthPage
        initialMode={screen === 'reset' ? 'reset' : window.location.pathname === '/signup' ? 'signup' : 'signin'}
        resetToken={new URLSearchParams(window.location.search).get('token') || ''}
        onBack={() => navigate('home')}
        onContinue={enterWorkspace}
        onNavigate={navigate}
      />
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader
        menuOpen={menuOpen}
        onMenuClose={() => setMenuOpen(false)}
        onMenuToggle={() => setMenuOpen((open) => !open)}
        onGetStarted={() => navigate('auth')}
      />
      <main id="main-content">
        <HeroSection onGetStarted={() => navigate('auth')} />
        <WorkspaceSection />
        <AssistantSection />
        <IdeasSection onGetStarted={() => navigate('auth')} />
      </main>
      <SiteFooter />
    </>
  );
}
