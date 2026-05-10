export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    // Server-side: use the internal URL or NEXTAUTH_URL
    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
  }

  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname.startsWith('192.168.')) {
     return ''; // Use relative paths on localhost
  }

  // In production, force all API calls to api.loomdesk.online
  return 'https://api.loomdesk.online';
};

export const API_URL = getApiBaseUrl();
