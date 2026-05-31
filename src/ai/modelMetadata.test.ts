import { describe, expect, it } from 'vitest';

import { MODEL_NAME, MODEL_SHA256, MODEL_SIZE_BYTES, formatModelSize } from './modelMetadata';

describe('modelMetadata', () => {
  it('matches the published Gemma GGUF metadata used by the final download validation', () => {
    expect(MODEL_NAME).toBe('gemma-4-E2B-it-Q4_K_M.gguf');
    expect(MODEL_SIZE_BYTES).toBe(3_106_736_256);
    expect(MODEL_SHA256).toBe('9378bc471710229ef165709b62e34bfb62231420ddaf6d729e727305b5b8672d');
  });

  it('formats the model size as user-facing decimal GB', () => {
    expect(formatModelSize('es')).toBe('3,1 GB');
    expect(formatModelSize('en')).toBe('3.1 GB');
  });
});
