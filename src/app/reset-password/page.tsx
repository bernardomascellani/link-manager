'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '@/lib/passwordValidation';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [checkingToken, setCheckingToken] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    errors: [] as string[],
    strength: 'weak' as 'weak' | 'medium' | 'strong'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      // Verifica se il token è valido
      checkTokenValidity(tokenParam);
    } else {
      // Se non c'è token, reindirizza immediatamente a login
      redirectToLogin();
    }
  }, [searchParams, router]);

  const redirectToLogin = () => {
    const customDomain = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN;
    if (customDomain) {
      window.location.href = `https://${customDomain}/login`;
    } else {
      router.push('/login');
    }
  };

  const checkTokenValidity = async (token: string) => {
    setCheckingToken(true);
    try {
      const response = await fetch('/api/auth/check-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setToken(token);
      } else {
        // Token non valido o scaduto, reindirizza a login
        redirectToLogin();
      }
    } catch (error) {
      console.error('Error checking token validity:', error);
      // In caso di errore, reindirizza a login
      redirectToLogin();
    } finally {
      setCheckingToken(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Validazione password in tempo reale
    const validation = validatePassword(newPassword);
    setPasswordValidation(validation);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('La password non soddisfa i requisiti di sicurezza');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => {
          // Redirect al dominio personalizzato se disponibile
          const customDomain = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN;
          if (customDomain) {
            window.location.href = `https://${customDomain}/login`;
          } else {
            router.push('/login');
          }
        }, 2000);
      } else {
        // Se il token è non valido o scaduto, reindirizza a login
        if (data.error === 'Token non valido o scaduto') {
          const customDomain = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN;
          if (customDomain) {
            window.location.href = `https://${customDomain}/login`;
          } else {
            router.push('/login');
          }
          return;
        }
        
        if (data.details && Array.isArray(data.details)) {
          setError(`Password non valida: ${data.details.join(', ')}`);
        } else {
          setError(data.error);
        }
      }
    } catch {
      setError('Errore durante il reset della password');
    } finally {
      setLoading(false);
    }
  };

  if (!token || checkingToken) {
    // Se non c'è token o sta verificando, mostra loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {checkingToken ? 'Verifica token...' : 'Reindirizzamento...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Resetta la tua password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inserisci la tua nuova password
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nuova password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Scegli una nuova password"
                  value={password}
                  onChange={handlePasswordChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Forza:</span>
                    <span className={`text-xs font-medium ${getPasswordStrengthColor(passwordValidation.strength)}`}>
                      {getPasswordStrengthText(passwordValidation.strength)}
                    </span>
                  </div>
                  {passwordValidation.errors.length > 0 && (
                    <div className="mt-1">
                      <ul className="text-xs text-red-600 space-y-1">
                        {passwordValidation.errors.map((error, index) => (
                          <li key={index} className="flex items-center">
                            <span className="mr-1">•</span>
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Conferma password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Conferma la nuova password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {message && (
            <div className="text-green-600 text-sm text-center">{message}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Reset in corso...' : 'Resetta password'}
            </button>
          </div>

          <div className="text-center">
            <a
              href={process.env.NEXT_PUBLIC_CUSTOM_DOMAIN ? `https://${process.env.NEXT_PUBLIC_CUSTOM_DOMAIN}/login` : "/login"}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Torna al login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
