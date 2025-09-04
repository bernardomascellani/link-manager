'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Domain {
  _id: string;
  domain: string;
  isActive: boolean;
}

interface TargetUrl {
  url: string;
  weight: number;
  isActive: boolean;
}

interface LinkData {
  _id: string;
  domainId: {
    _id: string;
    domain: string;
    isActive: boolean;
  };
  shortPath: string;
  targetUrls: TargetUrl[];
  totalClicks: number;
  createdAt: string;
  lastUsed?: string;
}

export default function LinksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [links, setLinks] = useState<LinkData[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copyToast, setCopyToast] = useState(false);
  const [copyButtonPressed, setCopyButtonPressed] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    domainId: '',
    shortPath: '',
    targetUrls: [{ url: '', weight: 1, isActive: true }]
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [linksResponse, domainsResponse] = await Promise.all([
        fetch('/api/links'),
        fetch('/api/domains')
      ]);

      if (linksResponse.ok) {
        const linksData = await linksResponse.json();
        // Filtra i link con domini validi
        const validLinks = linksData.links.filter((link: any) => link.domainId && link.domainId.domain);
        setLinks(validLinks);
      }

      if (domainsResponse.ok) {
        const domainsData = await domainsResponse.json();
        const activeDomains = domainsData.domains.filter((d: Domain) => d.isActive);
        setDomains(activeDomains);
        
        // Imposta l'ultimo dominio come predefinito se non c'è già un dominio selezionato
        if (activeDomains.length > 0 && !formData.domainId) {
          setFormData(prev => ({
            ...prev,
            domainId: activeDomains[activeDomains.length - 1]._id
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTargetUrl = () => {
    setFormData({
      ...formData,
      targetUrls: [...formData.targetUrls, { url: '', weight: 1, isActive: true }]
    });
  };

  const handleImportCSV = async (file: File) => {
    setImportLoading(true);
    setError('');
    setSuccess('');

    try {
      const text = await file.text();
      
      // Controlla se il file è in formato RTF
      if (text.includes('{\\rtf1') || text.includes('\\ansi') || text.includes('\\ansicpg')) {
        setError('Il file sembra essere in formato RTF. Salva il file come CSV puro da Excel o usa un editor di testo per creare il CSV.');
        return;
      }
      
      const lines = text.split('\n');
      
      if (lines.length < 2) {
        setError('Il file CSV deve contenere almeno una riga di intestazione e una riga di dati');
        return;
      }

      // Trova le colonne keyword e url
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      console.log('Headers trovati:', headers);
      
      // Controlla se gli headers contengono caratteri di controllo RTF
      if (headers.some(h => h.includes('\\') || h.includes('{') || h.includes('}'))) {
        setError('Il file contiene caratteri di controllo RTF. Salva il file come CSV puro da Excel o usa un editor di testo per creare il CSV.');
        return;
      }
      
      const keywordIndex = headers.findIndex(h => h === 'keyword');
      const urlIndex = headers.findIndex(h => h === 'url');
      console.log('Indici trovati:', { keywordIndex, urlIndex });

      if (keywordIndex === -1 || urlIndex === -1) {
        setError(`Il file CSV deve contenere le colonne "keyword" e "url". Colonne trovate: ${headers.join(', ')}`);
        return;
      }

      // Processa le righe di dati
      const linksToCreate = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length < Math.max(keywordIndex, urlIndex) + 1) continue;

        const keyword = values[keywordIndex];
        const url = values[urlIndex];

        if (keyword && url) {
          linksToCreate.push({ keyword, url });
        }
      }

      if (linksToCreate.length === 0) {
        setError('Nessun link valido trovato nel file CSV');
        return;
      }

      // Crea i link uno per uno
      let successCount = 0;
      let errorCount = 0;

      for (const linkData of linksToCreate) {
        try {
          const response = await fetch('/api/links', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              domainId: formData.domainId,
              shortPath: linkData.keyword,
              targetUrls: [{ url: linkData.url, weight: 1, isActive: true }]
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`Importazione completata: ${successCount} link creati${errorCount > 0 ? `, ${errorCount} errori` : ''}`);
        fetchData(); // Ricarica i link
        setShowImportModal(false);
      } else {
        setError('Nessun link è stato creato. Verifica i dati nel file CSV.');
      }

    } catch (error) {
      setError('Errore durante la lettura del file CSV');
    } finally {
      setImportLoading(false);
    }
  };

  const handleRemoveTargetUrl = (index: number) => {
    if (formData.targetUrls.length > 1) {
      setFormData({
        ...formData,
        targetUrls: formData.targetUrls.filter((_, i) => i !== index)
      });
    }
  };

  // Filtra i link in base al termine di ricerca
  const filteredLinks = links.filter(link => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Cerca nel shortPath (keyword)
    if (link.shortPath.toLowerCase().includes(searchLower)) return true;
    
    // Cerca nel dominio
    if (link.domainId?.domain?.toLowerCase().includes(searchLower)) return true;
    
    // Cerca negli URL di destinazione
    if (link.targetUrls.some(target => target.url.toLowerCase().includes(searchLower))) return true;
    
    return false;
  });

  const handleTargetUrlChange = (index: number, field: string, value: string | number | boolean) => {
    const newTargetUrls = [...formData.targetUrls];
    newTargetUrls[index] = { ...newTargetUrls[index], [field]: value };
    setFormData({ ...formData, targetUrls: newTargetUrls });
  };

  const handleAddLink = () => {
    // Imposta l'ultimo dominio come predefinito se disponibile
    const defaultDomainId = domains.length > 0 ? domains[domains.length - 1]._id : '';
    
    setFormData({
      domainId: defaultDomainId,
      shortPath: '',
      targetUrls: [{ url: '', weight: 1, isActive: true }]
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.domainId || !formData.shortPath || formData.targetUrls.some(url => !url.url)) {
      setError('Compila tutti i campi obbligatori');
      return;
    }

    try {
      const url = selectedLink ? `/api/links/${selectedLink._id}` : '/api/links';
      const method = selectedLink ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(selectedLink ? 'Link aggiornato con successo!' : 'Link creato con successo!');
        setFormData({
          domainId: '',
          shortPath: '',
          targetUrls: [{ url: '', weight: 1, isActive: true }]
        });
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedLink(null);
        fetchData();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Errore nell\'operazione');
    }
  };

  const handleEdit = (link: LinkData) => {
    setSelectedLink(link);
    setFormData({
      domainId: link.domainId._id,
      shortPath: link.shortPath,
      targetUrls: link.targetUrls
    });
    setShowEditModal(true);
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questo link?')) {
      return;
    }

    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Link rimosso con successo!');
        fetchData();
      } else {
        setError('Errore nella rimozione del link');
      }
    } catch {
      setError('Errore nella rimozione del link');
    }
  };

  const copyToClipboard = async (text: string, linkId: string) => {
    try {
      // Attiva l'animazione
      setCopyButtonPressed(linkId);
      
      await navigator.clipboard.writeText(text);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1500);
      
      // Disattiva l'animazione dopo 150ms
      setTimeout(() => setCopyButtonPressed(null), 150);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setCopyButtonPressed(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Gestione Link</h1>
            <p className="text-gray-600">Crea e gestisci i tuoi short link</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                disabled={domains.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Importa CSV
              </button>
              <button
                onClick={handleAddLink}
                disabled={domains.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Crea Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {success}
          </div>
        </div>
      )}

      {/* Links List */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {domains.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun dominio attivo</h3>
              <p className="mt-1 text-sm text-gray-500">Devi prima aggiungere e verificare un dominio per creare link.</p>
              <div className="mt-6">
                <Link
                  href="/domini"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Gestisci Domini
                </Link>
              </div>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun link</h3>
              <p className="mt-1 text-sm text-gray-500">Inizia creando il tuo primo short link.</p>
              <div className="mt-6">
                <button
                  onClick={handleAddLink}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Crea Link
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Cerca per keyword, dominio o URL..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
                {searchTerm && (
                  <div className="mt-2 text-sm text-gray-600">
                    {filteredLinks.length} di {links.length} link trovati
                  </div>
                )}
              </div>

              {filteredLinks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun link trovato</h3>
                  <p className="mt-1 text-sm text-gray-500">Prova a modificare i termini di ricerca.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {filteredLinks.map((link) => (
                  <li key={link._id}>
                    <div className="px-4 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="text-lg font-bold text-gray-900">
                              {link.domainId?.domain || 'Dominio non trovato'}/{link.shortPath}
                            </p>
                            <button
                              onClick={() => copyToClipboard(`https://${link.domainId?.domain || 'dominio-non-trovato'}/${link.shortPath}`, link._id)}
                              className={`ml-2 text-gray-400 hover:text-gray-600 transition-all duration-150 ${
                                copyButtonPressed === link._id ? 'scale-95 opacity-75' : ''
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                          <div className="mt-1">
                            <p className="text-sm text-gray-500">
                              {link.targetUrls.length} URL di destinazione • {link.totalClicks} click
                            </p>
                            <div className="mt-1">
                              {link.targetUrls.map((target, index) => (
                                <div key={index} className="inline-flex items-center mr-2 mb-2">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      target.isActive 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {target.url} (peso: {target.weight})
                                  </span>
                                  <button
                                    onClick={() => window.open(target.url, '_blank')}
                                    className="ml-1 p-1 text-blue-600 hover:text-blue-800 transition-colors duration-150"
                                    title="Testa Link"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/links/${link._id}`}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                          >
                            Analytics
                          </Link>
                          <button
                            onClick={() => handleEdit(link)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => handleDelete(link._id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                          >
                            Rimuovi
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Link Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedLink ? 'Modifica Link' : 'Crea Nuovo Link'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Domain Selection */}
                  <div>
                    <label htmlFor="domainId" className="block text-sm font-semibold text-gray-800 mb-2">
                      Dominio
                    </label>
                    <select
                      id="domainId"
                      value={formData.domainId}
                      onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      required
                    >
                      <option value="">Seleziona un dominio</option>
                      {domains.map((domain) => (
                        <option key={domain._id} value={domain._id}>
                          {domain.domain}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Short Path */}
                  <div>
                    <label htmlFor="shortPath" className="block text-sm font-semibold text-gray-800 mb-2">
                      Percorso Breve
                    </label>
                    <input
                      type="text"
                      id="shortPath"
                      value={formData.shortPath}
                      onChange={(e) => setFormData({ ...formData, shortPath: e.target.value })}
                      placeholder="instagram"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Solo lettere, numeri, trattini e underscore
                    </p>
                  </div>

                  {/* Target URLs */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      URL di Destinazione
                    </label>
                    {formData.targetUrls.map((targetUrl, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="url"
                          value={targetUrl.url}
                          onChange={(e) => handleTargetUrlChange(index, 'url', e.target.value)}
                          placeholder="https://instagram.com/brnd_crypto"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                          required
                        />
                        <input
                          type="number"
                          value={targetUrl.weight}
                          onChange={(e) => handleTargetUrlChange(index, 'weight', parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={targetUrl.isActive}
                            onChange={(e) => handleTargetUrlChange(index, 'isActive', e.target.checked)}
                            className="mr-1"
                          />
                          <span className="text-xs text-gray-600">Attivo</span>
                        </label>
                        {formData.targetUrls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTargetUrl(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddTargetUrl}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      + Aggiungi URL
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                      Il peso determina la probabilità di essere selezionato nella rotazione
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedLink(null);
                      setFormData({
                        domainId: '',
                        shortPath: '',
                        targetUrls: [{ url: '', weight: 1, isActive: true }]
                      });
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {selectedLink ? 'Aggiorna' : 'Crea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Importa Link da CSV
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Seleziona File CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportCSV(file);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Formato CSV Richiesto:</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <p><strong>Intestazioni obbligatorie:</strong> keyword, url</p>
                  <p><strong>⚠️ IMPORTANTE:</strong> Salva il file come CSV puro, non RTF!</p>
                  <p><strong>Esempio:</strong></p>
                  <pre className="bg-white p-2 rounded text-xs">
keyword,url{'\n'}
instagram,https://instagram.com/brnd_crypto{'\n'}
twitter,https://twitter.com/brnd_crypto{'\n'}
linkedin,https://linkedin.com/in/brnd_crypto
                  </pre>
                  <p className="mt-2 text-red-600 font-semibold">
                    Se usi Excel: File → Salva con nome → Tipo: CSV UTF-8
                  </p>
                </div>
              </div>

              {importLoading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Importazione in corso...</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  disabled={importLoading}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Toast */}
      {copyToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg bg-green-700 text-white text-sm font-medium transition-all duration-300">
          Link copiato
        </div>
      )}
    </div>
  );
}
