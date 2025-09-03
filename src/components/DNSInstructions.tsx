'use client';

import { useState } from 'react';

interface DNSInstructionsProps {
  domain: string;
  verificationToken: string;
  onClose: () => void;
}

export default function DNSInstructions({ domain, verificationToken, onClose }: DNSInstructionsProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const recordName = `_linkmanager-verify.${domain}`;
  const recordValue = `linkmanager-verify=${verificationToken}`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Istruzioni DNS per {domain}
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

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Passo 1: Aggiungi Record TXT</h4>
              <p className="text-blue-800 text-sm mb-3">
                Aggiungi questo record TXT nel tuo provider DNS:
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-1">
                    Nome Record:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={recordName}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-md text-sm font-mono text-gray-900"
                    />
                    <button
                      onClick={() => copyToClipboard(recordName, 'name')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      {copied === 'name' ? 'Copiato!' : 'Copia'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-1">
                    Valore Record:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={recordValue}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-md text-sm font-mono text-gray-900"
                    />
                    <button
                      onClick={() => copyToClipboard(recordValue, 'value')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      {copied === 'value' ? 'Copiato!' : 'Copia'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Passo 2: Configura CNAME (Obbligatorio)</h4>
              <p className="text-green-800 text-sm mb-3">
                <strong>IMPORTANTE:</strong> Senza questo record CNAME, il traffico non può arrivare alla piattaforma. Aggiungi questo record CNAME:
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1">
                    Nome Record:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={domain}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-md text-sm font-mono text-gray-900"
                    />
                    <button
                      onClick={() => copyToClipboard(domain, 'cname-name')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      {copied === 'cname-name' ? 'Copiato!' : 'Copia'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1">
                    Valore Record:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value="linkmanager.vercel.app"
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-md text-sm font-mono text-gray-900"
                    />
                    <button
                      onClick={() => copyToClipboard('linkmanager.vercel.app', 'cname-value')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      {copied === 'cname-value' ? 'Copiato!' : 'Copia'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">Passo 3: Attendi la Propagazione</h4>
              <p className="text-yellow-800 text-sm">
                I record DNS possono richiedere fino a 24-48 ore per propagarsi completamente. 
                Una volta aggiunti i record, clicca su &quot;Verifica&quot; per controllare lo stato.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Ho Capito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
