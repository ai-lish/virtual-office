const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// API endpoint to get OpenClaw sessions
app.get('/api/sessions', async (req, res) => {
    try {
        // Get sessions from OpenClaw
        exec('openclaw sessions list --active 30 --json', { encoding: 'utf8' }, (error, stdout, stderr) => {
            if (error) {
                console.error('Error fetching sessions:', error);
                // Return simulated data if OpenClaw not available
                res.json({
                    brain: {
                        status: 'active',
                        activity: getSimulatedActivity()
                    },
                    tester: {
                        status: Math.random() > 0.7 ? 'active' : 'idle',
                        activity: Math.random() > 0.7 ? '執行測試中...' : 'Idle - 等待任務'
                    },
                    dev: {
                        status: 'active',
                        activity: Math.random() > 0.8 ? 'Debugging... 🔧' : '開發中...'
                    }
                });
                return;
            }

            try {
                const sessions = JSON.parse(stdout || '[]');
                
                // Determine agent status based on sessions
                const sessionCount = sessions.length;
                const hasRecentActivity = sessionCount > 0;

                res.json({
                    brain: {
                        status: hasRecentActivity ? 'active' : 'idle',
                        activity: hasRecentActivity 
                            ? `處理中 (${sessionCount} sessions)` 
                            : '等待新任務'
                    },
                    tester: {
                        status: Math.random() > 0.5 ? 'active' : 'idle',
                        activity: Math.random() > 0.5 ? '執行測試中...' : 'Idle - 等待任務'
                    },
                    dev: {
                        status: 'active',
                        activity: Math.random() > 0.3 ? '開發中...' : 'Debugging... 🔧'
                    }
                });
            } catch (parseError) {
                console.error('Parse error:', parseError);
                res.json({
                    brain: { status: 'active', activity: getSimulatedActivity() },
                    tester: { status: 'idle', activity: 'Idle - 等待任務' },
                    dev: { status: 'active', activity: '開發中...' }
                });
            }
        });
    } catch (err) {
        console.error('API error:', err);
        res.json({
            brain: { status: 'active', activity: getSimulatedActivity() },
            tester: { status: 'idle', activity: 'Idle - 等待任務' },
            dev: { status: 'active', activity: '開發中...' }
        });
    }
});

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

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Virtual Office running at http://localhost:${PORT}`);
    console.log(`📱 API endpoint: http://localhost:${PORT}/api/sessions`);
});
