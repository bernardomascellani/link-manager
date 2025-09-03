const VERCEL_API_BASE = 'https://api.vercel.com/v10';

interface VercelDomainResponse {
  id: string;
  name: string;
  status: 'pending' | 'verified' | 'error';
  createdAt: number;
  updatedAt: number;
  error?: string;
}

interface VercelApiError {
  error: {
    code: string;
    message: string;
  };
}

export const vercelApi = {
  /**
   * Aggiunge un dominio a Vercel
   */
  async addDomain(domain: string): Promise<VercelDomainResponse> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const token = process.env.VERCEL_TOKEN;

    if (!projectId || !token) {
      throw new Error('Vercel API credentials not configured');
    }

    const response = await fetch(
      `${VERCEL_API_BASE}/projects/${projectId}/domains`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain,
        }),
      }
    );

    if (!response.ok) {
      const errorData: VercelApiError = await response.json();
      throw new Error(`Vercel API error: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Rimuove un dominio da Vercel
   */
  async removeDomain(domain: string): Promise<void> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const token = process.env.VERCEL_TOKEN;

    if (!projectId || !token) {
      throw new Error('Vercel API credentials not configured');
    }

    const response = await fetch(
      `${VERCEL_API_BASE}/projects/${projectId}/domains/${domain}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData: VercelApiError = await response.json();
      throw new Error(`Vercel API error: ${errorData.error?.message || response.statusText}`);
    }
  },

  /**
   * Ottiene lo stato di un dominio in Vercel
   */
  async getDomainStatus(domain: string): Promise<VercelDomainResponse> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const token = process.env.VERCEL_TOKEN;

    if (!projectId || !token) {
      throw new Error('Vercel API credentials not configured');
    }

    const response = await fetch(
      `${VERCEL_API_BASE}/projects/${projectId}/domains/${domain}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData: VercelApiError = await response.json();
      throw new Error(`Vercel API error: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Lista tutti i domini del progetto
   */
  async listDomains(): Promise<VercelDomainResponse[]> {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const token = process.env.VERCEL_TOKEN;

    if (!projectId || !token) {
      throw new Error('Vercel API credentials not configured');
    }

    const response = await fetch(
      `${VERCEL_API_BASE}/projects/${projectId}/domains`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData: VercelApiError = await response.json();
      throw new Error(`Vercel API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.domains || [];
  },

  /**
   * Verifica se le credenziali Vercel sono configurate
   */
  isConfigured(): boolean {
    return !!(process.env.VERCEL_PROJECT_ID && process.env.VERCEL_TOKEN);
  }
};

export type { VercelDomainResponse, VercelApiError };
