const fs = require('fs');

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i+1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Read CSV
const csvData = fs.readFileSync('/tmp/token.csv', 'utf8');
const lines = csvData.trim().split('\n');
const headers = parseCSVLine(lines[0]);

console.log('Headers:', headers);
console.log('Total lines:', lines.length);

// Parse records
const records = [];
for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => row[h] = cols[idx] || '');
    records.push(row);
}

console.log('Parsed records:', records.length);

// Convert to token-log format
const tokenRecords = records.map((row, idx) => {
    // Parse time - format is "2026-03-22 20:00-21:00"
    let consumptionTime = null;
    if (row['Consumption time(UTC)']) {
        const timeStr = row['Consumption time(UTC)'];
        const match = timeStr.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):\d{2}-\d{2}:00$/);
        if (match) {
            consumptionTime = match[1] + 'T' + match[2] + ':00:00Z';
        }
    }
    
    return {
        id: 'tl_' + String(idx + 1).padStart(4, '0'),
        secretKeyName: row['Secret key name'] || 'default',
        consumedApi: row['Consumed API'] || 'unknown',
        consumedModel: row['Consumed model'] || 'unknown',
        amountSpent: parseFloat(row['Amount spent'] || 0),
        amountAfterVoucher: parseFloat(row['Amount After Voucher'] || 0),
        inputUsageQuantity: parseInt(row['Input usage quantity'] || 0),
        outputUsageQuantity: parseInt(row['Output usage quantity'] || 0),
        totalUsageQuantity: parseInt(row['Total usage quantity'] || 0),
        consumptionTime: consumptionTime,
        consumptionStatus: row['Consumption status'] || 'unknown',
        importBatch: 'batch_' + new Date().toISOString().slice(0,10).replace(/-/g,'')
    };
});

// Calculate summaries
let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheCreate = 0;
let modelCount = {};

tokenRecords.forEach(r => {
    totalInput += r.inputUsageQuantity || 0;
    totalOutput += r.outputUsageQuantity || 0;
    if (r.consumedApi === 'cache-read(Text API)') totalCacheRead += r.totalUsageQuantity || 0;
    if (r.consumedApi === 'cache-create(Text API)') totalCacheCreate += r.totalUsageQuantity || 0;
    if (r.consumedModel) {
        modelCount[r.consumedModel] = (modelCount[r.consumedModel] || 0) + (r.totalUsageQuantity || 0);
    }
});

// Group by date for daily summary
const dailySummary = {};
tokenRecords.forEach(r => {
    if (!r.consumptionTime) return;
    const date = r.consumptionTime.split('T')[0];
    if (!dailySummary[date]) {
        dailySummary[date] = { totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, recordCount: 0 };
    }
    dailySummary[date].totalInputTokens += r.inputUsageQuantity || 0;
    dailySummary[date].totalOutputTokens += r.outputUsageQuantity || 0;
    dailySummary[date].totalTokens += r.totalUsageQuantity || 0;
    dailySummary[date].recordCount++;
});

const log = {
    meta: {
        lastUpdated: new Date().toISOString(),
        lastCsvImport: new Date().toISOString(),
        sourceFile: 'token.csv',
        totalRecords: tokenRecords.length,
        version: '1.0'
    },
    records: tokenRecords,
    lastId: tokenRecords.length,
    dailySummary: dailySummary,
    weeklySummary: {},
    monthlySummary: {},
    vlmUsage: { 'coding-plan-vlm': { totalCalls: 0, totalTokens: 0 } }
};

fs.writeFileSync('token-log.json', JSON.stringify(log, null, 2));
console.log('Written token-log.json with', tokenRecords.length, 'records');
console.log('Total input tokens:', totalInput.toLocaleString());
console.log('Total output tokens:', totalOutput.toLocaleString());
console.log('Cache read tokens:', totalCacheRead.toLocaleString());
console.log('Cache create tokens:', totalCacheCreate.toLocaleString());
console.log('Cache hit rate:', Math.round((totalCacheRead / (totalCacheRead + totalCacheCreate)) * 100) + '%');
console.log('Models:', Object.entries(modelCount).map(([m, t]) => m + ': ' + t.toLocaleString()).join(', '));
