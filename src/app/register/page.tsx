'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '@/lib/passwordValidation';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    errors: [] as string[],
    strength: 'weak' as 'weak' | 'medium' | 'strong'
  });
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect se già autenticato
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value,
    };
    setFormData(newFormData);
    
    // Validazione password in tempo reale
    if (e.target.name === 'password') {
      const validation = validatePassword(e.target.value);
      setPasswordValidation(validation);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('La password non soddisfa i requisiti di sicurezza');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      } else {
        if (data.details && Array.isArray(data.details)) {
          setError(`Password non valida: ${data.details.join(', ')}`);
        } else {
          setError(data.error);
        }
      }
    } catch {
      setError('Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  // Mostra loading mentre verifica l'autenticazione
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifica autenticazione...</p>
        </div>
      </div>
    );
  }

  // Non mostrare nulla se sta reindirizzando
  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crea un nuovo account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            O{' '}
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              accedi al tuo account esistente
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nome completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Il tuo nome completo"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Indirizzo email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="La tua email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Scegli una password sicura"
                value={formData.password}
                onChange={handleChange}
              />
              {formData.password && (
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
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Conferma la password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {success && (
            <div className="text-green-600 text-sm text-center">{success}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Registrazione in corso...' : 'Registrati'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
