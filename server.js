const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Helper function for simulated activity
function getSimulatedActivity() {
    const activities = [
        '處理請求中...',
        '分析數據中...',
        '回覆訊息...',
        '規劃任務中...',
        '学习中...'
    ];
    return activities[Math.floor(Math.random() * activities.length)];
}

// API endpoint - returns data in format frontend expects: { main: {...}, subagents: [...] }
function getSessionData(res) {
    exec('openclaw sessions list --active 30 --json', { encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
            console.error('Error fetching sessions:', error);
            res.json({
                main: { name: 'brain', status: 'active', lastActivity: new Date().toISOString() },
                subagents: [
                    { name: 'tester', status: 'idle', lastActivity: new Date(Date.now() - 600000).toISOString() },
                    { name: 'dev', status: 'active', lastActivity: new Date().toISOString() }
                ]
            });
            return;
        }

        try {
            const sessions = JSON.parse(stdout || '[]');
            const sessionCount = sessions.length;
            const hasRecentActivity = sessionCount > 0;

            res.json({
                main: {
                    name: 'brain',
                    status: hasRecentActivity ? 'active' : 'idle',
                    lastActivity: hasRecentActivity ? new Date().toISOString() : new Date(Date.now() - 300000).toISOString()
                },
                subagents: [
                    {
                        name: 'tester',
                        status: Math.random() > 0.5 ? 'active' : 'idle',
                        lastActivity: new Date(Date.now() - (Math.random() > 0.5 ? 60000 : 600000)).toISOString()
                    },
                    {
                        name: 'dev',
                        status: 'active',
                        lastActivity: new Date().toISOString()
                    }
                ]
            });
        } catch (parseError) {
            res.json({
                main: { name: 'brain', status: 'active', lastActivity: new Date().toISOString() },
                subagents: [
                    { name: 'tester', status: 'idle', lastActivity: new Date(Date.now() - 600000).toISOString() },
                    { name: 'dev', status: 'active', lastActivity: new Date().toISOString() }
                ]
            });
        }
    });
}

// /api/stats endpoint
app.get('/api/stats', async (req, res) => {
    getSessionData(res);
});

// /api/sessions endpoint (same as /api/stats)
app.get('/api/sessions', async (req, res) => {
    getSessionData(res);
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Virtual Office running at http://localhost:${PORT}`);
    console.log(`📱 API endpoints: http://localhost:${PORT}/api/stats, /api/sessions`);
});
