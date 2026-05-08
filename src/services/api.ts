export const getAuthToken = () => localStorage.getItem('blostem_token');

const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/backend-api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
};

export const api = {
  get: (endpoint: string) => request(endpoint, { method: 'GET' }),
  post: (endpoint: string, body?: any) => request(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (endpoint: string, body: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),

  // ── Market Data APIs (cached server-side) ─────────────────────
  markets: {
    forex: () => request('/markets/forex', { method: 'GET' }),
    crypto: () => request('/markets/crypto', { method: 'GET' }),
    indices: () => request('/markets/indices', { method: 'GET' }),
    mutualFunds: () => request('/markets/mutual-funds', { method: 'GET' }),
    summary: () => request('/markets/summary', { method: 'GET' }),
  },

  // ── Quant Engine APIs ─────────────────────────────────────────
  quant: {
    generatePlan: (stepUpRate?: number) =>
      request('/quant/plan', { method: 'POST', body: JSON.stringify({ stepUpRate }) }),
    getLatestPlan: () => request('/quant/plan', { method: 'GET' }),
    simulate: (monthlySIP: number, allocation: Record<string, number>, years?: number, stepUpRate?: number) =>
      request('/quant/simulate', {
        method: 'POST',
        body: JSON.stringify({ monthlySIP, allocation, years, stepUpRate }),
      }),
    goalSIP: (targetAmount: number, months: number, annualRate?: number) =>
      request('/quant/goal-sip', {
        method: 'POST',
        body: JSON.stringify({ targetAmount, months, annualRate }),
      }),
  },
};
