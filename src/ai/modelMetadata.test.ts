import { describe, expect, it } from 'vitest';

import {
  MODEL_NAME,
  MODEL_SIZE_BYTES,
  MODEL_STAMP_NAME,
  MODEL_URL,
  formatModelRequiredSpace,
  formatModelSize,
  hasEnoughSpaceForModel,
} from './modelMetadata';

describe('modelMetadata', () => {
  it('matches the published Gemma GGUF metadata used by the final download validation', () => {
    expect(MODEL_NAME).toBe('gemma-4-E2B-it-Q4_K_M.gguf');
    expect(MODEL_STAMP_NAME).toBe('gemma-4-E2B-it-Q4_K_M.gguf.ok');
    expect(MODEL_SIZE_BYTES).toBe(3_106_736_256);
  });

  it('downloads from an immutable revision, never from a moving branch', () => {
    // Revisión cuyo GGUF mide exactamente MODEL_SIZE_BYTES (comprobado contra la API de Hugging Face).
    expect(MODEL_URL).toBe(
      'https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/739965d73654c0ead8020786aa998fc813070087/gemma-4-E2B-it-Q4_K_M.gguf',
    );
    expect(MODEL_URL).not.toContain('/resolve/main/');
  });

  it('formats the model size as user-facing decimal GB', () => {
    expect(formatModelSize('es')).toBe('3,1 GB');
    expect(formatModelSize('en')).toBe('3.1 GB');
  });

  it('requires the model size plus a safety margin of free space', () => {
    expect(hasEnoughSpaceForModel(3_606_736_256)).toBe(true);
    expect(hasEnoughSpaceForModel(3_606_736_255)).toBe(false);
    // Cabe el fichero pero no el margen.
    expect(hasEnoughSpaceForModel(3_200_000_000)).toBe(false);
    expect(formatModelRequiredSpace('es')).toBe('3,6 GB');
    expect(formatModelRequiredSpace('en')).toBe('3.6 GB');
  });

  it('does not block the download on an unreliable free-space reading', () => {
    expect(hasEnoughSpaceForModel(Number.NaN)).toBe(true);
    expect(hasEnoughSpaceForModel(-1)).toBe(true);
  });
});
