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
  const [verificationToken, setVerificationToken] = useState('');
  const [domainVerified, setDomainVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    console.log('Session statuuuuuus:', status);
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
      if (data.domainVerificationToken) {
        setVerificationToken(data.domainVerificationToken);
      }
      if (typeof data.domainVerified === 'boolean') {
        setDomainVerified(data.domainVerified);
      }
    } catch {
      console.error('Errore nel recupero dei dati utente');
      setError('Errore nel recupero dei dati utente');
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
    } catch {
      setError('Errore durante l\'aggiornamento dell\'URL base');
    }
  };

  const handleVerifyDomain = async () => {
    setVerifying(true);
    setVerifyMessage('');
    try {
      const res = await fetch('/api/user/verify-domain', { credentials: 'include' });
      const data = await res.json();
      setVerifyMessage(data.message);
      setDomainVerified(!!data.verified);
    } catch {
      setVerifyMessage('Errore durante la verifica DNS');
    } finally {
      setVerifying(false);
    }
  };

  // Polling automatico per la verifica dominio ogni 30 secondi se non verificato
  useEffect(() => {
    if (!domainVerified && baseUrl && verificationToken) {
      const interval = setInterval(() => {
        handleVerifyDomain();
      }, 30000); // 30 secondi
      return () => clearInterval(interval);
    }
  }, [domainVerified, baseUrl, verificationToken]);

  const handleDeleteDomain = async () => {
    setShowDeleteConfirm(false);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ baseUrl: '' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Errore durante la cancellazione del dominio');
      }
      await fetchUserData();
      setSuccess('Dominio cancellato con successo!');
    } catch {
      setError('Errore durante la cancellazione del dominio');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      // errore copia
    }
  };

  if (status === 'loading') {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {copied && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-2 rounded shadow-lg animate-fade-in-out">
          {copied} copiato!
        </div>
      )}
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
                {baseUrl && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="ml-2 mt-2 inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Cancella dominio
                  </button>
                )}
                {showDeleteConfirm && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded">
                    <p className="text-red-700 mb-2">Sei sicuro di voler cancellare il dominio? Questa azione è irreversibile.</p>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleDeleteDomain}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Sì, cancella
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                )}
                {(baseUrl && baseUrl !== '/' && verificationToken) && (
                  <div className="mt-6 p-4 bg-gray-50 border rounded">
                    <h3 className="font-semibold mb-2 text-blue-700">Verifica dominio</h3>
                    <ol className="list-decimal list-inside text-sm text-gray-700 mb-2">
                      <li>Aggiungi un record <b>TXT</b> al DNS del dominio <b>{new URL(baseUrl).hostname}</b>:</li>
                    </ol>
                    <div className="mb-2 flex flex-col gap-2">
                      <div className="flex items-center">
                        <span className="font-mono text-xs bg-white text-gray-900 border border-gray-400 px-2 py-1 rounded font-bold mr-2">Nome:</span>
                        <span className="font-mono text-xs bg-gray-100 text-gray-800 border border-gray-300 px-2 py-1 rounded mr-2">_linkmanager-verifica</span>
                        <button
                          onClick={(e) => { e.currentTarget.classList.add('scale-95'); setTimeout(() => e.currentTarget.classList.remove('scale-95'), 150); copyToClipboard('_linkmanager-verifica', 'Nome'); }}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 border border-blue-300 ml-1 transition-transform duration-150"
                        >
                          Copia
                        </button>
                      </div>
                      <div className="flex items-center">
                        <span className="font-mono text-xs bg-white text-gray-900 border border-gray-400 px-2 py-1 rounded font-bold mr-2">Valore:</span>
                        <span className="font-mono text-xs bg-gray-100 text-gray-800 border border-gray-300 px-2 py-1 rounded mr-2">{verificationToken}</span>
                        <button
                          onClick={(e) => { e.currentTarget.classList.add('scale-95'); setTimeout(() => e.currentTarget.classList.remove('scale-95'), 150); copyToClipboard(verificationToken, 'Valore'); }}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 border border-blue-300 ml-1 transition-transform duration-150"
                        >
                          Copia
                        </button>
                      </div>
                    </div>
                    <ol className="list-decimal list-inside text-sm text-gray-700 mb-2" start={2}>
                      <li>Aggiungi un record <b>CNAME</b> che punti a <b>link-manager-psi.vercel.app</b> (o il tuo dominio Vercel).</li>
                      <li>Attendi la propagazione DNS (può richiedere alcuni minuti).</li>
                      <li>Clicca su &quot;Verifica dominio&quot; qui sotto.</li>
                    </ol>
                    <div className="flex items-center space-x-3 mt-2">
                      <button
                        onClick={handleVerifyDomain}
                        disabled={verifying || domainVerified}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {verifying ? 'Verifica in corso...' : domainVerified ? 'Dominio verificato' : 'Verifica dominio'}
                      </button>
                      {domainVerified ? (
                        <span className="text-green-600 font-semibold">✅ Dominio verificato e operativo!</span>
                      ) : (
                        <span className="text-yellow-600 font-semibold">⏳ Dominio in attesa di verifica</span>
                      )}
                    </div>
                    {verifyMessage && (
                      <div className={`mt-2 text-sm ${domainVerified ? 'text-green-700' : 'text-yellow-700'}`}>{verifyMessage}</div>
                    )}
                  </div>
                )}
                {(baseUrl && baseUrl !== '/' && verificationToken && domainVerified) && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded">
                    <span className="text-green-700 font-semibold">✅ Dominio verificato e operativo!</span>
                    <p className="text-sm text-green-700 mt-2">
                      Ora puoi usare il tuo dominio custom per i link generati.
                    </p>
                  </div>
                )}
                {(baseUrl && baseUrl !== '/' && verificationToken && !domainVerified) && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
                    <span className="text-yellow-700 font-semibold">⏳ Dominio in attesa di verifica</span>
                    <p className="text-sm text-yellow-700 mt-2">
                      Dopo aver aggiunto i record DNS, clicca su &quot;Verifica dominio&quot;. La propagazione DNS può richiedere alcuni minuti.<br />
                      Finché il dominio non è verificato, non potrai generare nuovi link.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 