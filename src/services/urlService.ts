export function getBaseUrl(): string {
  // Vite exposes env variables prefixed with VITE_. 
  // We check VITE_APP_URL first, then fallback to APP_URL if running in a Node context.
  const explicit = (import.meta.env.VITE_APP_URL || import.meta.env.APP_URL) as string | undefined;
  
  if (explicit && explicit.trim().length > 0) {
    return explicit.replace(/\/+$/, ''); // trim trailing slashes
  }
  
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return '';
}

export function getCampaignPublicUrl(campaignId: string): string {
  const base = getBaseUrl();
  if (!base) return '';
  return `${base}/c/${campaignId}`;
}