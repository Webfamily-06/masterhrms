import {
  resolveEnvironment,
  resolveDevelopmentApiUrl,
  resolveStagingApiUrl,
  normalizeApiOrigin,
  PRODUCTION_API_URL,
  DEFAULT_BACKEND_PORT,
  getResolvedApiBaseUrl,
} from '../src/config/environment';
import { apiClient } from '../src/core/api/apiClient';

describe('MasterHRMS Mobile Environment Configuration & Interceptors', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('normalizes API origin and removes duplicate /api and trailing slashes', () => {
    expect(normalizeApiOrigin('http://192.168.1.176:4000/')).toBe('http://192.168.1.176:4000');
    expect(normalizeApiOrigin('http://192.168.1.176:4000/api')).toBe('http://192.168.1.176:4000');
    expect(normalizeApiOrigin('http://192.168.1.176:4000/api/v1/')).toBe('http://192.168.1.176:4000');
    expect(normalizeApiOrigin('https://www.masterhrms.com/api/')).toBe('https://www.masterhrms.com');
  });

  it('development defaults to the local backend and never to production', () => {
    delete process.env.EXPO_PUBLIC_APP_ENV;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;

    const env = resolveEnvironment();
    expect(env).toBe('development');

    const devUrl = resolveDevelopmentApiUrl();
    expect(devUrl).toContain(`:${DEFAULT_BACKEND_PORT}`);
    expect(devUrl).not.toBe(PRODUCTION_API_URL);
    expect(devUrl).not.toContain('10.215.212.209');
  });

  it('respects developer-configured EXPO_PUBLIC_API_BASE_URL', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.1.200:4000';
    const devUrl = resolveDevelopmentApiUrl();
    expect(devUrl).toBe('http://192.168.1.200:4000');
  });

  it('respects developer-configured EXPO_PUBLIC_DEV_LAN_IP', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    process.env.EXPO_PUBLIC_DEV_LAN_IP = '192.168.1.250';
    const devUrl = resolveDevelopmentApiUrl();
    expect(devUrl).toBe('http://192.168.1.250:4000');
  });

  it('resolves production explicitly to https://www.masterhrms.com when configured', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    expect(resolveEnvironment()).toBe('production');
    expect(getResolvedApiBaseUrl()).toBe('https://www.masterhrms.com');
  });

  it('staging requires explicit configuration value', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    process.env.EXPO_PUBLIC_STAGING_API_BASE_URL = 'https://staging.masterhrms.com';
    expect(resolveStagingApiUrl()).toBe('https://staging.masterhrms.com');
  });

  it('axios request interceptors do not overwrite baseURL or inject fake x-forwarded-host', async () => {
    const config: any = {
      headers: {},
      baseURL: 'http://192.168.1.176:4000',
    };

    // Run interceptor handlers directly
    const handlers = (apiClient.interceptors.request as any).handlers;
    expect(handlers.length).toBeGreaterThan(0);

    const requestHandler = handlers[0].fulfilled;
    const modifiedConfig = await requestHandler(config);

    // BaseURL must remain untouched
    expect(modifiedConfig.baseURL).toBe('http://192.168.1.176:4000');
    // Must NOT contain fabricated x-forwarded-host: localhost
    expect(modifiedConfig.headers['x-forwarded-host']).toBeUndefined();
    // Must contain valid client metadata
    expect(modifiedConfig.headers['x-client-platform']).toBe('mobile');
    expect(modifiedConfig.headers['x-mobile-app']).toBe('true');
  });
});
