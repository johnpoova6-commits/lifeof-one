import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react';
import GoogleSignIn from './GoogleSignIn.jsx';
import './AuthPage.css';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function postAuthRequest(endpoint, payload) {
  const response = await fetch(`/api/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('The workspace API returned an unexpected response. Check that the MERN server is running.');
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to complete your request. Please try again.');
  return result;
}

export default function AuthPage({ initialMode, resetToken, onBack, onContinue, onNavigate }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submissionInProgress = useRef(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
  const isSignUp = mode === 'signup';
  const isReset = mode === 'reset';
  const isForgot = mode === 'forgot';

  const beginRequest = async (request) => {
    if (submissionInProgress.current) return;
    submissionInProgress.current = true;
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await request();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to connect to the workspace API.');
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  };

  const handleCredential = (endpoint, payload) => beginRequest(async () => {
    const result = await postAuthRequest(endpoint, { ...payload, remember });
    onContinue({ ...result, remember });
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanEmail = email.trim();

    if (isForgot) {
      if (!emailPattern.test(cleanEmail)) {
        setError('Enter the email address associated with your account.');
        return;
      }
      beginRequest(async () => {
        const result = await postAuthRequest('forgot-password', { email: cleanEmail });
        setNotice(result.message || 'If an account exists for this address, a password reset email has been sent.');
      });
      return;
    }

    if (isReset) {
      if (!resetToken) {
        setError('This password reset link is invalid. Request a new reset email.');
        return;
      }
      if (password.length < 8 || password.length > 128) {
        setError('Use a password between 8 and 128 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('The passwords do not match.');
        return;
      }
      beginRequest(async () => {
        const result = await postAuthRequest('reset-password', { token: resetToken, password });
        setNotice(result.message || 'Your password has been updated. Sign in with your new password.');
        setPassword('');
        setConfirmPassword('');
        setMode('signin');
        onNavigate('auth');
      });
      return;
    }

    if (!emailPattern.test(cleanEmail)) {
      setError('Enter a valid email address to continue.');
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError('Use a password between 8 and 128 characters.');
      return;
    }
    if (isSignUp && !name.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (isSignUp && name.trim().length > 80) {
      setError('Your name must be 80 characters or fewer.');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    const endpoint = isSignUp ? 'register' : 'login';
    const payload = isSignUp
      ? { name: name.trim(), email: cleanEmail, password }
      : { email: cleanEmail, password };
    handleCredential(endpoint, payload);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
    if (nextMode === 'reset') onNavigate('reset');
    else onNavigate('auth');
  };

  const title = isSignUp ? 'Make room for ideas.' : isReset ? 'Choose a new password.' : isForgot ? 'Reset your password.' : 'Welcome back.';
  const description = isSignUp
    ? 'Create your account and start with a little more focus.'
    : isReset
      ? 'Choose a secure password you have not used here before.'
      : isForgot
        ? 'We’ll email you a secure link to choose a new password.'
        : 'Sign in to pick up right where you left off.';

  return (
    <main className="auth-page">
      <div className="auth-brand-row">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onBack(); }}>
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
          <span>lifeof<span className="brand-light">hub</span></span>
        </a>
        <button className="auth-back" onClick={onBack} type="button"><ArrowLeft size={14} /> Back to home</button>
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-art" aria-hidden="true">
          <span className="auth-art-orb" />
          <span className="auth-note auth-note-one">Make space<br />for what matters.</span>
          <span className="auth-note auth-note-two">A little idea<br />can go a long way.</span>
          <span className="auth-art-spark">✳</span>
        </div>
        <div className="auth-form-wrap">
          <span className="auth-kicker">LIFEOF HUB WORKSPACE</span>
          <h1 id="auth-title">{title}</h1>
          <p className="auth-description">{description}</p>

          {!isReset && !isForgot && (
            <>
              <GoogleSignIn
                clientId={googleClientId}
                disabled={submitting}
                onCredential={(credential) => handleCredential('google', { credential })}
                onError={setError}
              />
              <div className="auth-divider"><span>or continue with email</span></div>
            </>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isSignUp && (
              <>
                <label htmlFor="auth-name">Full name</label>
                <div className="auth-input-wrap">
                  <UserRound aria-hidden="true" size={16} />
                  <input autoComplete="name" id="auth-name" maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Your name" value={name} />
                </div>
              </>
            )}

            {!isReset && (
              <>
                <label htmlFor="auth-email">Email address</label>
                <div className="auth-input-wrap">
                  <Mail aria-hidden="true" size={16} />
                  <input autoComplete="email" id="auth-email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
                </div>
              </>
            )}

            {(!isForgot) && (
              <>
                <label htmlFor="auth-password">{isReset ? 'New password' : 'Password'}</label>
                <div className="auth-input-wrap">
                  {isReset ? <KeyRound aria-hidden="true" size={16} /> : <LockKeyhole aria-hidden="true" size={16} />}
                  <input
                    autoComplete={isReset || isSignUp ? 'new-password' : 'current-password'}
                    id="auth-password"
                    maxLength={128}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {(isSignUp || isReset) && (
                  <>
                    <label htmlFor="auth-confirm-password">Confirm password</label>
                    <div className="auth-input-wrap">
                      <LockKeyhole aria-hidden="true" size={16} />
                      <input
                        autoComplete="new-password"
                        id="auth-confirm-password"
                        maxLength={128}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Re-enter your password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {mode === 'signin' && (
              <div className="auth-options">
                <label className="auth-remember">
                  <input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" />
                  <span>Remember me</span>
                </label>
                <button className="auth-text-button" onClick={() => switchMode('forgot')} type="button">Forgot password?</button>
              </div>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-notice" role="status">{notice}</p>}
            <button className="button button-primary auth-submit" disabled={submitting} type="submit">
              {submitting ? <><LoaderCircle aria-hidden="true" className="auth-spinner" size={16} /> Please wait…</> : (
                <>{isSignUp ? 'Create account' : isReset ? 'Update password' : isForgot ? 'Send reset link' : 'Sign in'} <ArrowRight aria-hidden="true" size={16} /></>
              )}
            </button>
          </form>

          {mode === 'signin' || isSignUp ? (
            <p className="auth-switch">
              {isSignUp ? 'Already have an account?' : 'New to Lifeof Hub?'}{' '}
              <button onClick={() => switchMode(isSignUp ? 'signin' : 'signup')} type="button">
                {isSignUp ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          ) : (
            <p className="auth-switch">
              Remembered it? <button onClick={() => switchMode('signin')} type="button">Back to sign in</button>
            </p>
          )}

          {!isReset && !isForgot && (
            <>
              <button className="auth-demo-button" onClick={() => onContinue({ preview: true, user: { email: email.trim() || 'alex@example.com', name: email.trim() ? email.trim().split('@')[0] : 'Alex' } })} type="button">
                Explore the browser preview
              </button>
              <p className="auth-demo-note">Preview data stays in this browser. Sign in to use MongoDB sync.</p>
            </>
          )}
        </div>
      </section>
      <p className="auth-footnote">Your calmer workspace is just around the corner.</p>
    </main>
  );
}
