/* ==========================================
   K1 Learning Platform - Progress Manager
   ========================================== */

const ProgressManager = {
    STORAGE_KEY: 'k1_learning_progress',
    
    /* ========== Data Model ========== */
    getDefaultData() {
        return {
            childName: 'BB',
            childAge: 3,
            startDate: new Date().toISOString().split('T')[0],
            currentWeek: 1,
            sessions: {},
            mastery: {},
            settings: {
                volume: 0.8,
                sessionMaxMin: 10,
                language: 'zh-HK'
            }
        };
    },
    
    /* ========== Load/Save ========== */
    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load progress:', e);
        }
        return this.getDefaultData();
    },
    
    save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save progress:', e);
        }
    },
    
    /* ========== Session Management ========== */
    getSessionData(dayId) {
        const data = this.load();
        return data.sessions[dayId] || {
            completed: false,
            activitiesCompleted: 0,
            totalActivities: 4,
            attempts: 0,
            correct: 0,
            lastPlayed: null
        };
    },
    
    saveSessionData(dayId, sessionData) {
        const data = this.load();
        data.sessions[dayId] = sessionData;
        this.save(data);
    },
    
    completeActivity(dayId) {
        const session = this.getSessionData(dayId);
        session.activitiesCompleted++;
        session.lastPlayed = new Date().toISOString();
        
        if (session.activitiesCompleted >= session.totalActivities) {
            session.completed = true;
        }
        
        this.saveSessionData(dayId, session);
        return session;
    },
    
    /* ========== Mastery Tracking ========== */
    recordAttempt(skillId, correct) {
        const data = this.load();
        
        if (!data.mastery[skillId]) {
            data.mastery[skillId] = {
                attempts: 0,
                correct: 0,
                streak: 0,
                lastSeen: null
            };
        }
        
        const mastery = data.mastery[skillId];
        mastery.attempts++;
        mastery.correct += correct ? 1 : 0;
        mastery.streak = correct ? mastery.streak + 1 : 0;
        mastery.lastSeen = new Date().toISOString();
        
        this.save(data);
        return mastery;
    },
    
    getMastery(skillId) {
        const data = this.load();
        return data.mastery[skillId] || null;
    },
    
    isMastered(skillId) {
        const mastery = this.getMastery(skillId);
        if (!mastery) return false;
        // 3 correct in a row across different sessions
        return mastery.streak >= 3;
    },
    
    /* ========== Settings ========== */
    getSettings() {
        const data = this.load();
        return data.settings;
    },
    
    saveSettings(settings) {
        const data = this.load();
        data.settings = { ...data.settings, ...settings };
        this.save(data);
    },
    
    getChildInfo() {
        const data = this.load();
        return {
            name: data.childName,
            age: data.childAge
        };
    },
    
    saveChildInfo(name, age) {
        const data = this.load();
        data.childName = name;
        data.childAge = age;
        this.save(data);
    },
    
    /* ========== Progress Overview ========== */
    getWeekProgress(week = 1) {
        const data = this.load();
        const sessions = ['day1', 'day2', 'day3', 'day4', 'day5'];
        let completed = 0;
        let total = 5;
        
        sessions.forEach(dayId => {
            if (data.sessions[dayId]?.completed) {
                completed++;
            }
        });
        
        return { completed, total };
    },
    
    getSubjectProgress() {
        const data = this.load();
        const mastery = data.mastery;
        
        const subjects = {
            'self': { name: '認識自己', started: 0, mastered: 0 },
            'colours': { name: '顏色', started: 0, mastered: 0 },
            'numbers': { name: '數字', started: 0, mastered: 0 },
            'shapes': { name: '形狀', started: 0, mastered: 0 },
            'english': { name: '英文', started: 0, mastered: 0 },
            'sel': { name: '社交情緒', started: 0, mastered: 0 }
        };
        
        Object.keys(mastery).forEach(skillId => {
            const [subject] = skillId.split('-');
            if (subjects[subject]) {
                subjects[subject].started++;
                if (this.isMastered(skillId)) {
                    subjects[subject].mastered++;
                }
            }
        });
        
        return subjects;
    },
    
    /* ========== Export/Import ========== */
    exportProgress() {
        const data = this.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `k1_progress_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    importProgress(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.save(data);
                    resolve(data);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },
    
    resetProgress() {
        this.save(this.getDefaultData());
    }
};
