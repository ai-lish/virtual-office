// Token Worker
// Receives { cmd: 'parse', records: [...] }
// Responds with { type: 'parsed', data: {...} }

self.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || !msg.cmd) return;

  if (msg.cmd === 'parse') {
    const records = msg.records || [];

    const metrics = { totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, avgTokensPerRecord: 0 };
    const byModel = {};
    const byApi = {};
    const daily = {};
    const hourly = {};
    const vlm = { totalCalls: 0, totalTokens: 0 };

    for (let i = 0; i < 24; i++) hourly[i] = 0;

    let cacheRead = 0;
    let cacheCreate = 0;

    records.forEach(r => {
      const input = r.inputUsageQuantity || 0;
      const output = r.outputUsageQuantity || 0;
      const total = r.totalUsageQuantity || 0;
      metrics.totalInputTokens += input;
      metrics.totalOutputTokens += output;
      metrics.totalTokens += total;

      // model
      const model = r.consumedModel || 'unknown';
      if (!byModel[model]) byModel[model] = { tokens: 0, count: 0, inputTokens: 0, outputTokens: 0 };
      byModel[model].tokens += total;
      byModel[model].count += 1;
      byModel[model].inputTokens += input;
      byModel[model].outputTokens += output;

      // api
      const api = r.consumedApi || 'unknown';
      if (!byApi[api]) byApi[api] = { tokens: 0, count: 0, inputTokens: 0, outputTokens: 0 };
      byApi[api].tokens += total;
      byApi[api].count += 1;
      byApi[api].inputTokens += input;
      byApi[api].outputTokens += output;

      // daily
      if (r.consumptionTime) {
        const day = r.consumptionTime.split('T')[0];
        if (!daily[day]) daily[day] = { tokens: 0, input: 0, output: 0, count: 0 };
        daily[day].tokens += total;
        daily[day].input += input;
        daily[day].output += output;
        daily[day].count += 1;

        // hourly
        const hour = parseInt(r.consumptionTime.split('T')[1].split(':')[0]);
        if (!isNaN(hour)) hourly[hour] += total;
      }

      // cache
      if (r.consumedApi && r.consumedApi.includes('cache-read')) cacheRead += total;
      if (r.consumedApi && r.consumedApi.includes('cache-create')) cacheCreate += total;

      // vlm
      if (r.consumedModel && r.consumedModel.toLowerCase().includes('vlm')) {
        vlm.totalCalls += 1;
        vlm.totalTokens += total;
      }
    });

    metrics.avgTokensPerRecord = records.length > 0 ? Math.round(metrics.totalTokens / records.length) : 0;

    // percentages
    const totalModelTokens = Object.values(byModel).reduce((s, m) => s + m.tokens, 0);
    Object.keys(byModel).forEach(k => { byModel[k].percentage = totalModelTokens > 0 ? `${((byModel[k].tokens / totalModelTokens) * 100).toFixed(1)}%` : '0.0%'; });

    const totalApiTokens = Object.values(byApi).reduce((s, a) => s + a.tokens, 0);
    Object.keys(byApi).forEach(k => { byApi[k].percentage = totalApiTokens > 0 ? `${((byApi[k].tokens / totalApiTokens) * 100).toFixed(1)}%` : '0.0%'; });

    const cacheTotal = cacheRead + cacheCreate;
    const cache = {
      cacheRead,
      cacheCreate,
      hitRate: cacheTotal > 0 ? cacheRead / cacheTotal : 0,
      hitRatePercentage: cacheTotal > 0 ? `${((cacheRead / cacheTotal) * 100).toFixed(1)}%` : '0.0%'
    };

    // daily array
    const dailyArr = Object.keys(daily).sort().map(d => ({ date: d, ...daily[d] }));
    const hourlyArr = Object.keys(hourly).map(h => ({ hour: parseInt(h), tokens: hourly[h] }));

    // vlm extras
    vlm.avgTokensPerCall = vlm.totalCalls > 0 ? Math.round(vlm.totalTokens / vlm.totalCalls) : 0;
    const peakHourEntry = hourlyArr.slice().sort((a,b)=>b.tokens-a.tokens)[0];
    vlm.peakHour = peakHourEntry ? peakHourEntry.hour : null;

    const parsed = {
      metrics,
      byModel,
      byApi,
      daily: dailyArr,
      hourly: hourlyArr,
      cache,
      vlm,
      totalRecords: records.length
    };

    self.postMessage({ type: 'parsed', data: parsed });
  }
});
