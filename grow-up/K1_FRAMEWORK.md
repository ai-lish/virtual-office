# K1 Learning Platform Framework
## 幼兒互動學習平台設計文檔（K1，3歲）

> **Target:** Hong Kong K1 child (age 3-4), Cantonese-speaking  
> **Style:** Option B — Simple interactive exercises with gentle right/wrong feedback  
> **Philosophy:** Progressive, no rush, quality over speed  
> **Tech:** Single-page HTML/CSS/JS, localStorage, no backend

---

## 0.5 家長資訊系統（活動說明）

### 設計理念
每個活動旁邊有一個 **（i）** 按鈕，家長可以點擊睇到：

1. **活動理念** — 點解呢個遊戲可以幫助學習
2. **學習目標** — 具體學到咩
3. **發展心理學** — 背後嘅研究/理論基礎

### 家長資訊卡範例

```
┌─────────────────────────────────────┐
│  👶 發展心理學話你知                    │
├─────────────────────────────────────┤
│                                     │
│  🎯 學習目標                          │
│  • 認識紅、藍、黃三原色               │
│  • 發展視覺分辨能力                    │
│                                     │
│  💡 點解咁設計？                      │
│  3歲小朋友由「顏色命名」階段進入       │
│  「顏色分類」階段。我哋用「邊個係紅色」│
│  問題，等佢學習顏色嘅分類功能，        │
│  而唔係只係記憶顏色名字。              │
│                                     │
│  🧠 發展心理學基礎                     │
│  Piaget 認知發展論：3歲處於前運算期   │
│  （Preoperational Stage），開始能夠    │
│  用符號代表物件，但仍然以自我為中心。    │
│  活動設計利用「指認」呢個自然行為，     │
│  係佢能力範圍內嘅任務。               │
│                                     │
│  📚 研究參考                          │
│  • Ginsburg, K. R. (2007). The         │
│    importance of play in promoting...  │
│  • Piaget, J. (1952). The child's...  │
│                                     │
└─────────────────────────────────────┘
```

### 信息分層設計

| 層次 | 內容 | 目的 |
|------|------|------|
| **簡短版** | 1-2句活動理念 | 快速理解 |
| **詳細版** | 學習目標 + 心理學解釋 | 深入了解 |
| **延伸版** | 研究參考 + 實際應用建議 | 專題閱讀 |

### UI/UX 要點

- **（i）按鈕** — 細細哋，唔搶眼，但容易搵到
- **家長視角** — 唔影響小朋友玩遊戲
- **可關閉** — 如果家長唔想睇，可以收起
- **多種語言** — 繁體中文為主，可切換英文

### 活動說明內容結構

```json
{
  "activityId": "w1-colours-tap-1",
  "parentInfo": {
    "summary": "顏色識別係幼兒早期數學認知嘅基礎。呢個活動訓練小朋友由「聽顏色名」過渡到「主動認出顏色」。",
    "learningGoals": [
      "認識紅、藍、黃三原色",
      "理解顏色可以作為分類標準",
      "聽覺輸入轉化為視覺輸出"
    ],
    "designRationale": "選擇題形式符合3歲認知水平 —佢哋仲未識字，但可以透過圖像配對學習。2選1減低難度，建立成功感。",
    "developmentalPsychology": {
      "theory": "Piaget 前運算期",
      "keyConcept": "符號功能（Symbolic Function）",
      "ageAppropriateness": "3歲開始可以區分基本顏色，但需要視覺提示配合語言輸入。"
    },
    "researchReferences": [
      "Ginsburg, K.R. (2007). The Importance of Play in Promoting Child Development"
    ],
    "homeApplication": [
      "日常生活中多強調顏色：紅色蘋果、藍色車",
      "玩「邊個係...」遊戲喺任何場景都得",
      "避免一次過教太多顏色，2-3個為限"
    ]
  }
}
```

---

## 1. Design Principles

### 1.1 Attention & Session Design
- **Max session: 5-10 minutes** — each activity is 2-3 minutes, sessions contain 2-4 activities
- **Auto-pause** after 10 minutes with a gentle "休息一下！" screen
- **No timers visible to child** — no pressure, no countdowns

### 1.2 Learning Through Play
- Every learning objective is wrapped in a game mechanic (tap, drag, match)
- No "lesson" framing — it's always "來玩吓！" (let's play!)
- Intrinsic motivation: curiosity and surprise, not scores

### 1.3 Visual > Text
- All instructions are **spoken in Cantonese** (audio) + simple icon/animation
- Zero reading required from the child
- Large, clear illustrations with minimal detail (flat style, not photorealistic)

### 1.4 Repetition System
- Each concept appears **at least 3 sessions** before advancing
- Spaced repetition: new → next day → 3 days later → weekly review
- Same concept, different activity type (keeps it fresh)

### 1.5 Gentle Feedback
- **Correct:** Cheerful animation (stars, bouncing character) + "叻叻！" audio
- **Incorrect:** Soft wobble animation + "再試一次！" (try again) — no negative sound
- **Max 2 wrong attempts**, then show the answer with encouragement
- No scores, no fail states, no lives/hearts

### 1.6 Touch Interaction
- **Large tap targets:** minimum 80×80px (ideally 100×100px)
- **Supported gestures:** tap, drag-and-drop, swipe left/right
- **No gestures requiring:** pinch, long-press, multi-touch, or precision
- **Generous hit areas** — forgive near-misses

---

## 2. K1 Learning Scope

### 2.1 語文 Chinese/Cantonese

| Area | Scope | Examples |
|------|-------|---------|
| 聆聽理解 | Listen to short sentences, identify objects | "邊個係貓貓？" → tap the cat |
| 簡單指令 | 1-2 step instructions | "將蘋果放入籃" (drag apple to basket) |
| 常用字認識 | 10-20 high-frequency characters per term | 人、大、小、一、二、三、口、手、日、月 |
| 發音練習 | Listen & repeat common words | Audio model → mic input (future) or tap matching sound |
| 口語表達 | Naming objects, simple sentences | "呢個係乜嘢？" with picture prompts |

**Term 1 Target:** Recognise 10 characters, follow 1-step audio instructions, name 20+ common objects.

### 2.2 數學 Math

| Area | Scope | Examples |
|------|-------|---------|
| 數數 1-10 | Rote counting, 1:1 correspondence | Tap each animal as you count |
| 大小概念 | Compare two objects | "邊個大啲？" → tap the bigger one |
| 顏色認識 | 6 basic colours first | 紅、藍、黃、綠、橙、紫 |
| 形狀認識 | Circle, square, triangle, rectangle | Match shape to outline |
| 簡單分類 | Sort by one attribute | "將紅色嘅放呢邊" |

**Term 1 Target:** Count to 5 with correspondence, identify 4 colours + 3 shapes, sort by colour.

### 2.3 英文 English

| Area | Scope | Examples |
|------|-------|---------|
| 字母認識 | A-Z uppercase, focus on shape & sound | Letter of the week |
| 簡單詞彙 | 5-8 words per topic (animals, food, body) | "Apple! Can you find the apple?" |
| 傾聽英語 | Simple English audio instructions | "Touch the red one" |

**Term 1 Target:** Recognise 10 letters by shape, understand 20 English words, respond to simple English prompts.

### 2.4 SEL 社交情緒

| Area | Scope | Examples |
|------|-------|---------|
| 認識自己 | Name, age, body parts, emotions | "你叫咩名？" + face builder |
| 家庭成員 | 爸爸、媽媽、爺爺、嫲嫲 etc. | Match family member to label |
| 分享概念 | Taking turns, sharing items | Story scenarios with choices |
| 禮貌表達 | 多謝、唔該、早晨、再見 | Tap the right response for a situation |

**Term 1 Target:** Identify body parts and basic emotions, name family members, use 4 polite phrases.

---

## 3. Core Activity Types

### Type 1: 「點一點」Tap to Choose
- **Mechanic:** Audio asks a question → child taps the correct option from 2-4 choices
- **Use for:** Colour/shape/character recognition, vocabulary, listening comprehension
- **Layout:** Question area (top) + 2-4 large image cards (bottom grid)
- **Example:** "邊個係圓形？" → tap the circle among shapes

### Type 2: 「拉一拉」Drag & Drop / Match
- **Mechanic:** Drag items to correct targets (matching pairs, sorting)
- **Use for:** Classification, matching, 1:1 correspondence, character-picture matching
- **Layout:** Draggable items on one side, drop zones on the other
- **Example:** Drag fruits into the basket, animals into the farm

### Type 3: 「數一數」Counting Touch
- **Mechanic:** Objects appear → child taps each one to count, number increments with each tap
- **Use for:** Counting, 1:1 correspondence
- **Layout:** Scattered objects on screen + large number display
- **Example:** 5 ducks on a pond — tap each one, hear "一、二、三、四、五！"

### Type 4: 「搵一搵」Find & Seek
- **Mechanic:** Scene with hidden/embedded items → tap to find them
- **Use for:** Vocabulary, observation, following instructions
- **Layout:** Full-screen illustrated scene
- **Example:** "搵出三個蘋果！" in a kitchen scene

### Type 5: 「排一排」Sequence / Order
- **Mechanic:** Arrange 2-3 items in order (size, number, story sequence)
- **Use for:** Big/small, number order, simple patterns
- **Layout:** Items at bottom, numbered slots at top
- **Example:** Arrange 3 bears from small to big

### Type 6: 「跟住做」Follow the Pattern
- **Mechanic:** System shows a short sequence → child repeats it (tap in same order)
- **Use for:** Memory, listening, following instructions
- **Layout:** Grid of items that light up in sequence
- **Example:** Animals light up: cat → dog → fish → child taps same order

### Type 7: 「著色」Colour Fill
- **Mechanic:** Outline image + colour palette → tap area, then tap colour
- **Use for:** Colour recognition, fine motor, creativity
- **Layout:** Large outline drawing + 4-6 colour buttons
- **Example:** "將個太陽著做黃色！" or free colour mode

### Type 8: 「故事時間」Interactive Story
- **Mechanic:** Short illustrated story (3-5 frames) with 1 choice per frame
- **Use for:** SEL, listening comprehension, vocabulary
- **Layout:** Full-screen illustration + audio narration + 1-2 tap choices
- **Example:** "小明見到朋友跌低咗，你會點做？" → tap "幫佢" or "行開"

---

## 4. UI/UX Design

### 4.1 Colour Palette

```
Primary Background:  #FFF8F0  (warm cream — easy on eyes)
Card Background:     #FFFFFF
Primary Accent:      #4ECDC4  (teal — friendly, gender-neutral)
Secondary Accent:    #FFE66D  (warm yellow — cheerful)
Success:             #7BC67E  (soft green)
Try Again:           #FFB347  (soft orange — NOT red)
Text:                #2C3E50  (dark blue-grey)
Disabled:            #D5DBDB

Activity colours (flat, saturated but not neon):
  Red:    #FF6B6B
  Blue:   #4ECDC4
  Yellow: #FFE66D
  Green:  #7BC67E
  Orange: #FFB347
  Purple: #A78BFA
```

### 4.2 Typography
- **Chinese:** Noto Sans TC (rounded, clear strokes) — minimum 28px for labels, 36px+ for characters being taught
- **English:** Nunito or Baloo 2 (rounded, friendly) — minimum 24px
- **Numbers:** Extra large, 48px+ when counting
- Child never needs to read — text is for parent reference only

### 4.3 Layout Principles
- **Safe area:** 20px padding from all edges (avoid notch/home indicator areas)
- **Grid:** Max 2×2 for choices (4 items), 1×3 for horizontal scroll
- **Vertical bias:** Top = prompt/question, Bottom = interactive area (child's thumbs)
- **Navigation:** Parent-only controls behind a "gate" (e.g., hold 2 seconds or solve simple math)
- **No scrolling** — everything fits one screen

### 4.4 Animation & Motion
- **Transitions:** 300ms ease-in-out (not instant, not slow)
- **Success:** Items scale up 1.2× + gentle bounce + particle burst (stars/sparkles)
- **Incorrect:** Subtle horizontal shake (200ms) + item returns to original position
- **Idle:** Gentle floating/breathing animation on interactive elements (signals "tap me")
- **Page transitions:** Slide left/right (natural "turning pages" metaphor)
- **No rapid flashing** — keep animations calm and predictable

### 4.6 Parent Info Modal

```
活動標題 + [？]
        │
        ▼
┌─────────────────────────────┐
│  👶 發展心理學話你知            │
├─────────────────────────────┤
│  🎯 學習目標                  │
│  • ...                       │
│                              │
│  💡 點解咁設計？              │
│  • ...                       │
│                              │
│  🧠 發展心理學基礎             │
│  • ...                       │
│                              │
│  📚 研究參考（可選）           │
│                              │
│  🏠 屋企可以點樣做            │
│  • ...                       │
└─────────────────────────────┘
```

**Styling:**
- Modal: 90% width, max 400px, rounded corners
- Backdrop: Semi-transparent dark overlay
- Animation: Slide up from bottom (300ms)
- Close: Tap outside or X button

---

### 4.5 Sound Design
- **Background:** None (or very soft ambient, toggleable by parent)
- **Correct:** Short cheerful chime (C major arpeggio, 0.5s)
- **Incorrect:** Soft "boop" (low, non-punishing, 0.3s)
- **Tap feedback:** Subtle click (50ms)
- **Voice:** Warm Cantonese female voice for instructions (natural, not robotic)
- **Master volume** control for parents; mute button accessible

---

## 5. Technical Architecture

### 5.1 Stack
```
Single HTML file (or small set of HTML files)
├── Inline CSS (or <style> block)
├── Inline JS (vanilla, no framework)
├── Assets: SVG illustrations (inline or base64)
├── Audio: Small MP3/OGG files (Cantonese prompts)
└── Data: JSON activity definitions
```

### 5.2 File Structure
```
grow-up/
├── K1_FRAMEWORK.md          ← this document
├── index.html               ← main entry (activity launcher)
├── css/
│   ├── style.css
│   └── animations.css        ← activity transitions & feedback animations
├── js/
│   ├── app.js               ← router, state management
│   ├── activities.js         ← activity engine (renders types 1-8)
│   └── progress.js           ← localStorage progress tracking
├── data/
│   ├── week01.json           ← activity definitions per week
│   ├── week02.json
│   └── ...
├── audio/
│   ├── cantonese/            ← Cantonese voice prompts
│   └── english/              ← English voice prompts
└── img/
    └── (SVG illustrations)
```

### 5.3 Data Model (localStorage)

```jsonc
{
  "childName": "BB",
  "childAge": 3,                // for age-specific activities (e.g. 你幾歲？)
  "startDate": "2026-03-30",
  "currentWeek": 1,
  "sessions": [
    {
      "date": "2026-03-30",
      "activities": ["w1-colours-1", "w1-self-name"],
      "duration": 420  // seconds
    }
  ],
  "mastery": {
    "colour-red": { "attempts": 5, "correct": 4, "lastSeen": "2026-03-30" },
    "colour-blue": { "attempts": 3, "correct": 3, "lastSeen": "2026-03-30" },
    "char-人": { "attempts": 2, "correct": 1, "lastSeen": "2026-03-29" }
  },
  "settings": {
    "volume": 0.8,
    "sessionMaxMin": 10,
    "language": "zh-HK"
  }
}
```

### 5.4 Activity Definition Format

```jsonc
{
  "id": "w1-colours-tap-1",
  "type": "tap-choose",       // maps to activity type 1
  "week": 1,
  "subject": "math",
  "skill": "colour-recognition",
  "prompt": {
    "audio": "audio/cantonese/colours/where-is-red.mp3",
    "text": "邊個係紅色？"    // parent reference only
  },
  "options": [
    { "id": "red",    "image": "img/circle-red.svg",    "correct": true },
    { "id": "blue",   "image": "img/circle-blue.svg",   "correct": false },
    { "id": "yellow", "image": "img/circle-yellow.svg",  "correct": false }
  ],
  "feedback": {
    "correct": { "audio": "audio/cantonese/feedback/lek-lek.mp3" },
    "incorrect": { "audio": "audio/cantonese/feedback/try-again.mp3" }
  }
}
```

### 5.5 Future Extensibility
- **Phase 2:** Add Web Speech API for pronunciation practice (listen to child's voice)
- **Phase 3:** Parent dashboard page (progress charts, time spent)
- **Phase 4:** Sync to cloud (optional, simple JSON export/import)
- **Phase 5:** K2/K3 content packs (same engine, new data files)

---

## 6. Content Structure

### 6.1 Organisation Hierarchy
```
Term (學期) → Month → Week → Session → Activity
```

- **Term:** ~4 months, aligned with HK school terms
- **Week:** 3-5 sessions, each 5-10 minutes
- **Session:** 2-4 activities mixing subjects
- **Activity:** Single focused interaction (1-3 minutes)

### 6.2 Session Composition
Each session mixes subjects to maintain variety:
```
Session Template:
  1. Warm-up (30s)     — familiar/review activity
  2. Main A (2-3 min)  — new concept or practice
  3. Main B (2-3 min)  — different subject
  4. Cool-down (1 min) — fun/creative (colouring, story)
```

### 6.3 Difficulty Progression
Each skill has 3 levels within K1:

| Level | Description | Example (Colour Recognition) |
|-------|-------------|------------------------------|
| **Intro** | Binary choice, heavy scaffolding | "紅色定藍色？" (2 options) |
| **Practice** | 3-4 options, less scaffolding | "搵出綠色" from 4 colours |
| **Mastery** | Applied in context, mixed with other skills | "將紅色嘅蘋果放入籃" (colour + drag) |

**Advancement rule:** Move to next level after **3 correct in a row** across different sessions.

### 6.4 Review & Repetition Schedule
- **Same session:** Incorrect items appear once more at end
- **Next session:** Previous session's items appear in warm-up
- **Weekly:** Friday session is all review
- **Monthly:** Last week mixes all month's concepts

---

## 7. Week 1-4 Content Plan

### Week 1: 認識自己 + 顏色 (Self + Colours)

**Learning Goals:**
- Know own name and age
- Identify red (紅), blue (藍), yellow (黃)

#### Session 1.1: 年齡 + 顏色（一）

**活動：點年齡**
- **玩法：** 「你幾歲呀？」→ 從 [1, 2, 3] 選擇
- **家長資訊：**
  ```
  🎯 學習目標：認識數字1-3，理解數量概念
  💡 設計理念：3歲開始理解「數」代表數量。選擇題形式
     配合視覺提示，降低認知負擔。
  🧠 發展心理學：Piaget 前運算期兒童可以點數物件，
     但理解數字符號需要具體物品對應。
  🏠 屋企應用：數樓梯、數手指、數玩具
  ```

**活動：紅色定藍色？**
- **玩法：** 「邊個係紅色？」→ 點擊紅色/藍色
- **家長資訊：**
  ```
  🎯 學習目標：區分紅、藍兩原色，發展視覺分類能力
  💡 設計理念：由2選1開始，建立成功感，再慢慢增加顏色數量
  🧠 發展心理學：原色（紅黃藍綠）最容易被幼兒區分，
     係顏色學習嘅起點
  🏠 屋企應用：「蘋果係咩顏色？」「天空係咩顏色？」
  ```

#### Session 1.2: 自己介紹 + 黃色

**活動：我叫___**
- **玩法：** 顯示小朋友名字 + 聽到「你好，我叫___」
- **家長資訊：**
  ```
  🎯 學習目標：認識自己嘅名字，建立自我概念
  💡 設計理念：名字係自我認同最重要嘅符號。聽到自己
     嘅名字可以提升歸屬感同學習動機
  🧠 發展心理學： Erikson 信任 vs 懷疑階段，
     認識自己係建立安全感嘅基礎
  🏠 屋企應用：叫佢介紹自己俾家人、朋友
  ```

**活動：紅色定黃色？**
- **玩法：** 「邊個係黃色？」→ 點擊紅色/黃色
- **家長資訊：**
  ```
  🎯 學習目標：認識黃色，鞏固紅色，學習第三原色
  🏠 屋企應用：yellow = 黃色香蕉、黃色士啤軚
  ```

#### Session 1.3: 身體部位 + 三色

**活動：身體部位**
- **玩法：** 「眼喺邊？」→ 點擊眼/鼻/口
- **家長資訊：**
  ```
  🎯 學習目標：認識基本身體部位，建立身體意識
  💡 設計理念：身體部位係幼兒最熟悉嘅概念之一，
     從佢哋自己嘅身體出發係最自然嘅學習起點
  🧠 發展心理學：身體圖式（Body Schema）嘅發展
     係自我意識嘅基礎，3歲開始理解「我」係獨立個體
  🏠 屋企應用：照鏡�指出五官、玩「身體部位歌」
  ```

#### Session 1.4: 著色 + 溫習

**活動：着色**
- **玩法：** 太陽着黃色、蘋果着紅色
- **家長資訊：**
  ```
  🎯 學習目標：強化顏色認知，訓練手眼協調
  💡 設計理念：自由着色俾予創意空間，引導着色
     幫助佢哋理解顏色同物件嘅關係
  🧠 發展心理學：著色訓練小肌肉發展，為寫字做准备
  🏠 屋企應用：著色書、着色筆、濕水彩
  ```

#### Session 1.5: 週回顧

**活動：綜合練習**
- **玩法：** 混合自我認識 + 顔色
- **家長資訊：**
  ```
  🎯 學習目標：溫故知新，確認學習成效
  💡 設計理念：定期回顧係記憶鞏固嘅關鍵。
     間隔重複比一次學習大量更有效。
  🧠 發展心理學：遺忘曲線話我哋知，新資訊需要
     多次回顧先會轉為長期記憶
  🏠 屋企應用：每晚問一問「今日學咗咩顏色？」
  ```

---

### Week 2: 數字 1-3 + 形狀 (Numbers 1-3 + Shapes)

**Learning Goals:**
- Count 1, 2, 3 with correspondence
- Identify circle (圓形) and square (正方形)

| Session | Activities |
|---------|-----------|
| 2.1 | 🔢 **Count:** Tap 1 apple, hear "一！" — ⭕ **Tap:** "邊個係圓形？" circle vs square |
| 2.2 | 🔢 **Count:** Tap 2 bananas — ⭕ **Drag:** Match shapes to outlines |
| 2.3 | 🔢 **Count:** Tap 3 stars — 🎨 **Review:** Colours from Week 1 |
| 2.4 | 🔢 **Count:** Mixed 1-3 items — ⭕ **Find:** Find all circles in a picture |
| 2.5 | ⭐ **Review:** Numbers 1-3 + shapes + colours |

**Assets needed:** Countable objects (fruits, stars, animals), shape illustrations

---

### Week 3: 聆聽指令 + 大小 (Instructions + Big/Small)

**Learning Goals:**
- Follow 1-step Cantonese instructions
- Compare big (大) vs small (小)

| Session | Activities |
|---------|-----------|
| 3.1 | 👂 **Follow:** "㩒個蘋果" (tap the apple) — 📏 **Tap:** "邊個大啲？" 2 items |
| 3.2 | 👂 **Follow:** "將貓貓拉去屋企" (drag cat to house) — 📏 **Tap:** big vs small (different objects) |
| 3.3 | 📏 **Order:** Arrange 3 bears small → big — 🔢 **Review:** Count 1-3 |
| 3.4 | 👂 **Follow:** 2-part: "先㩒紅色，再㩒藍色" — 📏 **Colour Fill:** Colour the big circle |
| 3.5 | ⭐ **Review:** Instructions + big/small + previous weeks |

**Assets needed:** Paired big/small objects, scene illustrations for instruction following

---

### Week 4: 家人 + 分享 (Family + Sharing)

**Learning Goals:**
- Name 爸爸、媽媽、爺爺、嫲嫲
- Understand sharing concept
- English intro: "Hello", "Bye bye"

| Session | Activities |
|---------|-----------|
| 4.1 | 👨‍👩‍👧 **Tap:** "爸爸喺邊？" identify family members — 🤝 **Story:** sharing toys scenario |
| 4.2 | 👨‍👩‍👧 **Match:** Drag family label to person — 🇬🇧 **Listen:** "Hello!" + wave animation |
| 4.3 | 👨‍👩‍👧 **Tap:** "呢個係邊個？" from 3 family members — 🤝 **Story:** taking turns at playground |
| 4.4 | 🇬🇧 **Tap:** "Where is the apple?" (English listening) — 🔢 **Review:** Numbers + colours |
| 4.5 | ⭐ **Monthly Review:** All concepts from Weeks 1-4 |

**Assets needed:** Family illustrations, sharing/playground scenes, English audio prompts

---

## 8. Parent Controls & Dashboard (Simple)

### Parent Gate
- **Access:** Hold a small lock icon for 3 seconds, or solve "2+3=?" 
- **Behind gate:** Settings, progress view, session history

### Progress View (Future Phase)
```
Simple summary per subject:
  語文: ⭐⭐⭐☆☆  (3/5 skills started)
  數學: ⭐⭐☆☆☆  (2/5 skills started)
  英文: ⭐☆☆☆☆  (1/5 skills started)
  
Recent activity:
  Today: 2 sessions, 8 minutes
  This week: 6 sessions, 35 minutes
```

---

## 9. Implementation Priority

### Phase 1 (MVP) — Build First
1. Activity engine for **Type 1 (Tap to Choose)** and **Type 2 (Drag & Drop)**
2. Week 1 content (self + colours) — ~10 activities
3. Basic localStorage progress
4. Audio playback for Cantonese prompts
5. Success/failure animations

### Phase 2 — Expand Content
1. Add Type 3 (Counting) and Type 7 (Colour Fill)
2. Weeks 2-4 content
3. Review/repetition logic
4. Session timer with gentle pause

### Phase 3 — Polish
1. Add Types 4-6 and 8
2. Parent dashboard
3. More audio assets
4. Idle animations and sound design

---

## 10. Audio Asset List (Priority)

### Cantonese Prompts (Record or TTS)
```
Feedback:
  叻叻！/ 好叻呀！/ 做得好！
  再試一次！/ 唔係呀，再試下！
  
Colours:
  紅色、藍色、黃色、綠色、橙色、紫色
  邊個係__色？/ 搵出__色

Numbers:
  一、二、三、四、五（to start）
  數一數！/ 有幾多個？

Shapes:
  圓形、正方形、三角形
  邊個係__形？

General:
  來玩吓！/ 準備好未？/ 休息一下！
  早晨！/ 再見！/ 多謝！/ 唔該！
```

---

*This framework is a living document. Update as the platform evolves.*  
*Created: 2026-03-30 | Author: OpenClaw subagent for Zach Li*
