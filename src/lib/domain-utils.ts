/**
 * Normalizza un dominio rimuovendo protocollo, www, barre finali e spazi
 * @param domain - Il dominio da normalizzare
 * @returns Il dominio normalizzato
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return '';
  
  // Rimuovi spazi
  let normalized = domain.trim();
  
  // Rimuovi protocollo (http://, https://)
  normalized = normalized.replace(/^https?:\/\//, '');
  
  // Rimuovi www. all'inizio
  normalized = normalized.replace(/^www\./, '');
  
  // Rimuovi barre finali e percorsi
  normalized = normalized.split('/')[0];
  
  // Rimuovi porte (es. :8080)
  normalized = normalized.split(':')[0];
  
  // Converti in lowercase
  normalized = normalized.toLowerCase();
  
  return normalized;
}

/**
 * Valida se un dominio ha un formato corretto
 * @param domain - Il dominio da validare
 * @returns true se il dominio è valido
 */
export function isValidDomain(domain: string): boolean {
  if (!domain) return false;
  
  const normalized = normalizeDomain(domain);
  
  // Regex per validare formato dominio
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
  
  return domainRegex.test(normalized);
}

/**
 * Estrae il dominio principale da un URL completo
 * @param url - L'URL da cui estrarre il dominio
 * @returns Il dominio principale
 */
export function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return normalizeDomain(urlObj.hostname);
  } catch {
    // Se non è un URL valido, prova a normalizzare direttamente
    return normalizeDomain(url);
  }
}

/**
 * Genera l'URL completo per un dominio
 * @param domain - Il dominio
 * @param protocol - Il protocollo (default: https)
 * @returns L'URL completo
 */
export function buildDomainUrl(domain: string, protocol: 'http' | 'https' = 'https'): string {
  const normalized = normalizeDomain(domain);
  return `${protocol}://${normalized}`;
}
