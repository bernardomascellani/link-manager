'use client';

import { useState, useEffect, useCallback } from 'react';

interface DomainVerificationStatusProps {
  domain: string;
  verificationToken: string;
  domainId: string;
  onClose: () => void;
  onVerificationSuccess?: () => void;
}

interface VerificationResult {
  type: 'TXT' | 'CNAME';
  name: string;
  expectedValue: string;
  status: 'checking' | 'found' | 'not-found' | 'error';
  actualValue?: string;
  error?: string;
}

export default function DomainVerificationStatus({ domain, verificationToken, domainId, onClose, onVerificationSuccess }: DomainVerificationStatusProps) {
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isUpdatingDatabase, setIsUpdatingDatabase] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const txtRecordName = `_linkmanager-verify.${domain}`;
  const txtRecordValue = `linkmanager-verify=${verificationToken}`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const updateDomainVerification = async () => {
    setIsUpdatingDatabase(true);
    try {
      const response = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainId }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setVerificationSuccess(true);
        // Chiama la callback se fornita
        if (onVerificationSuccess) {
          onVerificationSuccess();
        }
      } else {
        console.error('Failed to update domain verification:', data);
      }
    } catch (error) {
      console.error('Error updating domain verification:', error);
    } finally {
      setIsUpdatingDatabase(false);
    }
  };

  const checkDNSRecords = useCallback(async () => {
    setIsChecking(true);
    setVerificationResults([]);

    // Inizializza i risultati
    const results: VerificationResult[] = [
      {
        type: 'TXT',
        name: txtRecordName,
        expectedValue: txtRecordValue,
        status: 'checking'
      },
      {
        type: 'CNAME',
        name: domain,
        expectedValue: 'linkmanager.vercel.app',
        status: 'checking'
      }
    ];

    setVerificationResults([...results]);

    try {
      // Verifica TXT record
      const txtResponse = await fetch('/api/domains/verify-dns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'TXT',
          name: txtRecordName,
          expectedValue: txtRecordValue
        }),
      });

      const txtData = await txtResponse.json();
      
      results[0].status = txtData.found ? 'found' : 'not-found';
      results[0].actualValue = txtData.actualValue;
      results[0].error = txtData.error;

      setVerificationResults([...results]);

      // Verifica CNAME record
      const cnameResponse = await fetch('/api/domains/verify-dns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: domain,
          expectedValue: 'linkmanager.vercel.app'
        }),
      });

      const cnameData = await cnameResponse.json();
      
      results[1].status = cnameData.found ? 'found' : 'not-found';
      results[1].actualValue = cnameData.actualValue;
      results[1].error = cnameData.error;

      setVerificationResults([...results]);

      // Se entrambi i record sono verificati, aggiorna il database
      const allRecordsFound = results.every(result => result.status === 'found');
      if (allRecordsFound && !verificationSuccess) {
        await updateDomainVerification();
      }

    } catch (error) {
      console.error('Verification error:', error);
      results.forEach(result => {
        if (result.status === 'checking') {
          result.status = 'error';
          result.error = 'Errore durante la verifica';
        }
      });
      setVerificationResults([...results]);
    } finally {
      setIsChecking(false);
    }
  }, [domain, verificationToken, domainId, verificationSuccess, onVerificationSuccess]);

  useEffect(() => {
    checkDNSRecords();
  }, [checkDNSRecords]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
      case 'found':
        return <div className="h-4 w-4 rounded-full bg-green-500"></div>;
      case 'not-found':
        return <div className="h-4 w-4 rounded-full bg-red-500"></div>;
      case 'error':
        return <div className="h-4 w-4 rounded-full bg-yellow-500"></div>;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400"></div>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'checking':
        return 'Verifica in corso...';
      case 'found':
        return 'Record trovato ✓';
      case 'not-found':
        return 'Record non trovato ✗';
      case 'error':
        return 'Errore nella verifica ⚠';
      default:
        return 'Sconosciuto';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checking':
        return 'text-blue-600';
      case 'found':
        return 'text-green-600';
      case 'not-found':
        return 'text-red-600';
      case 'error':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const allRecordsFound = verificationResults.every(result => result.status === 'found');
  const isFullyVerified = allRecordsFound && verificationSuccess;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Stato Verifica DNS per {domain}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Overall Status */}
          <div className={`p-4 rounded-lg mb-6 ${
            isFullyVerified ? 'bg-green-50 border border-green-200' : 
            isUpdatingDatabase ? 'bg-blue-50 border border-blue-200' :
            allRecordsFound ? 'bg-yellow-50 border border-yellow-200' : 
            isChecking ? 'bg-blue-50 border border-blue-200' : 
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center">
              {isFullyVerified ? (
                <div className="h-5 w-5 rounded-full bg-green-500 mr-3"></div>
              ) : isUpdatingDatabase ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              ) : allRecordsFound ? (
                <div className="h-5 w-5 rounded-full bg-yellow-500 mr-3"></div>
              ) : isChecking ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              ) : (
                <div className="h-5 w-5 rounded-full bg-yellow-500 mr-3"></div>
              )}
              <div>
                <h4 className={`font-semibold ${
                  isFullyVerified ? 'text-green-900' : 
                  isUpdatingDatabase ? 'text-blue-900' :
                  allRecordsFound ? 'text-yellow-900' : 
                  isChecking ? 'text-blue-900' : 
                  'text-yellow-900'
                }`}>
                  {isFullyVerified ? '🎉 Dominio verificato e attivato con successo!' : 
                   isUpdatingDatabase ? 'Aggiornamento database in corso...' :
                   allRecordsFound ? 'Record DNS trovati! Aggiornamento database...' : 
                   isChecking ? 'Verifica in corso...' : 
                   'Alcuni record DNS mancano o sono configurati incorrettamente'}
                </h4>
                <p className={`text-sm ${
                  isFullyVerified ? 'text-green-700' : 
                  isUpdatingDatabase ? 'text-blue-700' :
                  allRecordsFound ? 'text-yellow-700' : 
                  isChecking ? 'text-blue-700' : 
                  'text-yellow-700'
                }`}>
                  {isFullyVerified ? 'Il tuo dominio è ora attivo e pronto per creare short link!' : 
                   isUpdatingDatabase ? 'Stiamo aggiornando lo stato del dominio nel database...' :
                   allRecordsFound ? 'Tutti i record DNS sono corretti. Aggiornamento automatico in corso...' : 
                   isChecking ? 'Controllo dei record DNS in corso...' : 
                   'Controlla i dettagli qui sotto per vedere cosa manca.'}
                </p>
              </div>
            </div>
          </div>

          {/* Individual Records */}
          <div className="space-y-4">
            {verificationResults.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {getStatusIcon(result.status)}
                    <h5 className="font-semibold text-gray-900 ml-3">
                      Record {result.type}
                    </h5>
                  </div>
                  <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                    {getStatusText(result.status)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      Nome Record:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={result.name}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono text-gray-900"
                      />
                      <button
                        onClick={() => copyToClipboard(result.name, `name-${index}`)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                      >
                        {copied === `name-${index}` ? 'Copiato!' : 'Copia'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      Valore Atteso:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={result.expectedValue}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono text-gray-900"
                      />
                      <button
                        onClick={() => copyToClipboard(result.expectedValue, `value-${index}`)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                      >
                        {copied === `value-${index}` ? 'Copiato!' : 'Copia'}
                      </button>
                    </div>
                  </div>

                  {result.actualValue && result.status === 'found' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        Valore Trovato:
                      </label>
                      <div className="px-3 py-2 bg-green-50 border border-green-300 rounded-md text-sm font-mono text-green-900">
                        {result.actualValue}
                      </div>
                    </div>
                  )}

                  {result.error && (
                    <div>
                      <label className="block text-sm font-semibold text-red-800 mb-1">
                        Errore:
                      </label>
                      <div className="px-3 py-2 bg-red-50 border border-red-300 rounded-md text-sm text-red-900">
                        {result.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-between">
            <button
              onClick={checkDNSRecords}
              disabled={isChecking}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              {isChecking ? 'Verifica in corso...' : 'Riprova Verifica'}
            </button>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
