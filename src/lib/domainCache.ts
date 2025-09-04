interface CachedDomain {
  _id: string;
  domain: string;
  isActive: boolean;
  isVerified: boolean;
  lastUpdated: number;
}

class DomainCache {
  private cache = new Map<string, CachedDomain>();
  private readonly TTL = 5 * 60 * 1000; // 5 minuti

  get(domain: string): CachedDomain | null {
    const cached = this.cache.get(domain);
    if (!cached) return null;
    
    // Controlla se è scaduto
    if (Date.now() - cached.lastUpdated > this.TTL) {
      this.cache.delete(domain);
      return null;
    }
    
    return cached;
  }

  set(domain: string, domainData: any): void {
    this.cache.set(domain, {
      _id: domainData._id.toString(),
      domain: domainData.domain,
      isActive: domainData.isActive,
      isVerified: domainData.isVerified,
      lastUpdated: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Pulisce le entry scadute
  cleanup(): void {
    const now = Date.now();
    for (const [domain, cached] of this.cache.entries()) {
      if (now - cached.lastUpdated > this.TTL) {
        this.cache.delete(domain);
      }
    }
  }
}

export const domainCache = new DomainCache();

// Pulisci la cache ogni 10 minuti
setInterval(() => {
  domainCache.cleanup();
}, 10 * 60 * 1000);
