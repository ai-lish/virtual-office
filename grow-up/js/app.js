/* ==========================================
   K1 Learning Platform - Main App
   ========================================== */

const App = {
    currentDay: null,
    sessionStartTime: null,
    breakTimer: null,
    SESSION_MAX_MS: 10 * 60 * 1000, // 10 minutes
    
    /* ========== Init ========== */
    init() {
        this.showScreen('app-home');
        this.updateDayStatus();
        this.applySettings();
    },
    
    /* ========== Screen Management ========== */
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId)?.classList.add('active');
    },
    
    /* ========== Home ========== */
    goHome() {
        this.showScreen('app-home');
        this.updateDayStatus();
    },
    
    updateDayStatus() {
        const weekProgress = ProgressManager.getWeekProgress(1);
        
        for (let i = 1; i <= 5; i++) {
            const dayId = 'day' + i;
            const status = document.getElementById(dayId + '-status');
            const session = ProgressManager.getSessionData(dayId);
            
            if (session.completed) {
                status.textContent = '✅';
                document.querySelector(`[onclick="openSession('${dayId}')"]`)?.classList.add('completed');
            } else if (session.lastPlayed) {
                status.textContent = session.activitiesCompleted + '/' + session.totalActivities;
            } else {
                status.textContent = '';
            }
        }
        
        // Update progress text
        const progressEl = document.querySelector('.day-progress');
        if (progressEl) {
            progressEl.textContent = `已完成 ${weekProgress.completed}/${weekProgress.total} 日`;
        }
    },
    
    /* ========== Session ========== */
    openSession(dayId) {
        this.currentDay = dayId;
        this.sessionStartTime = Date.now();
        
        // Reset break timer
        this.clearBreakTimer();
        
        Activities.loadDay(dayId);
        
        // Update header
        const dayNum = dayId.replace('day', '');
        document.getElementById('session-title').textContent = `Day ${dayNum}`;
        
        // Show session screen
        this.showScreen('app-session');
        
        // Render first activity
        this.renderCurrentActivity();
        this.updateNavButtons();
    },
    
    renderCurrentActivity() {
        const container = document.getElementById('activity-container');
        const activity = Activities.getCurrent();
        
        if (activity) {
            Activities.render(container);
            this.updateProgress();
        }
    },
    
    updateProgress() {
        const current = Activities.currentIndex + 1;
        const total = Activities.activities.length;
        document.getElementById('session-progress').textContent = `${current}/${total}`;
    },
    
    updateNavButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        prevBtn.style.display = Activities.isFirst() ? 'none' : 'block';
        
        // Next button shows "完成" on last activity
        if (Activities.isLast()) {
            nextBtn.textContent = '完成 ✅';
        } else {
            nextBtn.textContent = '下一個 →';
        }
        nextBtn.style.display = 'block';
    },
    
    nextActivity() {
        if (Activities.isLast()) {
            this.completeSession();
        } else if (Activities.next()) {
            this.renderCurrentActivity();
            this.updateNavButtons();
        }
    },
    
    prevActivity() {
        if (Activities.prev()) {
            this.renderCurrentActivity();
            this.updateNavButtons();
        }
    },
    
    afterActivity() {
        // Record completion
        ProgressManager.completeActivity(this.currentDay);
        
        // Check break timer
        if (this.shouldTakeBreak()) {
            this.showBreak();
            return;
        }
        
        // Auto advance
        this.nextActivity();
    },
    
    completeSession() {
        this.clearBreakTimer();
        this.showScreen('app-complete');
        this.showCompleteStars();
    },
    
    showCompleteStars() {
        const starsEl = document.getElementById('complete-stars');
        starsEl.innerHTML = '⭐⭐⭐';
    },
    
    /* ========== Break ========== */
    shouldTakeBreak() {
        if (!this.sessionStartTime) return false;
        const elapsed = Date.now() - this.sessionStartTime;
        return elapsed >= this.SESSION_MAX_MS;
    },
    
    showBreak() {
        this.showScreen('break-screen');
    },
    
    continueSession() {
        this.sessionStartTime = Date.now();
        this.showScreen('app-session');
        this.renderCurrentActivity();
    },
    
    clearBreakTimer() {
        if (this.breakTimer) {
            clearTimeout(this.breakTimer);
            this.breakTimer = null;
        }
    },
    
    /* ========== Parent Info ========== */
    showActivityInfo() {
        const activity = Activities.getCurrent();
        if (!activity?.parentInfo) return;
        
        const info = activity.parentInfo;
        
        let html = `
            <h3>🎯 學習目標</h3>
            <ul>
                ${info.learningGoals.map(g => `<li>${g}</li>`).join('')}
            </ul>
            
            <h3>💡 點解咁設計？</h3>
            <p>${info.designRationale}</p>
            
            <h3>🧠 發展心理學基礎</h3>
            <p><strong>理論：</strong>${info.developmentalPsychology.theory}</p>
            <p><strong>概念：</strong>${info.developmentalPsychology.keyConcept}</p>
            <p><strong>年齡適宜：</strong>${info.developmentalPsychology.ageAppropriateness}</p>
            
            <h3>🏠 屋企可以點樣做</h3>
            <ul>
                ${info.homeApplication.map(a => `<li>${a}</li>`).join('')}
            </ul>
        `;
        
        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('parent-modal').classList.add('active');
    },
    
    hideParentModal() {
        document.getElementById('parent-modal').classList.remove('active');
    },
    
    /* ========== Settings ========== */
    showParentInfo() {
        const childInfo = ProgressManager.getChildInfo();
        const settings = ProgressManager.getSettings();
        
        document.getElementById('setting-name').value = childInfo.name;
        document.getElementById('setting-age').value = childInfo.age;
        document.getElementById('setting-volume').value = settings.volume * 100;
        
        this.showProgressSummary();
        this.showScreen('app-settings');
    },
    
    saveSettings() {
        const name = document.getElementById('setting-name').value.trim() || 'BB';
        const age = parseInt(document.getElementById('setting-age').value);
        const volume = parseInt(document.getElementById('setting-volume').value) / 100;
        
        ProgressManager.saveChildInfo(name, age);
        ProgressManager.saveSettings({ volume });
        
        alert('保存成功！');
        this.goHome();
    },
    
    resetProgress() {
        if (confirm('確定要重置所有進度嗎？呢個動作無法恢復。')) {
            ProgressManager.resetProgress();
            this.showProgressSummary();
            this.updateDayStatus();
        }
    },
    
    showProgressSummary() {
        const subjects = ProgressManager.getSubjectProgress();
        const weekProgress = ProgressManager.getWeekProgress(1);
        
        let html = `
            <p>第1週：已完成 ${weekProgress.completed}/5 日</p>
            <hr style="margin: 15px 0; border: none; border-top: 1px solid #eee;">
        `;
        
        Object.values(subjects).forEach(subject => {
            const bar = '★'.repeat(subject.mastered) + '☆'.repeat(Math.max(0, 3 - subject.mastered));
            html += `
                <p>${subject.name}: ${bar}</p>
            `;
        });
        
        document.getElementById('progress-summary').innerHTML = html;
    },
    
    applySettings() {
        const settings = ProgressManager.getSettings();
        if (settings.volume) {
            // Apply volume setting globally
        }
    }
};

/* ========== Global Functions ========== */
function openSession(dayId) {
    App.openSession(dayId);
}

function goHome() {
    App.goHome();
}

function nextActivity() {
    App.nextActivity();
}

function prevActivity() {
    App.prevActivity();
}

function showParentInfo() {
    App.showParentInfo();
}

function hideParentModal() {
    App.hideParentModal();
}

function saveSettings() {
    App.saveSettings();
}

function resetProgress() {
    App.resetProgress();
}

function continueSession() {
    App.continueSession();
}

/* ========== Init on Load ========== */
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
