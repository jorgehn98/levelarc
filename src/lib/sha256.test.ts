import { describe, expect, it } from 'vitest';

import { Sha256 } from './sha256';

const encoder = new TextEncoder();

function hash(text: string) {
  return new Sha256().update(encoder.encode(text)).digestHex();
}

describe('Sha256', () => {
  it('hashes known vectors', () => {
    expect(hash('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(hash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('supports incremental updates', () => {
    const incremental = new Sha256()
      .update(encoder.encode('a'))
      .update(encoder.encode('b'))
      .update(encoder.encode('c'))
      .digestHex();

    expect(incremental).toBe(hash('abc'));
  });
});
