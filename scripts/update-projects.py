import re

with open('/Users/zachli/.openclaw/workspace/virtual-office/index.html', 'r') as f:
    content = f.read()

replacements = [
    ("全方位學習日", """全方位學習日',
                status: 'completed',
                statusText: '已完成',
                startDate: '2026-02-15',
                targetDate: '2026-03-26',
                link: 'https://ai-lish.github.io/lsc-ole-s1-2026/',
                github: 'https://github.com/ai-lish/lsc-ole-s1-2026',
                summary: 'S1全方位學習日網站，包含首頁/老師版，活動日期：2026年3月26日',
                description: 'S1全方位學習日網站，包含首頁(學生/家長)、老師版。耗時：製作~131分，測試~80分。已完成所有功能，活動順利完成。',
                timeline: [
                    { date: '2026-02-15', event: '項目啟動', detail: '確認活動日期、地點' },
                    { date: '2026-02-20', event: '分工安排', detail: '確認各老師職責' },
                    { date: '2026-03-07', event: '網站更新', detail: '新架構：首頁/老師版' },
                    { date: '2026-03-08', event: '文件上傳', detail: 'Logo、工作指引、地圖、漁館、統計圖' },
                    { date: '2026-03-26', event: '活動進行', detail: '學生參與活動' }
                ],
                feasibility: {
                    '學生報名': '100%',
                    '老師管理': '100%',
                    '實時統計': '100%',
                    '家長查詢': '100%'
                },
                currentPhase: 5,
                modules: [
                    { name: '學生報名系統', status: 'completed' },
                    { name: '老師管理版', status: 'completed' },
                    { name: 'Logo + 視覺設計', status: 'completed' },
                    { name: '地圖 + 指引', status: 'completed' },
                    { name: '統計圖表', status: 'completed' }
                ],
                blockers: []""",
     "全方位學習日",
     """全方位學習日',
                status: 'completed',
                statusText: '已完成',
                startDate: '2026-02-15',
                targetDate: '2026-03-26',
                link: 'https://ai-lish.github.io/lsc-ole-s1-2026/',
                github: 'https://github.com/ai-lish/lsc-ole-s1-2026',
                summary: 'S1全方位學習日網站，包含首頁/老師版，活動日期：2026年3月26日',
                description: 'S1全方位學習日網站，包含首頁(學生/家長)、老師版。耗時：製作~131分，測試~80分。已完成所有功能，活動順利完成。',
                timeline: [
                    { date: '2026-02-15', event: '項目啟動', detail: '確認活動日期、地點' },
                    { date: '2026-02-20', event: '分工安排', detail: '確認各老師職責' },
                    { date: '2026-03-07', event: '網站更新', detail: '新架構：首頁/老師版' },
                    { date: '2026-03-08', event: '文件上傳', detail: 'Logo、工作指引、地圖、漁館、統計圖' },
                    { date: '2026-03-26', event: '活動進行', detail: '學生參與活動' }
                ],
                feasibility: {
                    '學生報名': '100%',
                    '老師管理': '100%',
                    '實時統計': '100%',
                    '家長查詢': '100%'
                },
                currentPhase: 5,
                modules: [
                    { name: '學生報名系統', status: 'completed' },
                    { name: '老師管理版', status: 'completed' },
                    { name: 'Logo + 視覺設計', status: 'completed' },
                    { name: '地圖 + 指引', status: 'completed' },
                    { name: '統計圖表', status: 'completed' }
                ],
                blockers: []"""),
]

# Actually let's just do a simpler approach - update key sections
projects_to_update = {
    '全方位學習日': {
        'feasibility': "{ '學生報名': '100%', '老師管理': '100%', '實時統計': '100%', '家長查詢': '100%' }",
        'currentPhase': '5',
        'modules': "[{ name: '學生報名系統', status: 'completed' }, { name: '老師管理版', status: 'completed' }, { name: 'Logo + 視覺設計', status: 'completed' }, { name: '地圖 + 指引', status: 'completed' }, { name: '統計圖表', status: 'completed' }]",
        'blockers': '[]',
        'description_suffix': '已完成所有功能，活動順利完成。'
    }
}

# Find each project block and insert new fields before the closing },
for pname, fields in projects_to_update.items():
    # Find the project's timeline block and add fields after it
    pattern = f"name: '{pname}',"
    idx = content.find(pattern)
    if idx == -1:
        print(f"NOT FOUND: {pname}")
        continue
    
    # Find the timeline ]} closing after this project's name
    timeline_end = content.find(']', idx)
    brace_end = content.find('}', timeline_end)
    timeline_close = content.find(']', timeline_end + 1)
    brace_close2 = content.find('}', brace_end + 1)
    
    # Find the actual closing of the timeline block (has ] and then a } on same context)
    search_start = idx
    while True:
        next_bracket = content.find(']', search_start)
        next_brace = content.find('}', search_start)
        if next_bracket == -1:
            break
        if next_brace < next_bracket and next_brace != -1:
            search_start = next_brace + 1
            continue
        # Next bracket is timeline closing
        # Check if followed by }
        rest = content[next_bracket:next_bracket+5]
        if rest.startswith(']'):
            brace_after = content.find('}', next_bracket)
            if brace_after != -1 and brace_after <= next_bracket + 10:
                # Found timeline close ]
                insert_pos = next_bracket + 1
                new_fields = f""",
                feasibility: {{
                    '學生報名': '100%',
                    '老師管理': '100%',
                    '實時統計': '100%',
                    '家長查詢': '100%'
                }},
                currentPhase: 5,
                modules: [
                    {{ name: '學生報名系統', status: 'completed' }},
                    {{ name: '老師管理版', status: 'completed' }},
                    {{ name: 'Logo + 視覺設計', status: 'completed' }},
                    {{ name: '地圖 + 指引', status: 'completed' }},
                    {{ name: '統計圖表', status: 'completed' }}
                ],
                blockers: []"""
                content = content[:insert_pos] + new_fields + content[insert_pos:]
                print(f"Updated: {pname}")
                break
        search_start = next_bracket + 1

with open('/Users/zachli/.openclaw/workspace/virtual-office/index.html', 'w') as f:
    f.write(content)
print("Done")
