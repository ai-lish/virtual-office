# 粵語音色列表（官方版）

來源：https://platform.minimax.io/docs/faq/system-voice-id

## ✅ 已驗證可用的粵語音色（2026-03-31）

| 序號 | Voice ID | 音色名稱 | 風格 |
|------|----------|----------|------|
| 59 | `Cantonese_ProfessionalHost（F)` | 專業女主持 | 正式、清晰 |
| 60 | `Cantonese_GentleLady` | 溫柔女聲 | 柔和、親切 |
| 61 | `Cantonese_ProfessionalHost（M)` | 專業男主持 | 正式、清晰 |
| 62 | `Cantonese_PlayfulMan` | 活潑男聲 | 輕快、俏皮 |
| 63 | `Cantonese_CuteGirl` | 可愛女孩 | 甜美、可愛 |
| 64 | `Cantonese_KindWoman` | 善良女聲 | 溫柔、關懷 |

**全部 6 個已驗證 ✅**

## 其他已驗證音色

| Voice ID | 狀態 | 備註 |
|----------|------|------|
| `cantonese_female` | ✅ | 早期測試，實際為普通話女聲 |
| `male-qn-qingse` | ✅ | 普通話男聲（青澀青年） |

## ⚠️ 已確認失敗

| Voice ID | 錯誤碼 | 備註 |
|----------|--------|------|
| `Chinese_Mandarin_HK_Flight_Attendant` | 2054 | |
| `Chinese_Mandarin_Lyrical_Voice` | 2054 | |
| `Cantonese_GentleLady`（多種變體）| - | 正式ID可用 |

## 使用範例

```json
{
    "model": "speech-2.8-hd",
    "text": "你食咗飯未呀？",
    "voice_setting": {"voice_id": "Cantonese_ProfessionalHost（F)", "speed": 0.9},
    "output_format": "url"
}
```

**注意：** 粵語音色**不需要** `language_boost` 參數（已經是粵語）。

## 數字 ID（不建議使用）

之前發現的數字 ID（1, 4, 9, 11, 12）可能支援粵語，但無法 100% 確認。
建議使用官方粵語音色 ID（59-64）。
