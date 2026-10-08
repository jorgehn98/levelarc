import { describe, expect, it } from 'vitest';

import { getLegalUrl } from './links';

describe('legal links', () => {
  it('points to the page in the app language', () => {
    expect(getLegalUrl('es', 'privacy')).toBe('https://levelarc.app/privacy/');
    expect(getLegalUrl('es', 'terms')).toBe('https://levelarc.app/terms/');
    expect(getLegalUrl('en', 'privacy')).toBe('https://levelarc.app/en/privacy/');
    expect(getLegalUrl('en', 'terms')).toBe('https://levelarc.app/en/terms/');
  });
});
