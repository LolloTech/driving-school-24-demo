import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

test('subpath applies to navigation and authenticated API requests', async () => {
  vi.stubEnv('BASE_URL', '/driving24/');
  vi.resetModules();
  const { appUrl } = await import('../../../paths');
  expect(appUrl('/login')).toBe('/driving24/login');
  expect(appUrl('/')).toBe('/driving24/');
  const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
  vi.stubGlobal('fetch', fetch);
  const { request } = await import('../api');
  await request('/api/auth/me');
  expect(fetch).toHaveBeenCalledWith('/driving24/api/auth/me', expect.objectContaining({ credentials: 'same-origin' }));
});
