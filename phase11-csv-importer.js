/**
 * Phase 11: Minimax CSV Importer
 * Downloads token CSV from Google Drive and imports into token-log.json
 */

const fs = require('fs');
const path = require('path');

// Google Drive folder ID for Minimax Token
const DRIVE_FOLDER_ID = '1k2CbG1Z2lvOLl-szMt8YT5P5NaWD0T5Y';

// CSV column mapping
const CSV_COLUMNS = {
  'Secret key name': 'secretKeyName',
  'Consumed API': 'consumedApi',
  'Consumed model': 'consumedModel',
  'Amount spent': 'amountSpent',
  'Amount After Voucher': 'amountAfterVoucher',
  'Input usage quantity': 'inputUsageQuantity',
  'Output usage quantity': 'outputUsageQuantity',
  'Total usage quantity': 'totalUsageQuantity',
  'Consumption time(UTC)': 'consumptionTime',
  'Consumption status': 'consumptionStatus'
};

class MinimaxCsvImporter {
  constructor() {
    this.tokenLogPath = path.join(__dirname, 'token-log.json');
    this.localCsvPath = path.join(__dirname, 'data', 'token.csv');
    this.drive = null;
  }

  /**
   * Initialize Google Drive API client
   */
  async initGoogleDrive() {
    // Lazy load googleapis only when needed
    let google;
    try {
      google = require('googleapis');
    } catch (e) {
      throw new Error('googleapis module not installed. Run: npm install googleapis');
    }
    
    // Try to use Application Default Credentials or configured API key
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    
    if (!apiKey) {
      throw new Error('GOOGLE_DRIVE_API_KEY environment variable not set');
    }

    this.drive = google.drive({
      version: 'v3',
      auth: apiKey
    });
  }

  /**
   * List files in a Google Drive folder
   */
  async listFilesInFolder(folderId) {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, modifiedTime)',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true
      });
      return response.data.files || [];
    } catch (error) {
      console.error('Error listing files:', error.message);
      throw error;
    }
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, {
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading file:', error.message);
      throw error;
    }
  }

  /**
   * Download the latest token.csv from Google Drive
   */
  async downloadLatest() {
    await this.initGoogleDrive();
    
    const files = await this.listFilesInFolder(DRIVE_FOLDER_ID);
    console.log(`Found ${files.length} files in folder`);
    
    // Find token.csv
    const tokenCsv = files.find(f => f.name === 'token.csv');
    if (!tokenCsv) {
      throw new Error('token.csv not found in Google Drive folder');
    }
    
    console.log(`Found token.csv (${tokenCsv.id}), downloading...`);
    
    // Download content
    const content = await this.downloadFile(tokenCsv.id);
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.localCsvPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save locally
    fs.writeFileSync(this.localCsvPath, content);
    console.log(`Saved to ${this.localCsvPath}`);
    
    return { file: tokenCsv, path: this.localCsvPath };
  }

  /**
   * Parse CSV content into records
   */
  parseCSV(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }
    
    // Parse headers - handle quoted CSV
    const headers = this.parseCSVLine(lines[0]);
    
    // Map headers to our field names
    const headerMap = {};
    headers.forEach((header, idx) => {
      const normalizedHeader = header.trim().replace(/"/g, '');
      if (CSV_COLUMNS[normalizedHeader]) {
        headerMap[idx] = CSV_COLUMNS[normalizedHeader];
      }
    });
    
    // Parse data rows
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      const record = {};
      
      values.forEach((value, idx) => {
        if (headerMap[idx]) {
          const key = headerMap[idx];
          let processedValue = value.trim().replace(/"/g, '');
          
          // Type conversion
          if (key === 'amountSpent' || key === 'amountAfterVoucher' ||
              key === 'inputUsageQuantity' || key === 'outputUsageQuantity' ||
              key === 'totalUsageQuantity') {
            processedValue = isNaN(processedValue) ? 0 : Number(processedValue);
          }
          
          record[key] = processedValue;
        }
      });
      
      // Parse timestamp to ISO format
      if (record.consumptionTime) {
        const date = new Date(record.consumptionTime);
        if (!isNaN(date.getTime())) {
          record.consumptionTime = date.toISOString();
        }
      }
      
      records.push(record);
    }
    
    return records;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    return values;
  }

  /**
   * Read existing token log
   */
  readTokenLog() {
    if (!fs.existsSync(this.tokenLogPath)) {
      return {
        meta: { lastUpdated: null, lastCsvImport: null, sourceFile: 'token.csv', totalRecords: 0, version: '1.0' },
        records: [],
        lastId: 0,
        dailySummary: {},
        weeklySummary: {},
        monthlySummary: {},
        vlmUsage: {}
      };
    }
    return JSON.parse(fs.readFileSync(this.tokenLogPath, 'utf-8'));
  }

  /**
   * Write token log
   */
  writeTokenLog(data) {
    fs.writeFileSync(this.tokenLogPath, JSON.stringify(data, null, 2));
  }

  /**
   * Perform incremental import - only add new records
   */
  async incrementalImport(newRecords) {
    const existing = this.readTokenLog();
    
    // Build set of existing consumption times for deduplication
    const existingTimes = new Set(existing.records.map(r => r.consumptionTime));
    
    // Filter only truly new records
    const uniqueNew = newRecords.filter(r => {
      if (!r.consumptionTime) return false;
      return !existingTimes.has(r.consumptionTime);
    });
    
    if (uniqueNew.length === 0) {
      console.log('No new records to import');
      return { added: 0, skipped: newRecords.length, total: existing.records.length };
    }
    
    // Assign IDs to new records
    let currentId = existing.lastId || 0;
    uniqueNew.forEach(record => {
      currentId++;
      record.id = `tl_${String(currentId).padStart(6, '0')}`;
    });
    
    // Merge records
    existing.records = [...existing.records, ...uniqueNew];
    existing.meta.totalRecords = existing.records.length;
    existing.meta.lastUpdated = new Date().toISOString();
    existing.meta.lastCsvImport = new Date().toISOString();
    existing.lastId = currentId;
    
    // Save first
    this.writeTokenLog(existing);
    
    console.log(`Imported ${uniqueNew.length} new records (total: ${existing.records.length})`);
    
    return { 
      added: uniqueNew.length, 
      skipped: newRecords.length - uniqueNew.length, 
      total: existing.records.length 
    };
  }

  /**
   * Full import - replaces all data
   */
  async fullImport(newRecords) {
    const existing = this.readTokenLog();
    
    // Assign new IDs
    let currentId = 0;
    const records = newRecords.map((record, idx) => {
      currentId++;
      record.id = `tl_${String(currentId).padStart(6, '0')}`;
      return record;
    });
    
    existing.records = records;
    existing.meta.totalRecords = records.length;
    existing.meta.lastUpdated = new Date().toISOString();
    existing.meta.lastCsvImport = new Date().toISOString();
    existing.lastId = currentId;
    
    this.writeTokenLog(existing);
    
    console.log(`Full import: ${records.length} records`);
    
    return { total: records.length };
  }

  /**
   * Main import workflow
   */
  async run(options = {}) {
    const { full = false } = options;
    
    try {
      console.log('=== Phase 11 CSV Import Started ===');
      
      // Download latest CSV
      console.log('Step 1: Downloading from Google Drive...');
      const { path: csvPath } = await this.downloadLatest();
      
      // Read CSV content
      console.log('Step 2: Parsing CSV...');
      const content = fs.readFileSync(csvPath, 'utf-8');
      const records = this.parseCSV(content);
      console.log(`  Parsed ${records.length} records`);
      
      // Import
      console.log('Step 3: Importing records...');
      let result;
      if (full) {
        result = await this.fullImport(records);
      } else {
        result = await this.incrementalImport(records);
      }
      
      console.log('=== Import Complete ===');
      console.log(`  Added: ${result.added}`);
      console.log(`  Skipped: ${result.skipped}`);
      console.log(`  Total: ${result.total}`);
      
      return result;
      
    } catch (error) {
      console.error('Import failed:', error.message);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const importer = new MinimaxCsvImporter();
  const args = process.argv.slice(2);
  const full = args.includes('--full') || args.includes('-f');
  
  importer.run({ full }).then(result => {
    console.log('Done:', result);
    process.exit(0);
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { MinimaxCsvImporter };
