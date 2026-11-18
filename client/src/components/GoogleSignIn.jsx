import { useEffect, useRef, useState } from 'react';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';

export default function GoogleSignIn({ clientId, disabled, onCredential, onError }) {
  const buttonRef = useRef(null);
  const initializedClientId = useRef('');
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const [status, setStatus] = useState(clientId ? 'Loading Google sign-in…' : '');

  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!clientId) {
      setStatus('Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to client/.env.');
      return undefined;
    }

    let active = true;
    setStatus('Loading Google sign-in…');
    const target = buttonRef.current;
    const script = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`) || document.createElement('script');

    const renderGoogleButton = () => {
      if (!active || !target || !window.google?.accounts?.id) return;

      try {
        if (initializedClientId.current !== clientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (!response?.credential) {
                onErrorRef.current('Google did not return a sign-in credential. Please try again.');
                return;
              }
              onCredentialRef.current(response.credential);
            },
            auto_select: false,
          });
          initializedClientId.current = clientId;
        }

        target.replaceChildren();
        window.google.accounts.id.renderButton(target, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.max(200, Math.min(400, Math.floor(target.getBoundingClientRect().width))),
        });
        setStatus('');
      } catch (error) {
        console.error('Unable to initialize Google Identity Services:', error);
        onErrorRef.current('Google sign-in could not start. Check the OAuth client ID and authorized origin.');
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const handleLoad = () => renderGoogleButton();
      const handleError = () => {
        if (active) setStatus('Google sign-in could not load. Check your connection or browser settings.');
      };

      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      if (!script.src) {
        script.src = GOOGLE_IDENTITY_SCRIPT;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      return () => {
        active = false;
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
      };
    }

    return () => {
      active = false;
      if (target) target.replaceChildren();
    };
  }, [clientId]);

  return (
    <>
      <div aria-label="Continue with Google" aria-disabled={disabled} className={`google-button${disabled ? ' google-button-disabled' : ''}`} ref={buttonRef} />
      {status && <p className="google-signin-status" role="status">{status}</p>}
    </>
  );
}
