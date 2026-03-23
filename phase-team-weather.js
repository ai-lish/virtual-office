/**
 * Team Weather & Mood Report Module
 * 心情天氣預報 - 團隊天氣圖
 * 
 * 結合團隊成員心情 + 實際天氣 создавая "團隊天氣圖"
 * 
 * 命令:
 * !weather - 查看團隊天氣圖
 * !weather today - 今日天氣
 * !weather forecast - 預報
 * !weather set [城市] - 設定位置
 */

const fs = require('fs');
const path = require('path');

const WEATHER_DATA_PATH = path.join(__dirname, 'weather-data.json');

// 獲取天氣數據 (使用 wttr.in API - 免費無需 API Key)
async function fetchWeather(location = 'Hong_Kong') {
  try {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
      
      const req = https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              success: true,
              current: {
                temp_C: json.current_condition[0].temp_C,
                weatherDesc: json.current_condition[0].weatherDesc[0].value,
                humidity: json.current_condition[0].humidity[0],
                windSpeed: json.current_condition[0].windspeedKmph[0],
                feelsLike: json.current_condition[0].FeelsLikeC
              },
              forecast: json.weather.slice(0, 3).map(day => ({
                date: day.date,
                maxTemp: day.maxtempC,
                minTemp: day.mintempC,
                avgTemp: day.avgtempC,
                sunrise: day.astronomy[0]?.sunrise || '',
                sunset: day.astronomy[0]?.sunset || ''
              }))
            });
          } catch (e) {
            resolve({ success: false, error: e.message });
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ success: false, error: 'timeout' });
      });
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// 獲取默認數據
function getDefaultData() {
  return {
    location: 'Hong_Kong',
    users: {},  // userId -> location mapping
    lastFetch: null,
    cache: null
  };
}

// 加載數據
function loadData() {
  try {
    if (fs.existsSync(WEATHER_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(WEATHER_DATA_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[Weather] 載入數據失敗:', e.message);
  }
  return getDefaultData();
}

// 保存數據
function saveData(data) {
  try {
    fs.writeFileSync(WEATHER_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[Weather] 保存數據失敗:', e.message);
  }
}

// 獲取天氣表情
function getWeatherEmoji(temp, condition) {
  const t = parseInt(temp);
  const cond = condition.toLowerCase();
  
  if (cond.includes('rain') || cond.includes('drizzle')) return '🌧️';
  if (cond.includes('thunder')) return '⛈️';
  if (cond.includes('snow')) return '❄️';
  if (cond.includes('cloud') || cond.includes('overcast')) return '☁️';
  if (cond.includes('fog') || cond.includes('mist')) return '🌫️';
  if (t >= 30) return '🔥';
  if (t >= 25) return '☀️';
  if (t >= 20) return '🌤️';
  if (t >= 15) return '⛅';
  return '🥶';
}

// 獲取心情天氣映射
function getMoodWeatherEmoji(mood) {
  const moodMap = {
    1: '⛈️',  // 心情很差 = 暴風雨
    2: '🌧️',  // 心情不好 = 下雨
    3: '⛅',  // 普通 = 多雲
    4: '🌤️',  // 不錯 = 晴朗
    5: '☀️'   // 超好 = 陽光普照
  };
  return moodMap[mood] || '⛅';
}

// 處理天氣命令
async function handleWeatherCommand(message, args, phase6Data = null) {
  const subCommand = args[0]?.toLowerCase();
  const data = loadData();

  // !weather - 顯示團隊天氣圖
  if (!subCommand || subCommand === 'today' || subCommand === 'team') {
    // 獲取天氣
    let weather;
    if (data.cache && data.lastFetch && (Date.now() - data.lastFetch < 10 * 60 * 1000)) {
      weather = data.cache; // 使用緩存 (10分鐘內)
    } else {
      weather = await fetchWeather(data.location);
      if (weather.success) {
        data.cache = weather;
        data.lastFetch = Date.now();
        saveData(data);
      }
    }

    if (!weather || !weather.success) {
      await message.channel.send(`🌤️ **團隊天氣圖**

目前無法獲取天氣數據。

**設定位置**:
\`!weather set [城市]\` - 設定位置
例如: \`!weather set Hong Kong\` 或 \`!weather set Tokyo\``);
      return;
    }

    // 構建團隊天氣圖
    const weatherEmoji = getWeatherEmoji(weather.current.temp_C, weather.current.weatherDesc);
    
    let report = `🌤️ **團隊天氣圖** - ${data.location}\n\n`;
    
    // 實際天氣
    report += `**🌡️ 實際天氣**\n`;
    report += `${weatherEmoji} ${weather.current.temp_C}°C (體感 ${weather.current.feelsLike}°C)\n`;
    report += `💧 濕度: ${weather.current.humidity}%\n`;
    report += `💨 風速: ${weather.current.windSpeed} km/h\n`;
    report += `📝 ${weather.current.weatherDesc}\n\n`;

    // 團隊心情 (如果 Phase 6 數據可用)
    if (phase6Data && phase6Data.mood && phase6Data.mood.entries) {
      const today = new Date().toISOString().split('T')[0];
      const todayMoods = phase6Data.mood.entries[today] || {};
      const moodEntries = Object.values(todayMoods);
      
      if (moodEntries.length > 0) {
        const avgMood = moodEntries.reduce((sum, e) => sum + e.mood, 0) / moodEntries.length;
        const moodEmoji = getMoodWeatherEmoji(Math.round(avgMood));
        
        report += `**😊 團隊心情** (${moodEntries.length} 人匯報)\n`;
        report += `${moodEmoji} 平均: ${avgMood.toFixed(1)}/5\n`;
        
        // 心情趨勢
        const trend = avgMood >= 4 ? '上升 📈' : avgMood >= 3 ? '穩定' : '下降 📉';
        report += `📊 趨勢: ${trend}\n\n`;
        
        // 個別成員心情
        report += `**成員心情**:\n`;
        for (const [userId, entry] of Object.entries(todayMoods)) {
          const memberEmoji = getMoodWeatherEmoji(entry.mood);
          const moodLabel = ['', '辛苦', '幾辛苦', '普通', '幾開心', '超開心'][entry.mood] || '普通';
          report += `${memberEmoji} <@${userId}>: ${moodLabel}`;
          if (entry.note) report += ` (${entry.note})`;
          report += '\n';
        }
      } else {
        report += `**😊 團隊心情**\n`;
        report += `暫時未有隊友匯報心情\n`;
        report += `使用 \`!mood [1-5]\` 匯報今日心情\n\n`;
      }
    } else {
      report += `**😊 團隊心情**\n`;
      report += `使用 \`!mood [1-5]\` 匯報今日心情\n\n`;
    }

    // 預告
    if (weather.forecast && weather.forecast.length > 0) {
      report += `**🔮 預報**\n`;
      for (const day of weather.forecast.slice(0, 3)) {
        const date = new Date(day.date);
        const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
        const dayEmoji = getWeatherEmoji(day.avgTemp, '');
        report += `${day.date} (週${dayName}): ${dayEmoji} ${day.minTemp}°C ~ ${day.maxTemp}°C\n`;
      }
    }

    report += `\n---\n💡 使用 \`!weather set [城市]\` 設定位置`;

    await message.channel.send(report);
    return;
  }

  // !weather forecast
  if (subCommand === 'forecast' || subCommand === '預報') {
    let weather;
    if (data.cache && data.lastFetch && (Date.now() - data.lastFetch < 30 * 60 * 1000)) {
      weather = data.cache;
    } else {
      weather = await fetchWeather(data.location);
      if (weather.success) {
        data.cache = weather;
        data.lastFetch = Date.now();
        saveData(data);
      }
    }

    if (!weather || !weather.success) {
      await message.channel.send('❌ 無法獲取天氣預報');
      return;
    }

    let forecast = `🔮 **${data.location} 天氣預報**\n\n`;
    
    for (const day of weather.forecast) {
      const date = new Date(day.date);
      const dayName = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
      const dayEmoji = getWeatherEmoji(day.avgTemp, '');
      
      forecast += `**${day.date} ${dayName}** ${dayEmoji}\n`;
      forecast += `   🌡️ ${day.minTemp}°C ~ ${day.maxTemp}°C (平均 ${day.avgTemp}°C)\n`;
      forecast += `   🌅 ${day.sunrise} | 🌇 ${day.sunset}\n\n`;
    }

    await message.channel.send(forecast);
    return;
  }

  // !weather set [城市]
  if (subCommand === 'set' || subCommand === 'location') {
    const location = args.slice(1).join(' ');
    if (!location) {
      await message.channel.send(`📍 當前位置: ${data.location}\n\n用法: \`!weather set [城市]\`\n例如: \`!weather set Hong Kong\``);
      return;
    }

    // 測試新位置
    const test = await fetchWeather(location);
    if (!test.success) {
      await message.channel.send(`❌ 無法獲取 "${location}" 的天氣，請確認城市名稱正確`);
      return;
    }

    data.location = location;
    data.cache = test;
    data.lastFetch = Date.now();
    saveData(data);

    await message.channel.send(`✅ 位置已設定為: ${location}\n\n🌡️ 當前天氣: ${test.current.temp_C}°C - ${test.current.weatherDesc}`);
    return;
  }

  // !weather help
  await message.channel.send(`🌤️ **天氣命令**

\`!weather\` - 團隊天氣圖 (心情 + 天氣)
\`!weather today\` - 今日天氣
\`!weather forecast\` - 3日預報
\`!weather set [城市]\` - 設定位置

---
💡 團隊天氣圖結合了成員心情同實際天氣！`);
}

// 導出模組
module.exports = {
  handleWeatherCommand,
  fetchWeather,
  loadData,
  saveData
};
