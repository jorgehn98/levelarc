import { describe, expect, it } from 'vitest';

import { resolveInitialLanguage } from './deviceLanguage';

describe('initial language', () => {
  it('uses English for any English device locale', () => {
    expect(resolveInitialLanguage(null, 'en')).toBe('en');
    expect(resolveInitialLanguage(null, 'en-US')).toBe('en');
    expect(resolveInitialLanguage(null, 'en_GB')).toBe('en');
    expect(resolveInitialLanguage(null, 'EN-au')).toBe('en');
  });

  it('falls back to Spanish for every other locale', () => {
    expect(resolveInitialLanguage(null, 'es-ES')).toBe('es');
    expect(resolveInitialLanguage(null, 'fr-FR')).toBe('es');
    expect(resolveInitialLanguage(null, 'enm')).toBe('es');
    expect(resolveInitialLanguage(null, '')).toBe('es');
    expect(resolveInitialLanguage(null, undefined)).toBe('es');
  });

  it('lets a stored preference win over the device', () => {
    expect(resolveInitialLanguage('es', 'en-US')).toBe('es');
    expect(resolveInitialLanguage('en', 'es-ES')).toBe('en');
  });

  it('ignores a stored value that is not a supported language', () => {
    expect(resolveInitialLanguage('fr', 'en-US')).toBe('en');
    expect(resolveInitialLanguage('', 'es-MX')).toBe('es');
  });
});
