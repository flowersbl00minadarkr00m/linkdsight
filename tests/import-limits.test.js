import { describe, expect, it } from 'vitest';
import { IMPORT_LIMITS, validateArchiveInput, validateZipMetadata } from '../src/import.js';

describe('LinkedIn ZIP import limits', () => {
  it('rejects the wrong file type and oversized archives before parsing', () => {
    expect(() => validateArchiveInput({ name: 'connections.csv', size: 100 })).toThrow(/ZIP export/i);
    expect(() => validateArchiveInput({ name: 'linkedin.zip', size: IMPORT_LIMITS.archiveBytes + 1 })).toThrow(/50 MB/i);
    expect(() => validateArchiveInput({ name: 'linkedin.zip', size: IMPORT_LIMITS.archiveBytes })).not.toThrow();
  });

  it('rejects excessive entry counts and declared expanded CSV sizes', () => {
    const entries = Array.from({ length: IMPORT_LIMITS.entries + 1 }, (_, index) => ({
      name: `file-${index}.txt`,
      dir: false,
      _data: { uncompressedSize: 1 }
    }));
    expect(() => validateZipMetadata(entries)).toThrow(/more than 200 files/i);
    expect(() => validateZipMetadata([{
      name: 'Connections.csv',
      dir: false,
      _data: { uncompressedSize: IMPORT_LIMITS.csvBytes + 1 }
    }])).toThrow(/expanded CSV limit/i);
  });
});
