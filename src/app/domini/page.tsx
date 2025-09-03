'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DNSInstructions from '@/components/DNSInstructions';
import DomainVerificationStatus from '@/components/DomainVerificationStatus';
import { normalizeDomain } from '@/lib/domain-utils';

interface Domain {
  _id: string;
  domain: string;
  verificationToken: string;
  isVerified: boolean;
  isActive: boolean;
  verifiedAt?: string;
  createdAt: string;
}

export default function DominiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDNSInstructions, setShowDNSInstructions] = useState(false);
  const [showVerificationStatus, setShowVerificationStatus] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchDomains();
    }
  }, [status, router]);

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/domains');
      if (response.ok) {
        const data = await response.json();
        setDomains(data.domains);
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newDomain.trim()) {
      setError('Inserisci un dominio valido');
      return;
    }

    // Normalizza il dominio prima dell'invio
    const normalizedDomain = normalizeDomain(newDomain.trim());
    
    if (!normalizedDomain) {
      setError('Dominio non valido. Inserisci un dominio valido (es. esempio.com)');
      return;
    }

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: normalizedDomain }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Dominio aggiunto con successo!');
        setNewDomain('');
        setShowAddModal(false);
        fetchDomains();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Errore nell\'aggiunta del dominio');
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    const domain = domains.find(d => d._id === domainId);
    if (domain) {
      setSelectedDomain(domain);
      setShowVerificationStatus(true);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questo dominio?')) {
      return;
    }

    try {
      const response = await fetch(`/api/domains/${domainId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Dominio rimosso con successo!');
        fetchDomains();
      } else {
        setError('Errore nella rimozione del dominio');
      }
    } catch {
      setError('Errore nella rimozione del dominio');
    }
  };

  const handleToggleActive = async (domainId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/domains/${domainId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        setSuccess(isActive ? 'Dominio disattivato' : 'Dominio attivato');
        fetchDomains();
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch {
      setError('Errore nell\'aggiornamento del dominio');
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
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestione Domini</h1>
              <p className="text-gray-600">Collega i tuoi domini personalizzati</p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/dashboard"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Aggiungi Dominio
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

      {/* Domains List */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {domains.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun dominio</h3>
              <p className="mt-1 text-sm text-gray-500">Inizia aggiungendo il tuo primo dominio personalizzato.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Aggiungi Dominio
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {domains.map((domain) => (
                  <li key={domain._id}>
                    <div className="px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className={`h-2 w-2 rounded-full ${
                            domain.isActive ? 'bg-green-400' : 
                            domain.isVerified ? 'bg-yellow-400' : 'bg-red-400'
                          }`}></div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {domain.domain}
                            </p>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              domain.isActive ? 'bg-green-100 text-green-800' :
                              domain.isVerified ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {domain.isActive ? 'Attivo' : 
                               domain.isVerified ? 'Verificato' : 'Non verificato'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            Aggiunto il {new Date(domain.createdAt).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!domain.isVerified && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedDomain(domain);
                                setShowDNSInstructions(true);
                              }}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              Istruzioni DNS
                            </button>
                            <button
                              onClick={() => handleVerifyDomain(domain._id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              Verifica
                            </button>
                          </>
                        )}
                        {domain.isVerified && (
                          <button
                            onClick={() => handleToggleActive(domain._id, domain.isActive)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              domain.isActive 
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {domain.isActive ? 'Disattiva' : 'Attiva'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDomain(domain._id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                        >
                          Rimuovi
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Aggiungi Nuovo Dominio
              </h3>
              <form onSubmit={handleAddDomain}>
                <div className="mb-4">
                  <label htmlFor="domain" className="block text-sm font-semibold text-gray-800 mb-2">
                    Dominio
                  </label>
                  <input
                    type="text"
                    id="domain"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="esempio.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    required
                  />
                  <div className="mt-2 text-xs text-gray-600">
                    <p className="font-medium mb-1">Formato corretto:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>✅ Corretto:</strong> esempio.com, mio-sito.it, subdomain.esempio.com</li>
                      <li><strong>❌ Sbagliato:</strong> http://esempio.com, https://esempio.com/, www.esempio.com</li>
                    </ul>
                    <p className="mt-2 text-gray-500">Il sistema normalizzerà automaticamente il dominio.</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Aggiungi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DNS Instructions Modal */}
      {showDNSInstructions && selectedDomain && (
        <DNSInstructions
          domain={selectedDomain.domain}
          verificationToken={selectedDomain.verificationToken}
          onClose={() => {
            setShowDNSInstructions(false);
            setSelectedDomain(null);
          }}
        />
      )}

      {/* Domain Verification Status Modal */}
      {showVerificationStatus && selectedDomain && (
        <DomainVerificationStatus
          domain={selectedDomain.domain}
          verificationToken={selectedDomain.verificationToken}
          domainId={selectedDomain._id}
          onClose={() => {
            setShowVerificationStatus(false);
            setSelectedDomain(null);
            // Ricarica i domini per aggiornare lo stato
            fetchDomains();
          }}
          onVerificationSuccess={() => {
            // Ricarica i domini quando la verifica ha successo
            fetchDomains();
          }}
        />
      )}
    </div>
  );
}
