'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LinkPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [urls, setUrls] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedLinks, setGeneratedLinks] = useState<Array<{ original: string; short: string }>>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allLinks, setAllLinks] = useState<Array<{ originalUrl: string; shortCode: string; createdAt: string }>>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchUserData();
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (baseUrl) {
      fetchAllLinks();
    }
  }, [baseUrl]);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      if (data.baseUrl) {
        setBaseUrl(data.baseUrl);
      }
    } catch {/* errore ignorato */}
  };

  const fetchAllLinks = async () => {
    try {
      const res = await fetch('/api/links/all', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setAllLinks(data.links || []);
    } catch {/* errore ignorato */}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');

    if (!baseUrl) {
      return;
    }

    const urlList = urls.split('\n').filter(url => url.trim());
    if (urlList.length === 0) {
      return;
    }

    try {
      const res = await fetch('/api/links/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: urlList,
          customCode: customCode.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedLinks(data.links);
        setSuccess('Link generati con successo!');
        setUrls('');
        setCustomCode('');
      }
    } catch {/* errore ignorato */}
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {/* errore ignorato */}
  };

  if (status === 'loading') {
    return <div>Caricamento...</div>;
  }

  if (!baseUrl) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">I Tuoi Link</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-lg text-gray-700 mb-4">
            Per generare link corti, devi prima impostare un URL base nel tuo profilo.
          </p>
          <button
            onClick={() => router.push('/profilo')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Vai al Profilo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">I Tuoi Link</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="urls" className="block text-sm font-medium text-gray-700">
              URL da accorciare (uno per riga)
            </label>
            <textarea
              id="urls"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
              placeholder="https://esempio.com/link-lungo-1\nhttps://esempio.com/link-lungo-2"
              required
            />
          </div>

          <div>
            <label htmlFor="customCode" className="block text-sm font-medium text-gray-700">
              Codice personalizzato (opzionale)
            </label>
            <input
              type="text"
              id="customCode"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
              placeholder="Lascia vuoto per generare un codice casuale"
            />
          </div>

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Genera Link Corti
          </button>
        </form>

        {generatedLinks.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Link Generati</h2>
            <div className="space-y-4">
              {generatedLinks.map((link, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium flex-grow">
                      Corto: <a href={link.short} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">{link.short}</a>
                    </p>
                    <button
                      onClick={() => copyToClipboard(link.short, index)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {copiedIndex === index ? 'Copiato!' : 'Copia'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabella dei link esistenti separata dal form */}
      {allLinks.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mt-12">
          <h2 className="text-lg font-bold mb-4">Tutti i tuoi link</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Originale</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Corto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creato il</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allLinks.map((link, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-gray-700 break-all">{link.originalUrl}</td>
                    <td className="px-4 py-2 text-sm">
                      <a href={`${baseUrl}/${link.shortCode}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                        {baseUrl}/{link.shortCode}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">{new Date(link.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 