// 自律小助手 v4 - 周规划入口 + 积分 + 扇形图

const Storage = {
    get(key, def) {
        const d = localStorage.getItem('sd_' + key);
        return d ? JSON.parse(d) : def;
    },
    set(key, val) {
        localStorage.setItem('sd_' + key, JSON.stringify(val));
    }
};

// 日期工具
const DateUtil = {
    today() {
        return new Date().toDateString();
    },
    isSunday() {
        return new Date().getDay() === 0;
    },
    formatDate(dateStr) {
        const d = new Date(dateStr);
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
    },
    getWeekDates() {
        const dates = [];
        const d = new Date();
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            if (date <= new Date()) {
                dates.push(date.toDateString());
            }
        }
        return dates;
    }
};

// 状态
const state = {
    baseTaskTemplates: Storage.get('baseTaskTemplates', []),
    baseTaskRecords: Storage.get('baseTaskRecords', {}),
    dailyTasks: Storage.get('dailyTasks', {}),
    presetTasks: Storage.get('presetTasks', {}), // { dayOfWeek: [tasks] }
    completionHistory: Storage.get('completionHistory', {}), // { date: [{task, time}] }
    incomeRecords: Storage.get('incomeRecords', {}), // { date: [{amount, type, time}] }
    incomeTypes: Storage.get('incomeTypes', []),
    monthGoal: Storage.get('monthGoal', 10000),
    yearGoal: Storage.get('yearGoal', 100000),
    monthTasks: Storage.get('monthTasks', []), // 月度计划任务
    yearTasks: Storage.get('yearTasks', []), // 年度计划任务
    totalIncome: Storage.get('totalIncome', 0),
    currentPeriod: 7, // 默认一周
    projects: Storage.get('projects', []), // 项目列表
    currentProjectView: 'all', // 当前查看的项目
    cloudSyncEnabled: Storage.get('cloudSyncEnabled', false),
    cloudUserId: Storage.get('cloudUserId', ''),
    totalPoints: Storage.get('totalPoints', 0),
    todayPoints: Storage.get('todayPoints', { date: '', points: 0 }),
    streak: Storage.get('streak', 0),
    bestStreak: Storage.get('bestStreak', 0),
    lastActiveDate: Storage.get('lastActiveDate', null),
    achievements: Storage.get('achievements', {})
};

// 云同步配置 - 已移除，推荐使用浏览器自带同步功能

// 简单的加密/解密函数
function simpleEncrypt(text, password) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ password.charCodeAt(i % password.length);
        result += String.fromCharCode(charCode);
    }
    return btoa(result); // Base64编码
}

function simpleDecrypt(encrypted, password) {
    try {
        const text = atob(encrypted); // Base64解码
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ password.charCodeAt(i % password.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    } catch (e) {
        return null;
    }
}

// 成就定义 - 扩展版
const achievements = [
    // 任务完成系列
    { id: 'first', icon: '🌟', name: '初出茅庐', desc: '完成第一个任务', detail: '完成你的第一个任务，开启自律之旅！', level: 1 },
    { id: 'task10', icon: '🎯', name: '小有成就', desc: '累计完成10个任务', detail: '累计完成10个任务，你已经开始养成好习惯了！', level: 1 },
    { id: 'task30', icon: '🎪', name: '渐入佳境', desc: '累计完成30个任务', detail: '累计完成30个任务，坚持就是胜利！', level: 2 },
    { id: 'task50', icon: '💎', name: '任务达人', desc: '累计完成50个任务', detail: '累计完成50个任务，你已经是任务达人了！', level: 2 },
    { id: 'task100', icon: '👑', name: '任务王者', desc: '累计完成100个任务', detail: '累计完成100个任务，你就是任务王者！', level: 3 },
    { id: 'task200', icon: '🏆', name: '任务大师', desc: '累计完成200个任务', detail: '累计完成200个任务，你已经是大师级别！', level: 3 },
    { id: 'task500', icon: '🎖️', name: '任务传奇', desc: '累计完成500个任务', detail: '累计完成500个任务，传奇就是你！', level: 4 },
    
    // 积分系列
    { id: 'pts50', icon: '💵', name: '积分新手', desc: '累计50积分', detail: '累计获得50积分，继续加油！', level: 1 },
    { id: 'pts100', icon: '💰', name: '百分先生', desc: '累计100积分', detail: '累计获得100积分，你很棒！', level: 1 },
    { id: 'pts300', icon: '💸', name: '积分高手', desc: '累计300积分', detail: '累计获得300积分，你是积分高手！', level: 2 },
    { id: 'pts500', icon: '💎', name: '积分富翁', desc: '累计500积分', detail: '累计获得500积分，你已经很富有了！', level: 2 },
    { id: 'pts1000', icon: '👑', name: '积分王者', desc: '累计1000积分', detail: '累计获得1000积分，你就是积分王者！', level: 3 },
    { id: 'pts2000', icon: '🏆', name: '积分大亨', desc: '累计2000积分', detail: '累计获得2000积分，你是真正的大亨！', level: 4 },
    
    // 连续天数系列
    { id: 'streak3', icon: '🔥', name: '三天坚持', desc: '连续3天完成所有任务', detail: '连续3天完成所有任务，好的开始！', level: 1 },
    { id: 'streak7', icon: '⚡', name: '一周达人', desc: '连续7天完成所有任务', detail: '连续7天完成所有任务，你很有毅力！', level: 2 },
    { id: 'streak14', icon: '🌈', name: '两周勇士', desc: '连续14天完成所有任务', detail: '连续14天完成所有任务，你是真正的勇士！', level: 3 },
    { id: 'streak21', icon: '🎯', name: '三周英雄', desc: '连续21天完成所有任务', detail: '连续21天完成所有任务，习惯已经养成！', level: 3 },
    { id: 'streak30', icon: '🏅', name: '月度冠军', desc: '连续30天完成所有任务', detail: '连续30天完成所有任务，你就是冠军！', level: 4 },
    { id: 'streak60', icon: '🌟', name: '双月传奇', desc: '连续60天完成所有任务', detail: '连续60天完成所有任务，你是传奇！', level: 4 },
    { id: 'streak100', icon: '💫', name: '百日宗师', desc: '连续100天完成所有任务', detail: '连续100天完成所有任务，你已经是宗师级别！', level: 5 },
    
    // 完美天数系列
    { id: 'perfect3', icon: '⭐', name: '完美三天', desc: '本周3天完美完成', detail: '本周有3天完美完成所有任务！', level: 1 },
    { id: 'perfect5', icon: '✨', name: '完美五天', desc: '本周5天完美完成', detail: '本周有5天完美完成所有任务，太棒了！', level: 2 },
    { id: 'perfect7', icon: '🌟', name: '完美一周', desc: '本周全部完美完成', detail: '本周7天全部完美完成，你是完美主义者！', level: 3 },
    
    // 单日任务系列
    { id: 'day5', icon: '🎈', name: '忙碌的一天', desc: '单日完成5个任务', detail: '在一天内完成5个任务，效率很高！', level: 1 },
    { id: 'day10', icon: '🎊', name: '超级一天', desc: '单日完成10个任务', detail: '在一天内完成10个任务，你太厉害了！', level: 2 },
    { id: 'day15', icon: '🎉', name: '疯狂一天', desc: '单日完成15个任务', detail: '在一天内完成15个任务，简直疯狂！', level: 3 },
    
    // 早起系列
    { id: 'early1', icon: '🌅', name: '早起鸟', desc: '早上6点前完成任务', detail: '在早上6点前完成第一个任务，早起的鸟儿有虫吃！', level: 1 },
    { id: 'early7', icon: '🌄', name: '晨光战士', desc: '连续7天早起完成任务', detail: '连续7天在早上6点前完成任务，你是晨光战士！', level: 2 },
    
    // 项目系列
    { id: 'project1', icon: '📁', name: '项目启动', desc: '创建第一个项目', detail: '创建你的第一个项目，开始规划吧！', level: 1 },
    { id: 'project3', icon: '📂', name: '项目管理者', desc: '创建3个项目', detail: '创建3个项目，你是优秀的项目管理者！', level: 2 },
    { id: 'project5', icon: '📊', name: '项目大师', desc: '创建5个项目', detail: '创建5个项目，你是项目管理大师！', level: 3 },
    
    // 收入系列
    { id: 'income1', icon: '💵', name: '首笔收入', desc: '记录第一笔收入', detail: '记录你的第一笔收入，财富之路开始了！', level: 1 },
    { id: 'income10', icon: '💰', name: '收入记录者', desc: '记录10笔收入', detail: '记录10笔收入，你很会记账！', level: 2 },
    { id: 'incomeGoal', icon: '🎯', name: '目标达成', desc: '达成收入目标', detail: '达成你设定的收入目标，恭喜！', level: 3 }
];

// 初始化
function init() {
    checkTodayPoints();
    applyPresetTasks(); // 应用预设任务
    cleanOldData();
    renderAll();
    setupEvents();
}

// 应用预设任务到当日
function applyPresetTasks() {
    const today = DateUtil.today();
    const dayOfWeek = new Date().getDay();
    const presets = state.presetTasks[dayOfWeek] || [];
    
    if (presets.length === 0) return;
    
    // 检查是否已经应用过
    const appliedKey = 'presetApplied_' + today;
    if (Storage.get(appliedKey, false)) return;
    
    // 初始化今日任务
    if (!state.dailyTasks[today]) state.dailyTasks[today] = [];
    
    // 添加预设任务
    presets.forEach(p => {
        state.dailyTasks[today].push({
            id: Date.now() + Math.random(),
            text: p.text,
            points: p.points,
            completed: false,
            fromPreset: true
        });
    });
    
    Storage.set('dailyTasks', state.dailyTasks);
    Storage.set(appliedKey, true);
}

// 检查今日积分
function checkTodayPoints() {
    const today = DateUtil.today();
    if (state.todayPoints.date !== today) {
        state.todayPoints = { date: today, points: 0 };
        Storage.set('todayPoints', state.todayPoints);
    }
}

// 清理旧数据
function cleanOldData() {
    const weekDates = DateUtil.getWeekDates();
    
    Object.keys(state.dailyTasks).forEach(date => {
        if (!weekDates.includes(date)) delete state.dailyTasks[date];
    });
    Storage.set('dailyTasks', state.dailyTasks);
    
    Object.keys(state.baseTaskRecords).forEach(date => {
        if (!weekDates.includes(date)) delete state.baseTaskRecords[date];
    });
    Storage.set('baseTaskRecords', state.baseTaskRecords);
}

// 渲染所有
function renderAll() {
    renderDateInfo();
    renderQuickStats();
    renderProjects();
    renderBaseTasks();
    renderDailyTasks();
    renderTodayChart();
    renderWeekChart();
    renderPoints();
    renderIncome();
    renderIncomplete();
    renderHistory();
    renderAchievements();
    updateMotivation();
}

// 渲染日期
function renderDateInfo() {
    const d = new Date();
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    document.getElementById('dateInfo').textContent = 
        `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}`;
}

// 渲染快速统计
function renderQuickStats() {
    document.getElementById('streak').textContent = state.streak;
    document.getElementById('totalPoints').textContent = state.totalPoints;
}

// 渲染项目统计
function renderProjects() {
    renderProjectTabs();
    renderProjectProgress();
    renderProjectSelects();
}

// 渲染项目标签
function renderProjectTabs() {
    const tabs = document.getElementById('projectFilterTabs');
    const allTab = '<button class="project-tab active" data-project="all">全部</button>';
    const projectTabs = state.projects.map(p => 
        `<button class="project-tab" data-project="${p.id}" style="border-color:${p.color};">${p.name}</button>`
    ).join('');
    tabs.innerHTML = allTab + projectTabs;
}

// 获取日期范围内的任务统计
function getProjectStats(projectId, startDate, endDate) {
    let completed = 0, total = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 遍历日期范围
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        
        // 基础任务
        const baseRecord = state.baseTaskRecords[dateStr] || {};
        state.baseTaskTemplates.forEach(t => {
            if (projectId === 'all' || t.projectId == projectId) {
                total++;
                if (baseRecord[t.id]) completed++;
            }
        });
        
        // 当日任务
        const dailyTasks = state.dailyTasks[dateStr] || [];
        dailyTasks.forEach(t => {
            if (projectId === 'all' || t.projectId == projectId) {
                total++;
                if (t.completed) completed++;
            }
        });
    }
    
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

// 渲染项目进度
function renderProjectProgress() {
    const list = document.getElementById('projectProgressList');
    const today = new Date();
    const todayStr = today.toDateString();
    
    // 本周开始
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    
    // 本月开始
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // 本年开始
    const yearStart = new Date(today.getFullYear(), 0, 1);
    
    const projectsToShow = state.currentProjectView === 'all' 
        ? [{ id: 'all', name: '全部项目', color: '#667eea' }, ...state.projects]
        : state.projects.filter(p => p.id === state.currentProjectView);
    
    if (projectsToShow.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">还没有项目，点击⚙️添加</p>';
        return;
    }
    
    list.innerHTML = projectsToShow.map(p => {
        const dayStats = getProjectStats(p.id, todayStr, todayStr);
        const weekStats = getProjectStats(p.id, weekStart.toDateString(), todayStr);
        const monthStats = getProjectStats(p.id, monthStart.toDateString(), todayStr);
        const yearStats = getProjectStats(p.id, yearStart.toDateString(), todayStr);
        
        return `
            <div class="project-progress-item" style="border-left-color:${p.color}">
                <div class="project-progress-header">
                    <span class="project-name">${escapeHtml(p.name)}</span>
                </div>
                <div class="project-stats-grid">
                    <div class="project-stat-item">
                        <span class="project-stat-label">今日</span>
                        <span class="project-stat-value">${dayStats.percent}%</span>
                        <span class="project-stat-label">${dayStats.completed}/${dayStats.total}</span>
                    </div>
                    <div class="project-stat-item">
                        <span class="project-stat-label">本周</span>
                        <span class="project-stat-value">${weekStats.percent}%</span>
                        <span class="project-stat-label">${weekStats.completed}/${weekStats.total}</span>
                    </div>
                    <div class="project-stat-item">
                        <span class="project-stat-label">本月</span>
                        <span class="project-stat-value">${monthStats.percent}%</span>
                        <span class="project-stat-label">${monthStats.completed}/${monthStats.total}</span>
                    </div>
                    <div class="project-stat-item">
                        <span class="project-stat-label">本年</span>
                        <span class="project-stat-value">${yearStats.percent}%</span>
                        <span class="project-stat-label">${yearStats.completed}/${yearStats.total}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 渲染项目选择器
function renderProjectSelects() {
    const selects = ['dailyTaskProject', 'planTaskProject', 'presetTaskProject', 'monthTaskProject', 'yearTaskProject'];
    const options = '<option value="">无项目</option>' + 
        state.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = options;
    });
}

// 获取今日基础任务
function getTodayBaseTasks() {
    const today = DateUtil.today();
    const record = state.baseTaskRecords[today] || {};
    return state.baseTaskTemplates.map(t => ({ ...t, completed: !!record[t.id] }));
}

// 获取今日临时任务
function getTodayDailyTasks() {
    return state.dailyTasks[DateUtil.today()] || [];
}

// 渲染基础任务
function renderBaseTasks() {
    const list = document.getElementById('baseTaskList');
    const tasks = getTodayBaseTasks();
    
    if (tasks.length === 0) {
        list.innerHTML = '<p class="task-empty">点击右上角「📅 周规划」添加每日基础任务</p>';
        return;
    }
    
    list.innerHTML = tasks.map(t => {
        const project = state.projects.find(p => p.id === t.projectId);
        const projectTag = project ? `<span class="task-project-tag" style="background:${project.color}">${project.name}</span>` : '';
        
        return `
            <div class="task-item ${t.completed ? 'completed' : ''}">
                <input type="checkbox" class="task-checkbox" data-type="base" data-id="${t.id}" 
                       ${t.completed ? 'checked disabled' : ''}>
                <span class="task-text">${escapeHtml(t.text)}</span>
                ${projectTag}
                <span class="task-points">+${t.points}分</span>
            </div>
        `;
    }).join('');
}

// 渲染当日任务
function renderDailyTasks() {
    const list = document.getElementById('dailyTaskList');
    const tasks = getTodayDailyTasks();
    
    if (tasks.length === 0) {
        list.innerHTML = '<p class="task-empty">今天还没有临时任务</p>';
        return;
    }
    
    list.innerHTML = tasks.map((t, i) => {
        const project = state.projects.find(p => p.id === t.projectId);
        const projectTag = project ? `<span class="task-project-tag" style="background:${project.color}">${project.name}</span>` : '';
        
        return `
            <div class="task-item ${t.completed ? 'completed' : ''}">
                <input type="checkbox" class="task-checkbox" data-type="daily" data-index="${i}" 
                       ${t.completed ? 'checked disabled' : ''}>
                <span class="task-text">${escapeHtml(t.text)}</span>
                ${projectTag}
                <span class="task-points">+${t.points}分</span>
                ${!t.completed ? `<button class="task-edit" data-index="${i}">✏️</button>` : ''}
                <button class="task-delete" data-index="${i}">🗑️</button>
            </div>
        `;
    }).join('');
}

// 编辑当日任务
function editDailyTask(index) {
    const today = DateUtil.today();
    const tasks = state.dailyTasks[today];
    if (!tasks || !tasks[index] || tasks[index].completed) return;
    
    const task = tasks[index];
    const newText = prompt('编辑任务内容：', task.text);
    if (newText !== null && newText.trim()) {
        tasks[index].text = newText.trim();
        Storage.set('dailyTasks', state.dailyTasks);
        renderAll();
    }
}


// 渲染今日扇形图
function renderTodayChart() {
    const baseTasks = getTodayBaseTasks();
    const dailyTasks = getTodayDailyTasks();
    const all = [...baseTasks, ...dailyTasks];
    
    const done = all.filter(t => t.completed).length;
    const pending = all.filter(t => !t.completed).length;
    const total = all.length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    
    document.getElementById('todayDone').textContent = done;
    document.getElementById('todayPending').textContent = pending;
    document.getElementById('todayPercent').textContent = percent + '%';
    document.getElementById('todayCircle').setAttribute('stroke-dasharray', `${percent}, 100`);
}

// 渲染本周扇形图
function renderWeekChart() {
    const weekDates = DateUtil.getWeekDates();
    let weekDone = 0, weekPending = 0, perfectCount = 0;
    
    weekDates.forEach(date => {
        const baseRecord = state.baseTaskRecords[date] || {};
        const dailyTasks = state.dailyTasks[date] || [];
        
        const baseCompleted = state.baseTaskTemplates.filter(t => baseRecord[t.id]).length;
        const basePending = state.baseTaskTemplates.length - baseCompleted;
        const dailyCompleted = dailyTasks.filter(t => t.completed).length;
        const dailyPending = dailyTasks.filter(t => !t.completed).length;
        
        weekDone += baseCompleted + dailyCompleted;
        weekPending += basePending + dailyPending;
        
        const totalT = state.baseTaskTemplates.length + dailyTasks.length;
        const doneT = baseCompleted + dailyCompleted;
        if (totalT > 0 && doneT === totalT) perfectCount++;
    });
    
    const total = weekDone + weekPending;
    const percent = total > 0 ? Math.round((weekDone / total) * 100) : 0;
    
    document.getElementById('weekDone').textContent = weekDone;
    document.getElementById('weekPending').textContent = weekPending;
    document.getElementById('perfectDays').textContent = perfectCount;
    document.getElementById('weekPercent').textContent = percent + '%';
    document.getElementById('weekCircle').setAttribute('stroke-dasharray', `${percent}, 100`);
}

// 渲染积分
function renderPoints() {
    document.getElementById('pointsTotal').textContent = state.totalPoints;
    document.getElementById('pointsToday').textContent = '+' + state.todayPoints.points;
}

// 渲染收入模块
function renderIncome() {
    renderIncomeTypeSelect();
    renderIncomeReport();
    renderIncomeChart();
    renderIncomeDetail();
    renderIncomeGoalProgress();
}

// 渲染收入类型选择器
function renderIncomeTypeSelect() {
    const select = document.getElementById('incomeTypeSelect');
    select.innerHTML = state.incomeTypes.map(t => 
        `<option value="${t.id}" data-color="${t.color}">${t.name}</option>`
    ).join('');
}

// 渲染收入目标进度
function renderIncomeGoalProgress() {
    // 总收入
    document.getElementById('totalIncomeValue').textContent = '¥' + state.totalIncome.toFixed(2);
    
    // 计算本月收入
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = now;
    let monthIncome = 0;
    
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        const records = state.incomeRecords[dateStr] || [];
        records.forEach(r => monthIncome += r.amount);
    }
    
    // 计算本年收入
    const yearStart = new Date(now.getFullYear(), 0, 1);
    let yearIncome = 0;
    
    for (let d = new Date(yearStart); d <= now; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        const records = state.incomeRecords[dateStr] || [];
        records.forEach(r => yearIncome += r.amount);
    }
    
    // 月度目标
    document.getElementById('monthGoal').textContent = state.monthGoal.toLocaleString();
    document.getElementById('monthIncome').textContent = '¥' + monthIncome.toFixed(2);
    const monthPercent = state.monthGoal > 0 ? Math.min(100, Math.round((monthIncome / state.monthGoal) * 100)) : 0;
    document.getElementById('monthProgressFill').style.width = monthPercent + '%';
    document.getElementById('monthPercent').textContent = monthPercent + '%';
    
    // 年度目标
    document.getElementById('yearGoal').textContent = state.yearGoal.toLocaleString();
    document.getElementById('yearIncome').textContent = '¥' + yearIncome.toFixed(2);
    const yearPercent = state.yearGoal > 0 ? Math.min(100, Math.round((yearIncome / state.yearGoal) * 100)) : 0;
    document.getElementById('yearProgressFill').style.width = yearPercent + '%';
    document.getElementById('yearPercent').textContent = yearPercent + '%';
}

// 获取周期内的日期列表
function getPeriodDates(days) {
    const dates = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toDateString());
    }
    return dates;
}

// 渲染收入报表
function renderIncomeReport() {
    const dates = getPeriodDates(state.currentPeriod);
    let periodTotal = 0;
    
    dates.forEach(date => {
        const records = state.incomeRecords[date] || [];
        records.forEach(r => periodTotal += r.amount);
    });
    
    document.getElementById('periodIncome').textContent = '¥' + periodTotal.toFixed(2);
}

// 渲染收入柱状图
function renderIncomeChart() {
    const chartEl = document.getElementById('incomeBarChart');
    const legendEl = document.getElementById('incomeLegend');
    const dates = getPeriodDates(state.currentPeriod);
    
    // 计算每天每类型的收入
    const dailyData = [];
    let maxDayTotal = 0;
    
    dates.forEach(date => {
        const records = state.incomeRecords[date] || [];
        const byType = {};
        let dayTotal = 0;
        
        state.incomeTypes.forEach(t => byType[t.id] = 0);
        records.forEach(r => {
            const typeId = r.type || state.incomeTypes[0]?.id;
            if (byType[typeId] !== undefined) {
                byType[typeId] += r.amount;
            } else {
                byType[state.incomeTypes[0]?.id] = (byType[state.incomeTypes[0]?.id] || 0) + r.amount;
            }
            dayTotal += r.amount;
        });
        
        dailyData.push({ date, byType, total: dayTotal });
        if (dayTotal > maxDayTotal) maxDayTotal = dayTotal;
    });
    
    // 渲染柱状图
    const maxHeight = 70;
    chartEl.innerHTML = dailyData.map((d, i) => {
        const dateObj = new Date(d.date);
        const label = state.currentPeriod <= 7 
            ? ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()]
            : `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        
        const segments = state.incomeTypes.map(t => {
            const amount = d.byType[t.id] || 0;
            const height = maxDayTotal > 0 ? (amount / maxDayTotal) * maxHeight : 0;
            return `<div class="bar-segment" style="height:${height}px;background:${t.color};" title="${t.name}: ¥${amount.toFixed(2)}"></div>`;
        }).join('');
        
        return `
            <div class="bar-item">
                <div class="bar-stack" style="height:${maxHeight}px;">${segments}</div>
                <span class="bar-label">${label}</span>
            </div>
        `;
    }).join('');
    
    // 渲染图例
    legendEl.innerHTML = state.incomeTypes.map(t => `
        <div class="legend-tag">
            <span class="legend-color" style="background:${t.color};"></span>
            <span>${t.name}</span>
        </div>
    `).join('');
}

// 渲染收入明细
function renderIncomeDetail() {
    const listEl = document.getElementById('incomeDetailList');
    const today = DateUtil.today();
    const records = state.incomeRecords[today] || [];
    
    if (records.length === 0) {
        listEl.innerHTML = '<p class="empty-hint" style="padding:15px;">今日暂无收入记录</p>';
        return;
    }
    
    listEl.innerHTML = records.map((r, i) => {
        const type = state.incomeTypes.find(t => t.id === r.type) || state.incomeTypes[0];
        return `
            <div class="income-detail-item" style="border-left-color:${type?.color || '#e67e22'}">
                <span class="type-tag" style="background:${type?.color || '#e67e22'}">${type?.name || '其他'}</span>
                <span class="amount">¥${r.amount.toFixed(2)}</span>
                <span class="time">${r.time}</span>
                <button class="btn-del" data-index="${i}">🗑️</button>
            </div>
        `;
    }).join('');
}

// 添加收入
function addIncome() {
    const input = document.getElementById('incomeInput');
    const typeSelect = document.getElementById('incomeTypeSelect');
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) return;
    
    const today = DateUtil.today();
    if (!state.incomeRecords[today]) state.incomeRecords[today] = [];
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    state.incomeRecords[today].push({
        amount: amount,
        type: parseInt(typeSelect.value),
        time: timeStr
    });
    
    state.totalIncome += amount;
    
    Storage.set('incomeRecords', state.incomeRecords);
    Storage.set('totalIncome', state.totalIncome);
    
    input.value = '';
    renderIncome();
}

// 删除收入记录
function deleteIncomeRecord(index) {
    const today = DateUtil.today();
    const records = state.incomeRecords[today];
    if (records && records[index]) {
        state.totalIncome -= records[index].amount;
        records.splice(index, 1);
        Storage.set('incomeRecords', state.incomeRecords);
        Storage.set('totalIncome', state.totalIncome);
        renderIncome();
    }
}

// 设置收入目标
// 设置月度目标
function setMonthGoal() {
    const newGoal = prompt('请输入本月收入目标金额：', state.monthGoal);
    if (newGoal !== null) {
        const goal = parseFloat(newGoal);
        if (!isNaN(goal) && goal > 0) {
            state.monthGoal = goal;
            Storage.set('monthGoal', state.monthGoal);
            renderIncome();
        }
    }
}

// 设置年度目标
function setYearGoal() {
    const newGoal = prompt('请输入年度收入目标金额：', state.yearGoal);
    if (newGoal !== null) {
        const goal = parseFloat(newGoal);
        if (!isNaN(goal) && goal > 0) {
            state.yearGoal = goal;
            Storage.set('yearGoal', state.yearGoal);
            renderIncome();
        }
    }
}

// 切换报表周期
function switchPeriod(days) {
    state.currentPeriod = days;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.period) === days);
    });
    renderIncomeReport();
    renderIncomeChart();
}

// 收入类型管理
function openTypeModal() {
    renderTypeList();
    document.getElementById('incomeTypeModal').classList.remove('hidden');
}

function closeTypeModal() {
    document.getElementById('incomeTypeModal').classList.add('hidden');
}

function renderTypeList() {
    const list = document.getElementById('typeList');
    if (state.incomeTypes.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">还没有收入类型</p>';
        return;
    }
    list.innerHTML = state.incomeTypes.map((t, i) => `
        <div class="type-item">
            <span class="color-dot" style="background:${t.color}"></span>
            <span class="type-name">${escapeHtml(t.name)}</span>
            <button class="btn-del" data-index="${i}">🗑️</button>
        </div>
    `).join('');
}

function addIncomeType() {
    const nameInput = document.getElementById('newTypeName');
    const colorInput = document.getElementById('newTypeColor');
    const name = nameInput.value.trim();
    if (!name) return;
    
    state.incomeTypes.push({
        id: Date.now(),
        name: name,
        color: colorInput.value
    });
    
    Storage.set('incomeTypes', state.incomeTypes);
    nameInput.value = '';
    renderTypeList();
    renderIncome();
}

function deleteIncomeType(index) {
    state.incomeTypes.splice(index, 1);
    Storage.set('incomeTypes', state.incomeTypes);
    renderTypeList();
    renderIncome();
}

// 项目管理
function openProjectModal() {
    renderProjectList();
    document.getElementById('projectModal').classList.remove('hidden');
}

function closeProjectModal() {
    document.getElementById('projectModal').classList.add('hidden');
}

function renderProjectList() {
    const list = document.getElementById('projectList');
    if (state.projects.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">还没有项目</p>';
        return;
    }
    list.innerHTML = state.projects.map((p, i) => `
        <div class="type-item">
            <span class="color-dot" style="background:${p.color}"></span>
            <span class="type-name">${escapeHtml(p.name)}</span>
            <button class="btn-del" data-index="${i}">🗑️</button>
        </div>
    `).join('');
}

function addProject() {
    const nameInput = document.getElementById('newProjectName');
    const colorInput = document.getElementById('newProjectColor');
    const name = nameInput.value.trim();
    if (!name) return;
    
    state.projects.push({
        id: Date.now(),
        name: name,
        color: colorInput.value
    });
    
    Storage.set('projects', state.projects);
    nameInput.value = '';
    renderProjectList();
    renderAll();
}

function deleteProject(index) {
    state.projects.splice(index, 1);
    Storage.set('projects', state.projects);
    renderProjectList();
    renderAll();
}

// 数据同步功能
function openSyncModal() {
    document.getElementById('syncModal').classList.remove('hidden');
}

function closeSyncModal() {
    document.getElementById('syncModal').classList.add('hidden');
}

// 导出数据
function exportData() {
    const allData = {};
    
    // 收集所有localStorage数据
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('sd_')) {
            allData[key] = localStorage.getItem(key);
        }
    }
    
    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `自律助手数据_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showModal('✅ 导出成功', '数据已导出到文件，请妥善保管！');
}

// 导入数据
function importData() {
    document.getElementById('importFileInput').click();
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // 确认导入
            if (!confirm('导入数据会覆盖当前所有数据，确定要继续吗？')) {
                return;
            }
            
            // 导入数据
            Object.keys(data).forEach(key => {
                localStorage.setItem(key, data[key]);
            });
            
            showModal('✅ 导入成功', '数据已导入，页面将刷新以应用新数据。');
            setTimeout(() => location.reload(), 2000);
        } catch (err) {
            showModal('❌ 导入失败', '文件格式错误，请检查文件是否正确。');
        }
    };
    reader.readAsText(file);
}

// 生成同步码
function generateSyncCode() {
    const allData = {};
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('sd_')) {
            allData[key] = localStorage.getItem(key);
        }
    }
    
    const dataStr = JSON.stringify(allData);
    const encoded = btoa(encodeURIComponent(dataStr));
    
    document.getElementById('syncCodeOutput').value = encoded;
    showModal('✅ 同步码已生成', '同步码已生成，点击复制按钮复制到其他设备使用。');
}

// 复制同步码
function copySyncCode() {
    const textarea = document.getElementById('syncCodeOutput');
    if (!textarea.value) {
        showModal('⚠️ 提示', '请先生成同步码！');
        return;
    }
    
    textarea.select();
    document.execCommand('copy');
    showModal('✅ 复制成功', '同步码已复制到剪贴板！');
}

// 应用同步码
function applySyncCode() {
    const code = document.getElementById('syncCodeInput').value.trim();
    if (!code) {
        showModal('⚠️ 提示', '请先粘贴同步码！');
        return;
    }
    
    try {
        if (!confirm('应用同步码会覆盖当前所有数据，确定要继续吗？')) {
            return;
        }
        
        const dataStr = decodeURIComponent(atob(code));
        const data = JSON.parse(dataStr);
        
        Object.keys(data).forEach(key => {
            localStorage.setItem(key, data[key]);
        });
        
        showModal('✅ 同步成功', '数据已同步，页面将刷新以应用新数据。');
        setTimeout(() => location.reload(), 2000);
    } catch (err) {
        showModal('❌ 同步失败', '同步码格式错误，请检查是否完整复制。');
    }
}

// 云同步功能已移除 - 推荐使用 Edge 浏览器自带的同步功能
// 如需手动同步，请使用上方的"快速同步码"功能

// 渲染未完成任务
function renderIncomplete() {
    const list = document.getElementById('incompleteList');
    const weekDates = DateUtil.getWeekDates();
    let html = '';
    let hasIncomplete = false;
    
    weekDates.forEach(date => {
        const baseRecord = state.baseTaskRecords[date] || {};
        const dailyTasks = state.dailyTasks[date] || [];
        const incompleteTasks = [];
        
        state.baseTaskTemplates.forEach(t => {
            if (!baseRecord[t.id]) incompleteTasks.push({ text: t.text, type: '基础' });
        });
        
        dailyTasks.forEach(t => {
            if (!t.completed) incompleteTasks.push({ text: t.text, type: '临时' });
        });
        
        if (incompleteTasks.length > 0) {
            hasIncomplete = true;
            html += `
                <div class="incomplete-day">
                    <div class="incomplete-day-title">${DateUtil.formatDate(date)}</div>
                    ${incompleteTasks.map(t => `
                        <div class="incomplete-item">
                            <span>${escapeHtml(t.text)}</span>
                            <span class="task-type">${t.type}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    });
    
    list.innerHTML = hasIncomplete ? html : '<p class="empty-hint">暂无未完成任务，太棒了！🎉</p>';
}

// 渲染完成记录
function renderHistory() {
    const list = document.getElementById('historyList');
    const today = DateUtil.today();
    const history = state.completionHistory[today] || [];
    
    if (history.length === 0) {
        list.innerHTML = '<p class="empty-hint">还没有完成记录</p>';
        return;
    }
    
    list.innerHTML = history.map(h => `
        <div class="history-item">
            <span class="task-name">${escapeHtml(h.task)}</span>
            <span class="complete-time">${h.time}</span>
        </div>
    `).join('');
}

// 渲染成就
function renderAchievements() {
    const container = document.getElementById('badges');
    const stats = getAchievementStats();
    
    container.innerHTML = achievements.map(a => {
        const unlocked = checkSingleAchievement(a.id, stats);
        const levelClass = unlocked ? `level-${a.level}` : '';
        
        return `
            <div class="badge ${unlocked ? 'unlocked' : 'locked'} ${levelClass}">
                ${a.icon}
                ${unlocked ? `<span class="badge-level">${a.level}</span>` : ''}
                <div class="badge-tip">
                    <strong>${a.name}</strong><br>
                    ${a.detail}<br>
                    <span style="color:#ffd700;">等级 ${a.level}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 获取成就统计数据
function getAchievementStats() {
    const weekDates = DateUtil.getWeekDates();
    let perfectCount = 0;
    const today = DateUtil.today();
    const todayTasks = [...getTodayBaseTasks(), ...getTodayDailyTasks()];
    const todayCompleted = todayTasks.filter(t => t.completed).length;
    
    weekDates.forEach(date => {
        const baseRecord = state.baseTaskRecords[date] || {};
        const dailyTasks = state.dailyTasks[date] || [];
        const totalT = state.baseTaskTemplates.length + dailyTasks.length;
        const doneT = state.baseTaskTemplates.filter(t => baseRecord[t.id]).length + 
                      dailyTasks.filter(t => t.completed).length;
        if (totalT > 0 && doneT === totalT) perfectCount++;
    });
    
    // 检查早起
    const todayHistory = state.completionHistory[today] || [];
    const hasEarlyTask = todayHistory.some(h => {
        const [hour] = h.time.split(':').map(Number);
        return hour < 6;
    });
    
    // 统计早起天数
    let earlyDays = 0;
    weekDates.forEach(date => {
        const history = state.completionHistory[date] || [];
        if (history.some(h => {
            const [hour] = h.time.split(':').map(Number);
            return hour < 6;
        })) earlyDays++;
    });
    
    // 统计收入记录数
    let incomeCount = 0;
    Object.values(state.incomeRecords).forEach(records => {
        incomeCount += records.length;
    });
    
    return {
        totalTasks: Storage.get('totalTasksCompleted', 0),
        totalPoints: state.totalPoints,
        streak: state.streak,
        bestStreak: state.bestStreak,
        perfectCount,
        todayCompleted,
        hasEarlyTask,
        earlyDays,
        projectCount: state.projects.length,
        incomeCount,
        totalIncome: state.totalIncome,
        incomeGoal: state.incomeGoal
    };
}

// 检查单个成就是否解锁
function checkSingleAchievement(id, stats) {
    if (state.achievements[id]) return true;
    
    switch(id) {
        // 任务完成系列
        case 'first': return stats.totalTasks >= 1;
        case 'task10': return stats.totalTasks >= 10;
        case 'task30': return stats.totalTasks >= 30;
        case 'task50': return stats.totalTasks >= 50;
        case 'task100': return stats.totalTasks >= 100;
        case 'task200': return stats.totalTasks >= 200;
        case 'task500': return stats.totalTasks >= 500;
        
        // 积分系列
        case 'pts50': return stats.totalPoints >= 50;
        case 'pts100': return stats.totalPoints >= 100;
        case 'pts300': return stats.totalPoints >= 300;
        case 'pts500': return stats.totalPoints >= 500;
        case 'pts1000': return stats.totalPoints >= 1000;
        case 'pts2000': return stats.totalPoints >= 2000;
        
        // 连续天数系列
        case 'streak3': return stats.streak >= 3 || stats.bestStreak >= 3;
        case 'streak7': return stats.streak >= 7 || stats.bestStreak >= 7;
        case 'streak14': return stats.streak >= 14 || stats.bestStreak >= 14;
        case 'streak21': return stats.streak >= 21 || stats.bestStreak >= 21;
        case 'streak30': return stats.streak >= 30 || stats.bestStreak >= 30;
        case 'streak60': return stats.streak >= 60 || stats.bestStreak >= 60;
        case 'streak100': return stats.streak >= 100 || stats.bestStreak >= 100;
        
        // 完美天数系列
        case 'perfect3': return stats.perfectCount >= 3;
        case 'perfect5': return stats.perfectCount >= 5;
        case 'perfect7': return stats.perfectCount >= 7;
        
        // 单日任务系列
        case 'day5': return stats.todayCompleted >= 5;
        case 'day10': return stats.todayCompleted >= 10;
        case 'day15': return stats.todayCompleted >= 15;
        
        // 早起系列
        case 'early1': return stats.hasEarlyTask;
        case 'early7': return stats.earlyDays >= 7;
        
        // 项目系列
        case 'project1': return stats.projectCount >= 1;
        case 'project3': return stats.projectCount >= 3;
        case 'project5': return stats.projectCount >= 5;
        
        // 收入系列
        case 'income1': return stats.incomeCount >= 1;
        case 'income10': return stats.incomeCount >= 10;
        case 'incomeGoal': return stats.totalIncome >= stats.incomeGoal && stats.incomeGoal > 0;
        
        default: return false;
    }
}

// 更新激励语
function updateMotivation() {
    const msgs = [
        "开始你的第一个任务吧！",
        "每完成一个小任务，就离更好的自己更近一步 💪",
        "今天也要加油哦！",
        "你正在打败拖延症！🔥",
        "坚持就是胜利！",
        `已连续 ${state.streak} 天，继续保持！⚡`
    ];
    
    const baseTasks = getTodayBaseTasks();
    const dailyTasks = getTodayDailyTasks();
    const all = [...baseTasks, ...dailyTasks];
    const allDone = all.length > 0 && all.every(t => t.completed);
    
    document.getElementById('motivationText').textContent = allDone 
        ? "今日任务全部完成！🎊 太棒了！" 
        : msgs[Math.floor(Math.random() * msgs.length)];
}


// 添加当日任务
function addDailyTask() {
    const input = document.getElementById('dailyTaskInput');
    const points = document.getElementById('dailyTaskPoints');
    const projectSelect = document.getElementById('dailyTaskProject');
    const text = input.value.trim();
    if (!text) return;
    
    const today = DateUtil.today();
    if (!state.dailyTasks[today]) state.dailyTasks[today] = [];
    
    const projectId = projectSelect.value ? parseInt(projectSelect.value) : null;
    
    state.dailyTasks[today].push({
        id: Date.now(),
        text: text,
        points: parseInt(points.value),
        projectId: projectId,
        completed: false
    });
    
    Storage.set('dailyTasks', state.dailyTasks);
    input.value = '';
    renderAll();
}

// 删除当日任务
function deleteDailyTask(index) {
    const today = DateUtil.today();
    if (state.dailyTasks[today]) {
        state.dailyTasks[today].splice(index, 1);
        Storage.set('dailyTasks', state.dailyTasks);
        renderAll();
    }
}

// 完成任务
function completeTask(type, idOrIndex) {
    const today = DateUtil.today();
    let points = 0;
    let taskName = '';
    
    if (type === 'base') {
        if (!state.baseTaskRecords[today]) state.baseTaskRecords[today] = {};
        state.baseTaskRecords[today][idOrIndex] = true;
        Storage.set('baseTaskRecords', state.baseTaskRecords);
        const task = state.baseTaskTemplates.find(t => t.id == idOrIndex);
        if (task) {
            points = task.points || 10;
            taskName = task.text;
        }
    } else {
        const tasks = state.dailyTasks[today];
        if (tasks && tasks[idOrIndex]) {
            tasks[idOrIndex].completed = true;
            points = tasks[idOrIndex].points;
            taskName = tasks[idOrIndex].text;
            Storage.set('dailyTasks', state.dailyTasks);
        }
    }
    
    // 记录完成时间
    if (taskName) {
        if (!state.completionHistory[today]) state.completionHistory[today] = [];
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        state.completionHistory[today].push({
            task: taskName,
            time: timeStr
        });
        Storage.set('completionHistory', state.completionHistory);
    }
    
    // 更新积分
    state.totalPoints += points;
    state.todayPoints.points += points;
    Storage.set('totalPoints', state.totalPoints);
    Storage.set('todayPoints', state.todayPoints);
    
    // 更新完成任务数
    const total = Storage.get('totalTasksCompleted', 0) + 1;
    Storage.set('totalTasksCompleted', total);
    
    // 更新连续天数
    updateStreak();
    checkAchievements();
    renderAll();
    celebrate();
}

// 更新连续天数
function updateStreak() {
    const today = DateUtil.today();
    const baseTasks = getTodayBaseTasks();
    const dailyTasks = getTodayDailyTasks();
    const all = [...baseTasks, ...dailyTasks];
    const allDone = all.length > 0 && all.every(t => t.completed);
    
    if (allDone && state.lastActiveDate !== today) {
        if (state.lastActiveDate) {
            const last = new Date(state.lastActiveDate);
            const now = new Date(today);
            const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
            state.streak = diff === 1 ? state.streak + 1 : 1;
        } else {
            state.streak = 1;
        }
        
        state.lastActiveDate = today;
        Storage.set('lastActiveDate', today);
        Storage.set('streak', state.streak);
        
        if (state.streak > state.bestStreak) {
            state.bestStreak = state.streak;
            Storage.set('bestStreak', state.bestStreak);
        }
    }
}

// 检查成就
function checkAchievements() {
    const stats = getAchievementStats();
    let newAchievements = [];
    
    achievements.forEach(a => {
        if (state.achievements[a.id]) return;
        
        const unlocked = checkSingleAchievement(a.id, stats);
        if (unlocked) {
            state.achievements[a.id] = true;
            newAchievements.push(a);
        }
    });
    
    if (newAchievements.length > 0) {
        Storage.set('achievements', state.achievements);
        
        // 显示最高等级的成就
        const topAchievement = newAchievements.sort((a, b) => b.level - a.level)[0];
        
        showModal('🎉 解锁新成就！', `
            <div style="font-size:3.5rem;margin-bottom:10px;">${topAchievement.icon}</div>
            <strong style="font-size:1.2rem;">${topAchievement.name}</strong><br>
            <span style="color:#888;margin:8px 0;display:block;">${topAchievement.detail}</span>
            <span style="color:#ffd700;font-weight:bold;">⭐ 等级 ${topAchievement.level}</span>
            ${newAchievements.length > 1 ? `<br><span style="color:#999;font-size:0.9rem;">还解锁了 ${newAchievements.length - 1} 个其他成就！</span>` : ''}
        `);
    }
}

// 显示弹窗
function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').innerHTML = message;
    document.getElementById('modal').classList.remove('hidden');
}

// 庆祝动画
function celebrate() {
    const el = document.getElementById('celebration');
    el.innerHTML = '';
    el.classList.remove('hidden');
    
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fd79a8', '#a29bfe'];
    for (let i = 0; i < 30; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDelay = Math.random() * 0.5 + 's';
        c.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        el.appendChild(c);
    }
    setTimeout(() => el.classList.add('hidden'), 3000);
}

// 周规划相关
function openPlanModal() {
    renderPlanList();
    renderPresetList();
    document.getElementById('planModal').classList.remove('hidden');
}

function closePlanModal() {
    document.getElementById('planModal').classList.add('hidden');
}

function renderPlanList() {
    const list = document.getElementById('planTaskList');
    if (state.baseTaskTemplates.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">还没有基础任务，添加一些吧</p>';
        return;
    }
    list.innerHTML = state.baseTaskTemplates.map((t, i) => `
        <div class="plan-item">
            <span class="task-text">${escapeHtml(t.text)}</span>
            <button class="btn-del" data-index="${i}">🗑️</button>
        </div>
    `).join('');
}

function renderPresetList() {
    const list = document.getElementById('presetTaskList');
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    let html = '';
    let hasPresets = false;
    
    // 按周一到周日顺序显示
    [1, 2, 3, 4, 5, 6, 0].forEach(day => {
        const tasks = state.presetTasks[day] || [];
        if (tasks.length > 0) {
            hasPresets = true;
            html += `
                <div class="preset-day-group">
                    <div class="preset-day-title">${dayNames[day]}</div>
                    ${tasks.map((t, i) => `
                        <div class="preset-item">
                            <span class="task-text">${escapeHtml(t.text)}</span>
                            <button class="btn-del" data-day="${day}" data-index="${i}">🗑️</button>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    });
    
    list.innerHTML = hasPresets ? html : '<p style="text-align:center;color:#999;padding:15px;">还没有预设任务</p>';
}

function addPlanTask() {
    const input = document.getElementById('planTaskInput');
    const projectSelect = document.getElementById('planTaskProject');
    const text = input.value.trim();
    if (!text) return;
    
    const projectId = projectSelect.value ? parseInt(projectSelect.value) : null;
    
    state.baseTaskTemplates.push({
        id: Date.now(),
        text: text,
        points: 10,
        projectId: projectId
    });
    Storage.set('baseTaskTemplates', state.baseTaskTemplates);
    input.value = '';
    renderPlanList();
}

function deletePlanTask(index) {
    state.baseTaskTemplates.splice(index, 1);
    Storage.set('baseTaskTemplates', state.baseTaskTemplates);
    renderPlanList();
}

function addPresetTask() {
    const day = document.getElementById('presetDay').value;
    const input = document.getElementById('presetTaskInput');
    const projectSelect = document.getElementById('presetTaskProject');
    const text = input.value.trim();
    if (!text) return;
    
    if (!state.presetTasks[day]) state.presetTasks[day] = [];
    
    const projectId = projectSelect.value ? parseInt(projectSelect.value) : null;
    
    state.presetTasks[day].push({
        id: Date.now(),
        text: text,
        points: 10,
        projectId: projectId
    });
    
    Storage.set('presetTasks', state.presetTasks);
    input.value = '';
    renderPresetList();
}

function deletePresetTask(day, index) {
    if (state.presetTasks[day]) {
        state.presetTasks[day].splice(index, 1);
        if (state.presetTasks[day].length === 0) {
            delete state.presetTasks[day];
        }
        Storage.set('presetTasks', state.presetTasks);
        renderPresetList();
    }
}

// 月度计划相关
function openMonthPlanModal() {
    renderMonthTaskList();
    document.getElementById('monthPlanModal').classList.remove('hidden');
}

function closeMonthPlanModal() {
    document.getElementById('monthPlanModal').classList.add('hidden');
}

function renderMonthTaskList() {
    const list = document.getElementById('monthTaskList');
    if (state.monthTasks.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">还没有月度计划，添加一些吧</p>';
        return;
    }
    list.innerHTML = state.monthTasks.map((t, i) => {
        const project = state.projects.find(p => p.id === t.projectId);
        const projectTag = project ? `<span class="task-project-tag" style="background:${project.color}">${project.name}</span>` : '';
        const completedClass = t.completed ? 'completed' : '';
        return `
            <div class="plan-item ${completedClass}">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleMonthTask(${i})">
                <span class="task-text">${escapeHtml(t.text)}</span>
                ${projectTag}
                <button class="btn-del" data-index="${i}">🗑️</button>
            </div>
        `;
    }).join('');
}

function addMonthTask() {
    const input = document.getElementById('monthTaskInput');
    const projectSelect = document.getElementById('monthTaskProject');
    const text = input.value.trim();
    if (!text) return;
    
    const projectId = projectSelect.value ? parseInt(projectSelect.value) : null;
    
    state.monthTasks.push({
        id: Date.now(),
        text: text,
        projectId: projectId,
        completed: false,
        createdAt: new Date().toISOString()
    });
    Storage.set('monthTasks', state.monthTasks);
    input.value = '';
    renderMonthTaskList();
}

function toggleMonthTask(index) {
    state.monthTasks[index].completed = !state.monthTasks[index].completed;
    Storage.set('monthTasks', state.monthTasks);
    renderMonthTaskList();
}

function deleteMonthTask(index) {
    state.monthTasks.splice(index, 1);
    Storage.set('monthTasks', state.monthTasks);
    renderMonthTaskList();
}

// 年度计划相关
function openYearPlanModal() {
    renderYearTaskList();
    document.getElementById('yearPlanModal').classList.remove('hidden');
}

function closeYearPlanModal() {
    document.getElementById('yearPlanModal').classList.add('hidden');
}

function renderYearTaskList() {
    const list = document.getElementById('yearTaskList');
    if (state.yearTasks.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">还没有年度计划，添加一些吧</p>';
        return;
    }
    list.innerHTML = state.yearTasks.map((t, i) => {
        const project = state.projects.find(p => p.id === t.projectId);
        const projectTag = project ? `<span class="task-project-tag" style="background:${project.color}">${project.name}</span>` : '';
        const completedClass = t.completed ? 'completed' : '';
        return `
            <div class="plan-item ${completedClass}">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleYearTask(${i})">
                <span class="task-text">${escapeHtml(t.text)}</span>
                ${projectTag}
                <button class="btn-del" data-index="${i}">🗑️</button>
            </div>
        `;
    }).join('');
}

function addYearTask() {
    const input = document.getElementById('yearTaskInput');
    const projectSelect = document.getElementById('yearTaskProject');
    const text = input.value.trim();
    if (!text) return;
    
    const projectId = projectSelect.value ? parseInt(projectSelect.value) : null;
    
    state.yearTasks.push({
        id: Date.now(),
        text: text,
        projectId: projectId,
        completed: false,
        createdAt: new Date().toISOString()
    });
    Storage.set('yearTasks', state.yearTasks);
    input.value = '';
    renderYearTaskList();
}

function toggleYearTask(index) {
    state.yearTasks[index].completed = !state.yearTasks[index].completed;
    Storage.set('yearTasks', state.yearTasks);
    renderYearTaskList();
}

function deleteYearTask(index) {
    state.yearTasks.splice(index, 1);
    Storage.set('yearTasks', state.yearTasks);
    renderYearTaskList();
}

// 事件绑定
function setupEvents() {
    // 数据同步
    document.getElementById('openSyncBtn').onclick = openSyncModal;
    document.getElementById('closeSyncModal').onclick = closeSyncModal;
    document.getElementById('exportDataBtn').onclick = exportData;
    document.getElementById('importDataBtn').onclick = importData;
    document.getElementById('importFileInput').onchange = handleImportFile;
    document.getElementById('generateCodeBtn').onclick = generateSyncCode;
    document.getElementById('copyCodeBtn').onclick = copySyncCode;
    document.getElementById('applyCodeBtn').onclick = applySyncCode;
    
    // 项目管理
    document.getElementById('manageProjects').onclick = openProjectModal;
    document.getElementById('closeProjectModal').onclick = closeProjectModal;
    document.getElementById('addProjectBtn').onclick = addProject;
    document.getElementById('newProjectName').onkeypress = e => { if (e.key === 'Enter') addProject(); };
    document.getElementById('projectList').onclick = e => {
        if (e.target.classList.contains('btn-del')) {
            deleteProject(parseInt(e.target.dataset.index));
        }
    };
    document.getElementById('projectFilterTabs').onclick = e => {
        if (e.target.classList.contains('project-tab')) {
            state.currentProjectView = e.target.dataset.project;
            document.querySelectorAll('.project-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            renderProjectProgress();
        }
    };
    
    // 周规划
    document.getElementById('openPlanBtn').onclick = openPlanModal;
    document.getElementById('closePlanModal').onclick = closePlanModal;
    document.getElementById('savePlan').onclick = () => { closePlanModal(); renderAll(); };
    document.getElementById('addPlanTask').onclick = addPlanTask;
    document.getElementById('planTaskInput').onkeypress = e => { if (e.key === 'Enter') addPlanTask(); };
    document.getElementById('planTaskList').onclick = e => {
        if (e.target.classList.contains('btn-del')) {
            deletePlanTask(parseInt(e.target.dataset.index));
        }
    };
    
    // 预设任务
    document.getElementById('addPresetTask').onclick = addPresetTask;
    document.getElementById('presetTaskInput').onkeypress = e => { if (e.key === 'Enter') addPresetTask(); };
    document.getElementById('presetTaskList').onclick = e => {
        if (e.target.classList.contains('btn-del')) {
            deletePresetTask(e.target.dataset.day, parseInt(e.target.dataset.index));
        }
    };
    
    // 月度计划
    document.getElementById('openMonthPlanBtn').onclick = openMonthPlanModal;
    document.getElementById('closeMonthPlanModal').onclick = closeMonthPlanModal;
    document.getElementById('saveMonthPlan').onclick = () => { closeMonthPlanModal(); renderAll(); };
    document.getElementById('addMonthTask').onclick = addMonthTask;
    document.getElementById('monthTaskInput').onkeypress = e => { if (e.key === 'Enter') addMonthTask(); };
    document.getElementById('monthTaskList').onclick = e => {
        if (e.target.classList.contains('btn-del')) {
            deleteMonthTask(parseInt(e.target.dataset.index));
        }
    };
    
    // 年度计划
    document.getElementById('openYearPlanBtn').onclick = openYearPlanModal;
    document.getElementById('closeYearPlanModal').onclick = closeYearPlanModal;
    document.getElementById('saveYearPlan').onclick = () => { closeYearPlanModal(); renderAll(); };
    document.getElementById('addYearTask').onclick = addYearTask;
    document.getElementById('yearTaskInput').onkeypress = e => { if (e.key === 'Enter') addYearTask(); };
    document.getElementById('yearTaskList').onclick = e => {
        if (e.target.classList.contains('btn-del')) {
            deleteYearTask(parseInt(e.target.dataset.index));
        }
    };
    
    // 复盘
    document.getElementById('openReviewBtn').onclick = openReviewModal;
    document.getElementById('closeReviewModal').onclick = closeReviewModal;
    document.getElementById('reviewDate').onchange = () => renderReview(document.getElementById('reviewDate').value);
    document.getElementById('prevDay').onclick = () => changeReviewDate(-1);
    document.getElementById('nextDay').onclick = () => changeReviewDate(1);
    
    // 收入
    document.getElementById('addIncomeBtn').onclick = addIncome;
    document.getElementById('incomeInput').onkeypress = e => { if (e.key === 'Enter') addIncome(); };
    document.getElementById('setMonthGoal').onclick = setMonthGoal;
    document.getElementById('setYearGoal').onclick = setYearGoal;
    document.getElementById('manageIncomeTypes').onclick = openTypeModal;
    document.getElementById('closeTypeModal').onclick = closeTypeModal;
    document.getElementById('addTypeBtn').onclick = addIncomeType;
    document.getElementById('newTypeName').onkeypress = e => { if (e.key === 'Enter') addIncomeType(); };
    document.getElementById('typeList').onclick = e => {
        if (e.target.classList.contains('btn-del')) {
            deleteIncomeType(parseInt(e.target.dataset.index));
        }
    };
    document.getElementById('incomeDetailList').onclick = e => {
        if (e.target.classList.contains('btn-del')) {
            deleteIncomeRecord(parseInt(e.target.dataset.index));
        }
    };
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => switchPeriod(parseInt(btn.dataset.period));
    });
    
    // 当日任务
    document.getElementById('toggleDailyForm').onclick = () => {
        document.getElementById('dailyTaskForm').classList.toggle('hidden');
    };
    document.getElementById('addDailyTask').onclick = addDailyTask;
    document.getElementById('dailyTaskInput').onkeypress = e => { if (e.key === 'Enter') addDailyTask(); };
    
    // 任务操作
    document.getElementById('baseTaskList').onclick = e => {
        if (e.target.classList.contains('task-checkbox')) {
            completeTask('base', e.target.dataset.id);
        }
    };
    document.getElementById('dailyTaskList').onclick = e => {
        if (e.target.classList.contains('task-checkbox')) {
            completeTask('daily', parseInt(e.target.dataset.index));
        } else if (e.target.classList.contains('task-edit')) {
            editDailyTask(parseInt(e.target.dataset.index));
        } else if (e.target.classList.contains('task-delete')) {
            deleteDailyTask(parseInt(e.target.dataset.index));
        }
    };
    
    // 弹窗
    document.getElementById('closeModal').onclick = () => {
        document.getElementById('modal').classList.add('hidden');
    };
}

// 复盘功能
function openReviewModal() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    document.getElementById('reviewDate').value = dateStr;
    renderReview(dateStr);
    document.getElementById('reviewModal').classList.remove('hidden');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.add('hidden');
}

function changeReviewDate(delta) {
    const input = document.getElementById('reviewDate');
    const current = new Date(input.value);
    current.setDate(current.getDate() + delta);
    const newDate = current.toISOString().split('T')[0];
    input.value = newDate;
    renderReview(newDate);
}

function renderReview(dateStr) {
    const date = new Date(dateStr).toDateString();
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const d = new Date(dateStr);
    
    // 获取该日数据
    const baseRecord = state.baseTaskRecords[date] || {};
    const dailyTasks = state.dailyTasks[date] || [];
    const history = state.completionHistory[date] || [];
    
    // 统计
    const baseCompleted = state.baseTaskTemplates.filter(t => baseRecord[t.id]).length;
    const baseTotal = state.baseTaskTemplates.length;
    const dailyCompleted = dailyTasks.filter(t => t.completed).length;
    const dailyTotal = dailyTasks.length;
    const totalCompleted = baseCompleted + dailyCompleted;
    const totalTasks = baseTotal + dailyTotal;
    const percent = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    
    // 渲染摘要
    document.getElementById('reviewSummary').innerHTML = `
        <div style="font-size:1.1rem;font-weight:500;color:#333;">
            ${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}
        </div>
        <div class="summary-stats">
            <div class="stat">
                <div class="stat-value">${totalCompleted}/${totalTasks}</div>
                <div class="stat-label">完成任务</div>
            </div>
            <div class="stat">
                <div class="stat-value">${percent}%</div>
                <div class="stat-label">完成率</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color:${percent === 100 && totalTasks > 0 ? '#27ae60' : '#e74c3c'}">
                    ${percent === 100 && totalTasks > 0 ? '✓ 完美' : '✗ 未完成'}
                </div>
                <div class="stat-label">当日状态</div>
            </div>
        </div>
    `;
    
    // 渲染基础任务
    const baseEl = document.getElementById('reviewBaseTasks');
    if (baseTotal === 0) {
        baseEl.innerHTML = '<p class="review-empty">当时还没有设置基础任务</p>';
    } else {
        baseEl.innerHTML = state.baseTaskTemplates.map(t => {
            const done = !!baseRecord[t.id];
            return `
                <div class="review-task ${done ? 'done' : 'undone'}">
                    <span class="status-icon">${done ? '✅' : '❌'}</span>
                    <span class="task-name">${escapeHtml(t.text)}</span>
                </div>
            `;
        }).join('');
    }
    
    // 渲染当日任务
    const dailyEl = document.getElementById('reviewDailyTasks');
    if (dailyTotal === 0) {
        dailyEl.innerHTML = '<p class="review-empty">当天没有临时任务</p>';
    } else {
        dailyEl.innerHTML = dailyTasks.map(t => `
            <div class="review-task ${t.completed ? 'done' : 'undone'}">
                <span class="status-icon">${t.completed ? '✅' : '❌'}</span>
                <span class="task-name">${escapeHtml(t.text)}</span>
            </div>
        `).join('');
    }
    
    // 渲染完成时间记录
    const historyEl = document.getElementById('reviewHistory');
    if (history.length === 0) {
        historyEl.innerHTML = '<p class="review-empty">没有完成时间记录</p>';
    } else {
        historyEl.innerHTML = history.map(h => `
            <div class="review-history-item">
                <span class="task-name">${escapeHtml(h.task)}</span>
                <span class="time">${h.time}</span>
            </div>
        `).join('');
    }
    
    // 渲染收入记录
    const incomeEl = document.getElementById('reviewIncome');
    const incomeRecords = state.incomeRecords[date] || [];
    if (incomeRecords.length === 0) {
        incomeEl.innerHTML = '<p class="review-empty">当天没有收入记录</p>';
    } else {
        const dayTotal = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
        
        // 按类型统计
        const byType = {};
        incomeRecords.forEach(r => {
            const typeId = r.type || state.incomeTypes[0]?.id;
            const type = state.incomeTypes.find(t => t.id === typeId) || { name: '其他', color: '#e67e22' };
            if (!byType[type.name]) byType[type.name] = { total: 0, color: type.color };
            byType[type.name].total += r.amount;
        });
        
        incomeEl.innerHTML = `
            <div class="review-income-total">当日总收入：<strong>¥${dayTotal.toFixed(2)}</strong></div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                ${Object.entries(byType).map(([name, data]) => `
                    <span style="background:${data.color};color:white;padding:3px 10px;border-radius:12px;font-size:0.8rem;">
                        ${name}: ¥${data.total.toFixed(2)}
                    </span>
                `).join('')}
            </div>
            ${incomeRecords.map(r => {
                const type = state.incomeTypes.find(t => t.id === r.type) || { name: '其他', color: '#e67e22' };
                return `
                    <div class="review-income-item" style="border-left-color:${type.color}">
                        <span class="amount">¥${r.amount.toFixed(2)}</span>
                        <span style="font-size:0.75rem;color:${type.color};margin-left:8px;">${type.name}</span>
                        <span class="time" style="margin-left:auto;">${r.time}</span>
                    </div>
                `;
            }).join('')}
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
