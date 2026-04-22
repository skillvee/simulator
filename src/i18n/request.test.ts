import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntlError, IntlErrorCode } from 'next-intl';

// Mock next-intl/server before importing the module
vi.mock('next-intl/server', () => ({
  getRequestConfig: (fn: (...args: unknown[]) => unknown) => fn
}));

// Mock the routing module
vi.mock('./routing', () => ({
  routing: {
    locales: ['en', 'es'],
    defaultLocale: 'en'
  }
}));

describe('i18n missing key fallback behavior', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset modules to ensure clean state
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Use Object.defineProperty to properly set NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true,
      writable: true,
      enumerable: true
    });
    vi.resetModules();
  });

  it('should throw error for missing keys in test environment', async () => {
    // Use Object.defineProperty to modify NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      configurable: true,
      writable: true,
      enumerable: true
    });

    // Mock the message files
    vi.doMock('../messages/es.json', () => ({
      default: { test: { existingKey: 'valor' } }
    }));
    vi.doMock('../messages/en.json', () => ({
      default: { test: { existingKey: 'value', missingKey: 'Missing Value' } }
    }));

    // Import the config after setting NODE_ENV and mocks
    const getRequestConfig = (await import('./request')).default;
    const config = await getRequestConfig({ requestLocale: Promise.resolve('es') });

    // Simulate a missing key error
    const error: IntlError = {
      name: 'IntlError',
      code: IntlErrorCode.MISSING_MESSAGE,
      message: 'Missing message: es.test.missingKey',
      originalMessage: 'Missing message: es.test.missingKey'
    };

    // onError should throw in test environment
    expect(() => config.onError?.(error)).toThrow('Missing message: es.test.missingKey');

    // getMessageFallback should return error indicator
    const fallbackMessage = config.getMessageFallback?.({
      namespace: 'test',
      key: 'missingKey',
      error
    });

    expect(fallbackMessage).toBe('[Missing: test.missingKey]');
  });

  it('should throw error for missing keys in development environment', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      configurable: true,
      writable: true,
      enumerable: true
    });

    vi.doMock('../messages/es.json', () => ({
      default: { test: { existingKey: 'valor' } }
    }));
    vi.doMock('../messages/en.json', () => ({
      default: { test: { existingKey: 'value', missingKey: 'Missing Value' } }
    }));

    const getRequestConfig = (await import('./request')).default;
    const config = await getRequestConfig({ requestLocale: Promise.resolve('es') });

    const error: IntlError = {
      name: 'IntlError',
      code: IntlErrorCode.MISSING_MESSAGE,
      message: 'Missing message: es.test.missingKey',
      originalMessage: 'Missing message: es.test.missingKey'
    };

    // onError should throw in development
    expect(() => config.onError?.(error)).toThrow('Missing message: es.test.missingKey');

    // getMessageFallback should return error indicator
    const fallbackMessage = config.getMessageFallback?.({
      namespace: 'test',
      key: 'missingKey',
      error
    });

    expect(fallbackMessage).toBe('[Missing: test.missingKey]');
  });

  it('should not throw but warn for missing keys in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
      writable: true,
      enumerable: true
    });

    // Mock console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.doMock('../messages/es.json', () => ({
      default: { test: { existingKey: 'valor' } }
    }));
    vi.doMock('../messages/en.json', () => ({
      default: { test: { existingKey: 'value', missingKey: 'Missing Value' } }
    }));

    const getRequestConfig = (await import('./request')).default;
    const config = await getRequestConfig({ requestLocale: Promise.resolve('es') });

    const error: IntlError = {
      name: 'IntlError',
      code: IntlErrorCode.MISSING_MESSAGE,
      message: 'Missing message: es.test.missingKey',
      originalMessage: 'Missing message: es.test.missingKey'
    };

    // onError should not throw in production, only warn
    expect(() => config.onError?.(error)).not.toThrow();
    expect(consoleWarnSpy).toHaveBeenCalledWith('[i18n] Translation error: Missing message: es.test.missingKey');

    consoleWarnSpy.mockRestore();
  });

  it('should fall back to English message when Spanish key is missing in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
      writable: true,
      enumerable: true
    });

    // Mock console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock the message imports
    vi.doMock('../messages/es.json', () => ({
      default: {
        common: {
          submit: 'Enviar',
          // 'cancel' is missing - should fallback to English
        }
      }
    }));

    vi.doMock('../messages/en.json', () => ({
      default: {
        common: {
          submit: 'Submit',
          cancel: 'Cancel'
        }
      }
    }));

    const getRequestConfig = (await import('./request')).default;
    const config = await getRequestConfig({ requestLocale: Promise.resolve('es') });

    // Test fallback to English
    const fallbackMessage = config.getMessageFallback?.({
      namespace: 'common',
      key: 'cancel',
      error: {
        name: 'IntlError',
        code: IntlErrorCode.MISSING_MESSAGE,
        message: 'Missing message',
        originalMessage: 'Missing message'
      }
    });

    expect(fallbackMessage).toBe('Cancel');
    expect(consoleWarnSpy).toHaveBeenCalledWith('[i18n] Missing translation for "common.cancel" in locale "es", using English fallback');

    consoleWarnSpy.mockRestore();
  });

  it('should return key when no English fallback exists in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
      writable: true,
      enumerable: true
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock empty message files
    vi.doMock('../messages/es.json', () => ({
      default: {}
    }));

    vi.doMock('../messages/en.json', () => ({
      default: {}
    }));

    const getRequestConfig = (await import('./request')).default;
    const config = await getRequestConfig({ requestLocale: Promise.resolve('es') });

    const fallbackMessage = config.getMessageFallback?.({
      namespace: 'nonexistent',
      key: 'missingKey',
      error: {
        name: 'IntlError',
        code: IntlErrorCode.MISSING_MESSAGE,
        message: 'Missing message',
        originalMessage: 'Missing message'
      }
    });

    expect(fallbackMessage).toBe('nonexistent.missingKey');
    expect(consoleWarnSpy).toHaveBeenCalledWith('[i18n] Missing translation for "nonexistent.missingKey" with no English fallback');

    consoleWarnSpy.mockRestore();
  });

  it('should not load English messages when locale is already English', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
      writable: true,
      enumerable: true
    });

    vi.doMock('../messages/en.json', () => ({
      default: { test: { key: 'value' } }
    }));

    const getRequestConfig = (await import('./request')).default;
    const config = await getRequestConfig({ requestLocale: Promise.resolve('en') });

    // When locale is English, defaultMessages should not be loaded
    // This is an optimization to avoid loading the same messages twice

    // Test that fallback still works (returns the key)
    const fallbackMessage = config.getMessageFallback?.({
      key: 'missingKey',
      error: {
        name: 'IntlError',
        code: IntlErrorCode.MISSING_MESSAGE,
        message: 'Missing message',
        originalMessage: 'Missing message'
      }
    });

    expect(fallbackMessage).toBe('missingKey');
  });
});