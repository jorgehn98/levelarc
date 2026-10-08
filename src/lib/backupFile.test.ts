import { describe, expect, it } from 'vitest';

import { assertBackupFileSize, getBackupFileName, isBackupExportFile } from './backupFile';
import { BackupFormatError } from './backupValidation';

describe('backup file', () => {
  it('names the export after the local date', () => {
    expect(getBackupFileName(new Date(2026, 0, 5, 23, 59))).toBe('levelarc-backup-2026-01-05.json');
    expect(getBackupFileName(new Date(2026, 11, 31, 0, 0))).toBe('levelarc-backup-2026-12-31.json');
  });

  it('recognises only its own export files', () => {
    expect(isBackupExportFile('levelarc-backup-2026-01-05.json')).toBe(true);
    expect(isBackupExportFile('levelarc-backup-2026-01-05.json.tmp')).toBe(false);
    expect(isBackupExportFile('other-backup-2026-01-05.json')).toBe(false);
    expect(isBackupExportFile('gemma.gguf')).toBe(false);
  });

  it('rejects files above the size cap and lets unknown sizes through', () => {
    expect(() => assertBackupFileSize(50 * 1024 * 1024)).not.toThrow();
    expect(() => assertBackupFileSize(null)).not.toThrow();
    expect(() => assertBackupFileSize(undefined)).not.toThrow();

    let caught: unknown;
    try {
      assertBackupFileSize(50 * 1024 * 1024 + 1);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(BackupFormatError);
    expect((caught as BackupFormatError).reason).toBe('tooLarge');
  });
});
