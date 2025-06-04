'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);
    
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData();
    }
  }, [session?.user?.id]);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Errore nel recupero dei dati');
      }
      const data = await res.json();
      if (data.baseUrl) {
        setBaseUrl(data.baseUrl);
      }
    } catch (error) {
      console.error('Errore nel recupero dei dati utente:', error);
      setError(error instanceof Error ? error.message : 'Errore nel recupero dei dati utente');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ baseUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Errore durante l\'aggiornamento dell\'URL base');
      }

      const data = await res.json();
      setSuccess(data.message || 'URL base aggiornato con successo!');
      setIsEditing(false);
    } catch (error) {
      console.error('Errore durante l\'aggiornamento:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'aggiornamento dell\'URL base');
    }
  };

  if (status === 'loading') {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profilo Utente</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Informazioni Personali</h2>
            <p className="mt-1 text-sm text-gray-600">
              Nome: {session?.user?.name}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Email: {session?.user?.email}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium text-gray-900">URL Base</h2>
            {error && (
              <div className="mt-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-2 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}
            {isEditing ? (
              <form onSubmit={handleSubmit} className="mt-2">
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="Inserisci l'URL base (es. https://tuodominio.com)"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
                <div className="mt-4 flex space-x-3">
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Salva
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  {baseUrl || 'Nessun URL base impostato'}
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {baseUrl ? 'Modifica URL base' : 'Imposta URL base'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 