interface CachedLink {
  _id: string;
  domainId: string;
  shortPath: string;
  targetUrls: Array<{ url: string; weight: number; isActive: boolean }>;
  totalClicks: number;
  lastUpdated: number;
}

class LinkCache {
  private cache = new Map<string, CachedLink>();
  private readonly TTL = 2 * 60 * 1000; // 2 minuti

  getKey(domainId: string, shortPath: string): string {
    return `${domainId}:${shortPath}`;
  }

  get(domainId: string, shortPath: string): CachedLink | null {
    const key = this.getKey(domainId, shortPath);
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // Controlla se è scaduto
    if (Date.now() - cached.lastUpdated > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }

  set(domainId: string, shortPath: string, linkData: any): void {
    const key = this.getKey(domainId, shortPath);
    this.cache.set(key, {
      _id: linkData._id.toString(),
      domainId: domainId,
      shortPath: shortPath,
      targetUrls: linkData.targetUrls,
      totalClicks: linkData.totalClicks,
      lastUpdated: Date.now()
    });
  }

  // Aggiorna solo i click count senza invalidare la cache
  updateClickCount(domainId: string, shortPath: string): void {
    const key = this.getKey(domainId, shortPath);
    const cached = this.cache.get(key);
    if (cached) {
      cached.totalClicks += 1;
      cached.lastUpdated = Date.now();
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Pulisce le entry scadute
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.lastUpdated > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const linkCache = new LinkCache();

// Pulisci la cache ogni 5 minuti
setInterval(() => {
  linkCache.cleanup();
}, 5 * 60 * 1000);
