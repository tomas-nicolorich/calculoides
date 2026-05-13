export const apiClient = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'API request failed');
    }

    if (res.status === 204) return null;
    return res.json();
  },

  groups: {
    list: () => apiClient.fetch('/groups'),
    create: (name: string) =>
      apiClient.fetch('/groups', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
  },

  categories: {
    list: (groupId: string) => apiClient.fetch(`/categories?groupId=${groupId}`),
    create: (groupId: string, data: { name: string; monthlyBudget: number; icon?: string }) =>
      apiClient.fetch(`/categories?groupId=${groupId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  expenses: {
    log: (data: { categoryId: string; description: string; amount: number; date?: string; payerId?: string }) =>
      apiClient.fetch('/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiClient.fetch(`/expenses?id=${id}`, {
        method: 'DELETE',
      }),
  },

  invitations: {
    list: () => apiClient.fetch('/invitations'),
    create: (groupId: string, email: string) =>
      apiClient.fetch(`/invitations?groupId=${groupId}`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    respond: (invitationId: string, action: 'ACCEPT' | 'REJECT') =>
      apiClient.fetch('/respond-invitation', {
        method: 'POST',
        body: JSON.stringify({ invitationId, action }),
      }),
  },

  savings: {
    list: (groupId: string) => apiClient.fetch(`/savings?groupId=${groupId}`),
    create: (groupId: string, data: { name: string; targetAmount: number; targetDate: string }) =>
      apiClient.fetch(`/savings?groupId=${groupId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    upsertContribution: (goalId: string, memberId: string, amount: number) =>
      apiClient.fetch(`/savings?goalId=${goalId}&memberId=${memberId}`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    delete: (goalId: string) =>
      apiClient.fetch(`/savings?goalId=${goalId}`, {
        method: 'DELETE',
      }),
  },
};
