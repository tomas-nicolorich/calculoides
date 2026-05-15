import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.stubGlobal('fetch', vi.fn());

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include Authorization header when session exists', async () => {
    const mockToken = 'mock-jwt-token';
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: mockToken } },
      error: null,
    } as any);

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'success' }),
    } as any);

    await apiClient.groups.list();

    expect(fetch).toHaveBeenCalledWith(
      '/api/groups',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should not include Authorization header when session does not exist', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'success' }),
    } as any);

    await apiClient.groups.list();

    expect(fetch).toHaveBeenCalledWith(
      '/api/groups',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'Authorization': expect.any(String),
        }),
      })
    );
  });
});
