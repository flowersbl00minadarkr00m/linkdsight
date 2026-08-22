/**
 * Import workspace: parse LinkedIn export ZIP entirely in the browser.
 * Uses bundled JSZip + PapaParse – no runtime CDN.
 */

import JSZip from 'jszip';
import Papa from 'papaparse';

export const IMPORT_LIMITS = Object.freeze({
  archiveBytes: 50 * 1024 * 1024,
  entries: 200,
  csvBytes: 25 * 1024 * 1024,
  totalCsvBytes: 100 * 1024 * 1024,
  rowsPerCsv: 250_000,
  totalRows: 500_000
});

export class ImportLimitError extends Error {}

export function validateArchiveInput(input) {
  const name = typeof input?.name === 'string' ? input.name : '';
  const size = typeof input?.size === 'number' ? input.size : input?.byteLength;
  if (name && !/\.zip$/i.test(name)) throw new ImportLimitError('Choose a LinkedIn ZIP export.');
  if (typeof size === 'number' && size > IMPORT_LIMITS.archiveBytes) {
    throw new ImportLimitError('The ZIP archive is larger than the 50 MB import limit.');
  }
}

function declaredUncompressedBytes(entry) {
  const value = Number(entry?._data?.uncompressedSize);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function validateZipMetadata(entries) {
  if (entries.length > IMPORT_LIMITS.entries) {
    throw new ImportLimitError(`The ZIP contains more than ${IMPORT_LIMITS.entries} files.`);
  }
  let totalCsvBytes = 0;
  for (const entry of entries) {
    if (entry.dir || !entry.name.toLowerCase().endsWith('.csv')) continue;
    const bytes = declaredUncompressedBytes(entry);
    if (bytes === null) continue;
    if (bytes > IMPORT_LIMITS.csvBytes) throw new ImportLimitError(`${entry.name} exceeds the 25 MB expanded CSV limit.`);
    totalCsvBytes += bytes;
    if (totalCsvBytes > IMPORT_LIMITS.totalCsvBytes) {
      throw new ImportLimitError('The expanded CSV files exceed the 100 MB combined import limit.');
    }
  }
}

/**
 * Parse a CSV string via PapaParse, with options.
 * @returns {Array<Object>} Array of objects (header:true).
 */
export function parseCSV(text, options = {}) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    ...options
  });
  return result.data;
}

/**
 * Parse a Connections.csv string, skipping the first 3 header/metadata rows.
 */
export function parseConnectionsCSV(text) {
  const lines = text.split(/\r?\n/);
  // Skip first 3 lines (LinkedIn metadata headers)
  const dataLines = lines.slice(3).join('\n');
  return parseCSV(dataLines);
}

/**
 * Get text from a ZIP entry, handling encoding.
 */
async function entryText(entry) {
  if (typeof entry === 'string') return entry;
  return await entry.async('string');
}

/**
 * Parse a LinkedIn export ZIP file.
 *
 * @param {File|ArrayBuffer|Uint8Array} zipInput - ZIP file from drag/drop or file input.
 * @returns {Promise<Object>} { parsed: {...csvName: Array}, report: {found, missing, malformed} }
 */
export async function parseExportZip(zipInput) {
  validateArchiveInput(zipInput);
  const zip = await JSZip.loadAsync(zipInput);
  validateZipMetadata(Object.values(zip.files));

  /** Map of standardized CSV names to possible filenames in ZIP */
  const FILE_MAP = {
    connections: 'Connections.csv',
    messages: 'messages.csv',
    shares: 'Shares.csv',
    comments: 'Comments.csv',
    reactions: 'Reactions.csv',
    invitations: 'Invitations.csv',
    positions: 'Positions.csv',
    skills: 'Skills.csv',
    certifications: 'Certifications.csv',
    endorsementsReceived: 'Endorsement_Received_Info.csv',
    learning: 'Learning.csv',
    profile: 'Profile.csv'
  };

  // Also search for files in subdirectories
  const allFiles = [];
  zip.forEach((relativePath, entry) => {
    if (!entry.dir && relativePath.toLowerCase().endsWith('.csv')) {
      allFiles.push({ path: relativePath, fileName: relativePath.split('/').pop(), entry });
    }
  });

  const parsed = {};
  const found = [];
  const missing = [];
  let totalCsvBytes = 0;
  let totalRows = 0;

  for (const [key, expectedName] of Object.entries(FILE_MAP)) {
    // Find matching file
    const match = allFiles.find(f =>
      f.fileName.localeCompare(expectedName, undefined, { sensitivity: 'base' }) === 0
    );

    if (!match) {
      missing.push(key);
      continue;
    }

    try {
      const text = await entryText(match.entry);
      if (!text || text.trim().length === 0) {
        missing.push(key);
        continue;
      }
      const textBytes = new TextEncoder().encode(text).byteLength;
      if (textBytes > IMPORT_LIMITS.csvBytes) throw new ImportLimitError(`${match.path} exceeds the 25 MB expanded CSV limit.`);
      totalCsvBytes += textBytes;
      if (totalCsvBytes > IMPORT_LIMITS.totalCsvBytes) throw new ImportLimitError('The expanded CSV files exceed the 100 MB combined import limit.');
      const approximateRows = text.split(/\r?\n/).length;
      if (approximateRows > IMPORT_LIMITS.rowsPerCsv) throw new ImportLimitError(`${match.path} contains too many rows.`);

      let records;
      if (key === 'connections') {
        records = parseConnectionsCSV(text);
      } else {
        records = parseCSV(text);
      }

      if (records.length === 0) {
        missing.push(key);
        continue;
      }
      totalRows += records.length;
      if (totalRows > IMPORT_LIMITS.totalRows) throw new ImportLimitError('The LinkedIn export contains more than 500,000 imported rows.');

      parsed[key] = records;
      found.push({ name: key, count: records.length, path: match.path });
    } catch (err) {
      if (err instanceof ImportLimitError) throw err;
      console.warn(`Failed to parse ${match.path}:`, err);
      missing.push(key);
    }
  }

  const report = {
    found,
    missing,
    totalFiles: allFiles.filter(f => f.fileName.toLowerCase().endsWith('.csv')).length,
    note: missing.length > 0
      ? `Some expected CSV files were not found or could not be parsed: ${missing.join(', ')}. Views depending on those files will be limited.`
      : 'All expected CSV files found and parsed.'
  };

  return { parsed, report };
}

export default { parseExportZip, parseCSV, parseConnectionsCSV, validateArchiveInput, validateZipMetadata };
