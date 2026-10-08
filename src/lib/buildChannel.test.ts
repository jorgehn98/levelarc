import { describe, expect, it } from 'vitest';

import { isInternalChannel } from './buildChannel';

describe('isInternalChannel', () => {
  it('treats development mode as internal whatever the channel', () => {
    expect(isInternalChannel(true, null)).toBe(true);
    expect(isInternalChannel(true, 'production')).toBe(true);
  });

  it('treats the QA channels as internal', () => {
    expect(isInternalChannel(false, 'preview')).toBe(true);
    expect(isInternalChannel(false, 'development')).toBe(true);
  });

  it('treats production as a user build', () => {
    expect(isInternalChannel(false, 'production')).toBe(false);
  });

  it('fails closed when a release build has no usable channel', () => {
    // Android entrega cadena vacía, no null, cuando el canal no está configurado.
    expect(isInternalChannel(false, '')).toBe(false);
    expect(isInternalChannel(false, null)).toBe(false);
    expect(isInternalChannel(false, undefined)).toBe(false);
    expect(isInternalChannel(false, 'Preview ')).toBe(false);
  });
});
