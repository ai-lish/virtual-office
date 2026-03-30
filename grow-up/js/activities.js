/* ==========================================
   K1 Learning Platform - Activity Engine
   ========================================== */

const Activities = {
    currentActivity: null,
    currentIndex: 0,
    activities: [],
    attempts: 0,
    maxAttempts: 2,
    
    /* ========== Week 1 Data ========== */
    week1Data: {
        day1: [
            {
                id: 'd1-age-tap',
                type: 'tap',
                skill: 'self-age',
                skillName: '年齡認知',
                parentInfo: {
                    summary: '年齡認知係自我認識嘅基礎。呢個活動幫助小朋友理解「數」可以代表年齡。',
                    learningGoals: [
                        '認識數字 1、2、3',
                        '理解數量代表年齡',
                        '建立數字同實物嘅對應'
                    ],
                    designRationale: '3選1嘅形式降低難度，配合視覺提示（手指圖），符合前運算期兒童認知水平。',
                    developmentalPsychology: {
                        theory: 'Piaget 前運算期',
                        keyConcept: '具體運算階段前期，幼兒開始理解數字可以代表數量',
                        ageAppropriateness: '3歲可以理解「幾多歲」呢個概念，但需要視覺輔助'
                    },
                    homeApplication: [
                        '數家庭成員年齡',
                        '問「你幾歲？幾時生日？」',
                        '用手指表示年齡'
                    ]
                },
                prompt: '你幾歲呀？',
                promptAudio: null,
                options: [
                    { id: '1', icon: '1️⃣', correct: false },
                    { id: '2', icon: '2️⃣', correct: false },
                    { id: '3', icon: '3️⃣', correct: true }
                ]
            },
            {
                id: 'd1-colour-rb',
                type: 'tap',
                skill: 'colour-red-blue',
                skillName: '顏色認知',
                parentInfo: {
                    summary: '紅色同藍色係最基本嘅原色，係顏色學習嘅起點。',
                    learningGoals: [
                        '認識紅色同藍色',
                        '區分兩種不同顏色',
                        '聽顏色名指出正確顏色'
                    ],
                    designRationale: '2選1建立成功感，減少認知負擔。實物圖像（蘋果、天空）幫助顏色同實物聯繫。',
                    developmentalPsychology: {
                        theory: '視覺發展 + 顏色知覺',
                        keyConcept: '3歲開始可以區分基本顏色，原色最容易被視覺系統偵測',
                        ageAppropriateness: '原色（紅黃藍綠）比間色更容易被幼兒區分'
                    },
                    homeApplication: [
                        '指住物件問顏色：「蘋果係咩顏色？」',
                        '玩「邊個係紅色」遊戲',
                        '着衫時討論顏色'
                    ]
                },
                prompt: '邊個係紅色？',
                options: [
                    { id: 'red', icon: '🍎', correct: true },
                    { id: 'blue', icon: '🌊', correct: false }
                ]
            }
        ],
        day2: [
            {
                id: 'd2-colour-ry',
                type: 'tap',
                skill: 'colour-red-yellow',
                skillName: '顏色認知',
                parentInfo: {
                    summary: '認識第三原色 — 黃色，鞏固紅色學習。',
                    learningGoals: ['認識黃色', '鞏固紅色認知', '擴展顏色詞彙'],
                    designRationale: '由2選1開始，逐步建立顏色分類能力。',
                    developmentalPsychology: {
                        theory: '顏色知覺發展',
                        keyConcept: '原色知覺係幼兒視覺系統最早發展完整嘅顏色區分能力'
                    },
                    homeApplication: ['黄色物品：香蕉、太陽', '「黃色士啤軚」']
                },
                prompt: '邊個係黃色？',
                options: [
                    { id: 'yellow', icon: '🍌', correct: true },
                    { id: 'red', icon: '🍎', correct: false }
                ]
            },
            {
                id: 'd2-body-parts',
                type: 'tap',
                skill: 'self-body',
                skillName: '身體部位',
                parentInfo: {
                    summary: '認識身體部位係自我意識發展嘅重要一步。',
                    learningGoals: [
                        '認識眼、耳、口、鼻、手',
                        '建立身體圖式',
                        '為身體自主權打基礎'
                    ],
                    designRationale: '由最熟悉嘅身體部位出發，配合大圖示，符合幼兒學習順序。',
                    developmentalPsychology: {
                        theory: 'Erikson 信任 vs 懷疑階段',
                        keyConcept: '認識自己嘅身體係建立安全感同自我認同嘅基礎',
                        ageAppropriateness: '2-3歲開始可以指出自己嘅身體部位'
                    },
                    homeApplication: [
                        '照鏡時指出五官',
                        '玩「身體部位歌」',
                        '「眼仔睇到乜？」'
                    ]
                },
                prompt: '眼喺邊？',
                options: [
                    { id: 'eye', icon: '👁️', correct: true },
                    { id: 'nose', icon: '👃', correct: false },
                    { id: 'mouth', icon: '👄', correct: false }
                ]
            }
        ],
        day3: [
            {
                id: 'd3-colour-3',
                type: 'tap',
                skill: 'colour-3',
                skillName: '三原色',
                parentInfo: {
                    summary: '同時認紅、黃、藍三原色，挑戰視覺分類能力。',
                    learningGoals: [
                        '同時識別三種顏色',
                        '快速反應正確顏色',
                        '為多色分類打基礎'
                    ],
                    designRationale: '由2選1過渡到3選1，係難度嘅自然提升，配合清晰嘅視覺區分。',
                    homeApplication: [
                        '三色積木分類',
                        '着衫時數顏色'
                    ]
                },
                prompt: '邊個係藍色？',
                options: [
                    { id: 'blue', icon: '🚗', correct: true },
                    { id: 'yellow', icon: '🌻', correct: false },
                    { id: 'red', icon: '🎈', correct: false }
                ]
            },
            {
                id: 'd3-colour-match',
                type: 'drag',
                skill: 'colour-match',
                skillName: '顏色配對',
                parentInfo: {
                    summary: '顏色配對係分類能力嘅基礎，訓練視覺對應。',
                    learningGoals: [
                        '將相同顏色嘅物件配對',
                        '理解「一樣」嘅概念',
                        '發展分類思維'
                    ],
                    designRationale: '拖拉配對比點擊需要更多動作控制，但3歲可以完成基本配對。',
                    homeApplication: [
                        '玩具分類顏色',
                        '畫筆放入相同顏色盒'
                    ]
                },
                prompt: '將相同顏色拖過去',
                options: [
                    { id: 'red-apple', icon: '🍎', targetId: 'red' },
                    { id: 'blue-fish', icon: '🐟', targetId: 'blue' },
                    { id: 'yellow-banana', icon: '🍌', targetId: 'yellow' }
                ],
                dropTargets: [
                    { id: 'red', label: '紅色', icon: '🍎' },
                    { id: 'blue', label: '藍色', icon: '🐟' },
                    { id: 'yellow', label: '黃色', icon: '🍌' }
                ]
            }
        ],
        day4: [
            {
                id: 'd4-count-1',
                type: 'count',
                skill: 'count-1',
                skillName: '數數1-3',
                parentInfo: {
                    summary: '點數係數學認知嘅基礎，訓練1:1對應。',
                    learningGoals: [
                        '正確點數1-3個物件',
                        '理解每個數字代表一個數量',
                        '聽到「幾多個」要點數'
                    ],
                    designRationale: '點擊每一個物件，配合語音「一、二、三」，建立數量同語言嘅聯繫。',
                    developmentalPsychology: {
                        theory: 'Piaget 數概念發展',
                        keyConcept: '3歲處於前期準備階段，開始理解「一對一對應」原則',
                        ageAppropriateness: '點數係幼兒最早嘅數學活動之一'
                    },
                    homeApplication: [
                        '數手指',
                        '數樓梯',
                        '數玩具'
                    ]
                },
                prompt: '數一數有幾多個蘋果？',
                count: 2,
                items: ['🍎', '🍎']
            },
            {
                id: 'd4-shape-circle',
                type: 'tap',
                skill: 'shape-circle',
                skillName: '形狀認知',
                parentInfo: {
                    summary: '圓形係最基本嘅形狀，幼兒最容易識別。',
                    learningGoals: [
                        '識別圓形',
                        '區分圓形同其他形狀',
                        '觀察生活中嘅圓形'
                    ],
                    designRationale: '圓形係最原始嘅形狀，唔需要銳角或直線知覺，最容易被幼兒識別。',
                    homeApplication: [
                        '搵圓形：時鐘、碗、氣球',
                        '用手指畫圓'
                    ]
                },
                prompt: '邊個係圓形？',
                options: [
                    { id: 'circle', icon: '⭕', correct: true },
                    { id: 'square', icon: '⬜', correct: false },
                    { id: 'triangle', icon: '🔺', correct: false }
                ]
            }
        ],
        day5: [
            {
                id: 'd5-review',
                type: 'tap',
                skill: 'review-w1',
                skillName: '綜合回顧',
                parentInfo: {
                    summary: '溫故知新！間隔回顧係記憶鞏固嘅關鍵。',
                    learningGoals: [
                        '溫固顏色認知',
                        '鞏固數數概念',
                        '建立學習自信心'
                    ],
                    designRationale: '綜合練習混合不同類型，保持新鮮感同時確認學習成效。',
                    developmentalPsychology: {
                        theory: '遺忘曲線 + 間隔效應',
                        keyConcept: '新資訊需要多次回顧先會轉為長期記憶，每週回顧係最佳時間點',
                        ageAppropriateness: '3歲需要更高頻率嘅回顧'
                    },
                    homeApplication: [
                        '每晚問「今日學咗咩？」',
                        '帶佢搵紅色嘅嘢',
                        '數手指問幾多'
                    ]
                },
                prompt: '邊個係紅色？',
                options: [
                    { id: 'red', icon: '🍎', correct: true },
                    { id: 'blue', icon: '🌊', correct: false },
                    { id: 'yellow', icon: '🍌', correct: false }
                ]
            }
        ]
    },
    
    /* ========== Load Activities ========== */
    loadDay(dayId) {
        this.activities = this.week1Data[dayId] || [];
        this.currentIndex = 0;
        this.currentActivity = null;
        this.attempts = 0;
    },
    
    getCurrent() {
        return this.activities[this.currentIndex];
    },
    
    next() {
        if (this.currentIndex < this.activities.length - 1) {
            this.currentIndex++;
            return true;
        }
        return false;
    },
    
    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return true;
        }
        return false;
    },
    
    isLast() {
        return this.currentIndex >= this.activities.length - 1;
    },
    
    isFirst() {
        return this.currentIndex === 0;
    },
    
    /* ========== Render Activities ========== */
    render(container) {
        const activity = this.getCurrent();
        if (!activity) return;
        
        this.currentActivity = activity;
        this.attempts = 0;
        
        switch (activity.type) {
            case 'tap':
                this.renderTapActivity(container, activity);
                break;
            case 'drag':
                this.renderDragActivity(container, activity);
                break;
            case 'count':
                this.renderCountActivity(container, activity);
                break;
            default:
                container.innerHTML = '<p>活動加載中...</p>';
        }
    },
    
    /* ========== Tap Activity ========== */
    renderTapActivity(container, activity) {
        const childInfo = ProgressManager.getChildInfo();
        
        container.innerHTML = `
            <div class="activity-content">
                <div class="tap-question">
                    <div class="tap-question-icon">🔊</div>
                    <p>${activity.prompt}</p>
                </div>
                
                <div class="tap-options">
                    ${activity.options.map((opt, idx) => `
                        <button class="tap-option stagger-item" 
                                data-correct="${opt.correct}"
                                onclick="Activities.handleTap(this, ${opt.correct})">
                            <span class="tap-option-icon">${opt.icon}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Play audio prompt (if available)
        this.speakPrompt(activity.prompt);
    },
    
    handleTap(element, correct) {
        if (element.classList.contains('disabled')) return;
        
        if (correct) {
            element.classList.add('correct');
            ProgressManager.recordAttempt(this.currentActivity.skill, true);
            this.showSuccess();
        } else {
            element.classList.add('incorrect');
            ProgressManager.recordAttempt(this.currentActivity.skill, false);
            this.attempts++;
            
            if (this.attempts >= this.maxAttempts) {
                // Show correct answer
                this.showCorrectAnswer();
            } else {
                this.showRetry();
            }
        }
    },
    
    showCorrectAnswer() {
        const options = document.querySelectorAll('.tap-option');
        options.forEach(opt => {
            if (opt.dataset.correct === 'true') {
                opt.classList.add('correct');
            }
            opt.classList.add('disabled');
        });
        
        setTimeout(() => {
            App.afterActivity();
        }, 1500);
    },
    
    /* ========== Drag Activity ========== */
    renderDragActivity(container, activity) {
        container.innerHTML = `
            <div class="activity-content">
                <p class="drag-instruction">${activity.prompt}</p>
                
                <div class="drag-area">
                    <div class="drag-source">
                        ${activity.options.map((opt, idx) => `
                            <div class="drag-item stagger-item"
                                 id="drag-${opt.id}"
                                 draggable="true"
                                 data-target="${opt.targetId}"
                                 ontouchstart="Activities.handleDragStart(event, this)"
                                 ondragstart="Activities.handleDragStart(event, this)">
                                ${opt.icon}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="drop-targets">
                        ${activity.dropTargets.map(target => `
                            <div class="drop-target"
                                 id="drop-${target.id}"
                                 data-target="${target.id}"
                                 ondragover="Activities.handleDragOver(event)"
                                 ondragleave="Activities.handleDragLeave(event)"
                                 ondrop="Activities.handleDrop(event, '${target.id}')">
                                <span class="drop-target-label">${target.label}</span>
                                <span class="drop-target-icon">${target.icon}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Setup touch events for mobile
        this.setupDragEvents();
        this.speakPrompt(activity.prompt);
    },
    
    setupDragEvents() {
        const dragItems = document.querySelectorAll('.drag-item');
        
        dragItems.forEach(item => {
            // Touch events
            item.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
        });
    },
    
    handleDragStart(e, element) {
        element.classList.add('dragging');
        e.dataTransfer.setData('text/plain', element.dataset.target);
    },
    
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    },
    
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    },
    
    handleDrop(e, targetId) {
        e.preventDefault();
        const dropTarget = e.currentTarget;
        dropTarget.classList.remove('drag-over');
        
        const sourceTargetId = e.dataTransfer.getData('text/plain');
        const dragElement = document.getElementById(`drag-${sourceTargetId}`);
        
        if (sourceTargetId === targetId) {
            dropTarget.classList.add('filled');
            dragElement.classList.add('used');
            dragElement.classList.remove('dragging');
            
            ProgressManager.recordAttempt(this.currentActivity.skill, true);
            this.showSuccess();
        } else {
            dropTarget.classList.add('incorrect');
            setTimeout(() => dropTarget.classList.remove('incorrect'), 500);
            
            ProgressManager.recordAttempt(this.currentActivity.skill, false);
            this.attempts++;
            
            if (this.attempts >= this.maxAttempts) {
                // Show all correct answers
                this.showCorrectDragAnswer();
            } else {
                this.showRetry();
            }
        }
    },
    
    showCorrectDragAnswer() {
        const dragItems = document.querySelectorAll('.drag-item');
        dragItems.forEach(item => {
            item.classList.add('used');
        });
        
        const dropTargets = document.querySelectorAll('.drop-target');
        dropTargets.forEach(target => {
            target.classList.add('filled');
        });
        
        setTimeout(() => {
            App.afterActivity();
        }, 1500);
    },
    
    /* ========== Count Activity ========== */
    renderCountActivity(container, activity) {
        container.innerHTML = `
            <div class="activity-content">
                <p class="count-question">${activity.prompt}</p>
                
                <div class="count-items">
                    ${activity.items.map((item, idx) => `
                        <button class="count-item tap-option stagger-item" 
                                onclick="Activities.handleCountTap(this, ${idx})">
                            <span class="tap-option-icon">${item}</span>
                        </button>
                    `).join('')}
                </div>
                
                <div class="count-display">
                    <span id="count-number">0</span>
                </div>
            </div>
        `;
        
        this.countNumber = 0;
        this.speakPrompt(activity.prompt);
    },
    
    handleCountTap(element, index) {
        if (element.classList.contains('counted')) return;
        
        element.classList.add('counted');
        element.classList.add('correct');
        
        this.countNumber++;
        document.getElementById('count-number').textContent = this.countNumber;
        
        // Speak the number
        this.speakNumber(this.countNumber);
        
        if (this.countNumber >= this.currentActivity.count) {
            ProgressManager.recordAttempt(this.currentActivity.skill, true);
            setTimeout(() => {
                this.showSuccess();
            }, 500);
        }
    },
    
    /* ========== Feedback ========== */
    showSuccess() {
        const overlay = document.getElementById('success-overlay');
        overlay.classList.add('active');
        
        setTimeout(() => {
            overlay.classList.remove('active');
            App.afterActivity();
        }, 1200);
    },
    
    showRetry() {
        const overlay = document.getElementById('retry-overlay');
        overlay.classList.add('active');
        
        // Re-enable options
        setTimeout(() => {
            overlay.classList.remove('active');
        }, 800);
    },
    
    /* ========== Audio ========== */
    speakPrompt(text) {
        if ('speechSynthesis' in window) {
            // Use Web Speech API for TTS
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-HK';
            utterance.rate = 0.8;
            
            const settings = ProgressManager.getSettings();
            utterance.volume = settings.volume;
            
            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
        }
    },
    
    speakNumber(num) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(String(num));
            utterance.lang = 'zh-HK';
            utterance.rate = 0.8;
            
            const settings = ProgressManager.getSettings();
            utterance.volume = settings.volume;
            
            speechSynthesis.speak(utterance);
        }
    }
};
