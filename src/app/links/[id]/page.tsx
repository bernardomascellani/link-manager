'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registra i componenti di Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsData {
  link: {
    id: string;
    shortPath: string;
    domain: string;
    totalClicks: number;
    createdAt: string;
    lastUsed?: string;
  };
  analytics: {
    totalClicks: number;
    uniqueIPs: number;
    clicksByDay: Record<string, number>;
    topReferers: [string, number][];
    topTargetUrls: [string, number][];
    clicksByHour: Record<number, number>;
    recentClicks: Array<{
      id: string;
      targetUrl: string;
      ip: string;
      userAgent: string;
      referer: string;
      timestamp: string;
    }>;
    period: {
      days: number;
      startDate: string;
      endDate: string;
    };
  };
}

export default function LinkAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  // Unwrap params
  const { id } = use(params);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetchAnalytics();
  }, [session, status, selectedPeriod, id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/links/${id}/analytics?days=${selectedPeriod}`);
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Errore nel caricamento delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  const getBrowserFromUserAgent = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Altro';
  };

  // Prepara i dati per il grafico
  const prepareChartData = () => {
    if (!analytics?.analytics.clicksByDay) return null;

    const sortedDates = Object.keys(analytics.analytics.clicksByDay).sort();
    const labels = sortedDates.map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    });
    
    const data = sortedDates.map(date => analytics.analytics.clicksByDay[date]);

    return {
      labels,
      datasets: [
        {
          label: 'Click',
          data: data,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) {
              return 'rgba(99, 102, 241, 0.1)';
            }
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.05)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.2)');
            return gradient;
          },
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(99, 102, 241, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            return `Data: ${context[0].label}`;
          },
          label: (context: any) => {
            return `${context.parsed.y} click`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          borderDash: [5, 5],
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
          },
          stepSize: 1,
        },
        border: {
          display: false,
        },
      },
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        backgroundColor: 'rgb(99, 102, 241)',
        borderColor: 'white',
        borderWidth: 2,
      },
      line: {
        tension: 0.4,
        borderWidth: 3,
      },
    },
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento statistiche...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Errore</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/links" className="text-indigo-600 hover:text-indigo-500">
            Torna ai Link
          </Link>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Nessun dato</h1>
          <p className="text-gray-600">Non ci sono statistiche disponibili per questo link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Analytics: {analytics.link.domain}/{analytics.link.shortPath}
              </h1>
              <p className="mt-2 text-gray-600">
                Creato il {formatDate(analytics.link.createdAt)}
                {analytics.link.lastUsed && (
                  <span> • Ultimo uso: {formatDate(analytics.link.lastUsed)}</span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="period-select" className="text-sm font-medium text-gray-700">
                  Periodo:
                </label>
                <select
                  id="period-select"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value={7}>Ultimi 7 giorni</option>
                  <option value={30}>Ultimi 30 giorni</option>
                  <option value={90}>Ultimi 90 giorni</option>
                </select>
              </div>
              <Link
                href="/links"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Torna ai Link
              </Link>
            </div>
          </div>
        </div>

        {/* Statistiche Principali */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Click Totali</dt>
                    <dd className="text-lg font-medium text-gray-900">{analytics.analytics.totalClicks}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">IP Unici</dt>
                    <dd className="text-lg font-medium text-gray-900">{analytics.analytics.uniqueIPs}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Click per Giorno</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {Object.values(analytics.analytics.clicksByDay).length > 0 
                        ? Math.round(Object.values(analytics.analytics.clicksByDay).reduce((a, b) => a + b, 0) / Object.values(analytics.analytics.clicksByDay).length)
                        : 0
                      }
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grafico e Statistiche */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Grafico Andamento Click */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Andamento Click nel Tempo</h3>
              {prepareChartData() ? (
                <div className="h-80 w-full">
                  <Line data={prepareChartData()!} options={chartOptions} />
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  Nessun dato disponibile per il grafico
                </div>
              )}
            </div>
          </div>

          {/* Statistiche Rapide */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Statistiche Rapide</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Click Totali</span>
                  <span className="text-lg font-bold text-indigo-600">
                    {Object.values(analytics.analytics.clicksByDay).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Click Oggi</span>
                  <span className="text-lg font-bold text-green-600">
                    {analytics.analytics.clicksByDay[new Date().toISOString().split('T')[0]] || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Media Giornaliera</span>
                  <span className="text-lg font-bold text-blue-600">
                    {Object.values(analytics.analytics.clicksByDay).length > 0 
                      ? Math.round(Object.values(analytics.analytics.clicksByDay).reduce((a, b) => a + b, 0) / Object.values(analytics.analytics.clicksByDay).length)
                      : 0
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Destinazioni Uniche</span>
                  <span className="text-lg font-bold text-purple-600">
                    {analytics.analytics.topTargetUrls.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Referer */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Referer</h3>
              <div className="space-y-3">
                {analytics.analytics.topReferers.map(([referer, count], index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate max-w-xs">
                      {referer === 'Direct' ? 'Accesso diretto' : referer}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Target URLs */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Destinazioni</h3>
              <div className="space-y-3">
                {analytics.analytics.topTargetUrls.map(([url, count], index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate max-w-xs">
                      {url}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Click Recenti */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Click Recenti</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Ora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Browser
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destinazione
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referer
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.analytics.recentClicks.map((click) => (
                    <tr key={click.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(click.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {click.ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getBrowserFromUserAgent(click.userAgent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-xs">
                        {click.targetUrl}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-xs">
                        {click.referer || 'Direct'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
