/**
 * Utility functions for domain handling
 */

/**
 * Determines if a domain is a root domain (e.g., example.com) vs subdomain (e.g., sub.example.com)
 * @param domain The domain to check
 * @returns true if it's a root domain, false if it's a subdomain
 */
export function isRootDomain(domain: string): boolean {
  const parts = domain.split('.');
  return parts.length === 2; // example.com = 2 parts, sub.example.com = 3+ parts
}

/**
 * Gets the appropriate DNS record type for a domain
 * @param domain The domain to check
 * @returns 'A' for root domains, 'CNAME' for subdomains
 */
export function getDnsRecordType(domain: string): 'A' | 'CNAME' {
  return isRootDomain(domain) ? 'A' : 'CNAME';
}

/**
 * Gets the Vercel IP address for A records
 * @returns The Vercel IP address
 */
export function getVercelIpAddress(): string {
  return '216.198.79.1';
}

/**
 * Gets the Vercel CNAME target
 * @returns The Vercel CNAME target
 */
export function getVercelCnameTarget(): string {
  return 'link-manager-psi.vercel.app';
}
