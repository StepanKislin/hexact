let video, canvas, ctx, debugCanvas, debugCtx, warningDiv, statusDiv, instructionsDiv;
let currentListDiv, detectionsList, countSpan;
let totalCountEl, warningCountEl, rejectCountEl, correctCountEl;
let isStreamActive = false;
let currentTab = 'bolts';
let detectionsHistory = [];
let backgroundMat = null;
let isBackgroundCalibrated = false;
let CONFIDENCE_THRESHOLD = 55;
let MIN_AREA = 600;            // Оптимальный размер для фильтрации мелких контуров резьбы
let MAX_AREA = 30000;
const stats = {
    bolts: { total: 0, correct: 0, warning: 0, reject: 0 },
    nuts: { total: 0, correct: 0, warning: 0, reject: 0 }
};
let trackedObjects = [];
let nextId = 1;
const FORGET_AFTER_MS = 2500;
const MIN_FRAMES_TO_REPORT = 2;
const SIMILARITY_DIST = 45;
let currentSessionLog = null;
let currentSortMethod = 'time';
let enableDebugMode = false;

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
    video = document.getElementById("video");
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    
    // Отладочный холст
    debugCanvas = document.createElement('canvas');
    debugCanvas.width = 280;
    debugCanvas.height = 210;
    debugCanvas.style.position = 'absolute';
    debugCanvas.style.bottom = '10px';
    debugCanvas.style.right = '10px';
    debugCanvas.style.border = '1px solid #ccc';
    debugCanvas.style.borderRadius = '4px';
    debugCanvas.style.display = 'none';
    debugCanvas.style.zIndex = '1000';
    document.body.appendChild(debugCanvas);
    debugCtx = debugCanvas.getContext('2d');

    warningDiv = document.getElementById("warning");
    statusDiv = document.getElementById("status");
    instructionsDiv = document.getElementById("instructions");
    currentListDiv = document.getElementById("current-list");
    detectionsList = document.getElementById("detections-list");
    countSpan = document.getElementById("count");
    totalCountEl = document.getElementById("total-count");
    warningCountEl = document.getElementById("warning-count");
    rejectCountEl = document.getElementById("reject-count");
    correctCountEl = document.getElementById("correct-count");

    // Тема
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('hexact_theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    });
    if (localStorage.getItem('hexact_theme') === 'dark') {
        document.body.classList.add('dark-theme');
    }

    // Полный экран
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);

    // Настройки
    const confSlider = document.getElementById('confidence-threshold');
    const confValue = document.getElementById('conf-threshold-value');
    confSlider.value = CONFIDENCE_THRESHOLD;
    confValue.textContent = CONFIDENCE_THRESHOLD;
    confSlider.addEventListener('input', () => {
        CONFIDENCE_THRESHOLD = parseInt(confSlider.value);
        confValue.textContent = CONFIDENCE_THRESHOLD;
    });
    document.getElementById('min-size').value = MIN_AREA;
    document.getElementById('max-size').value = MAX_AREA;
    document.getElementById('min-size').addEventListener('change', (e) => {
        MIN_AREA = parseInt(e.target.value);
    });
    document.getElementById('max-size').addEventListener('change', (e) => {
        MAX_AREA = parseInt(e.target.value);
    });
    document.getElementById('calibrate-bg').addEventListener('click', calibrateBackground);

    // Экспорт и модальные окна
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    document.getElementById('clear-history').addEventListener('click', clearAll);
    document.getElementById('print-stats').addEventListener('click', printStatistics);
    document.getElementById('save-log').addEventListener('click', saveLog);
    document.getElementById('view-logs').addEventListener('click', viewLogs);
    setupModal('logs-modal', 'logs-close');
    setupModal('session-modal', 'session-close');

    // Вкладки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            updateInstructions();
        });
    });

    // Горячая клавиша для отладки
    document.addEventListener('keydown', (e) => {
        if (e.key === 'd' && e.ctrlKey) {
            enableDebugMode = !enableDebugMode;
            debugCanvas.style.display = enableDebugMode ? 'block' : 'none';
            statusDiv.textContent = enableDebugMode ? '🔧 Отладочный режим ВКЛ' : '🔧 Отладочный режим ВЫКЛ';
            setTimeout(() => {
                statusDiv.textContent = isStreamActive ? "🎥 Камера активна" : "✅ OpenCV.js готов";
            }, 2000);
        }
    });

    const checkOpenCV = () => {
        if (typeof cv !== 'undefined') {
            statusDiv.textContent = "✅ OpenCV.js готов. Запуск камеры…";
            startCamera();
        } else {
            setTimeout(checkOpenCV, 300);
        }
    };
    checkOpenCV();
});

function setupModal(modalId, closeId) {
    const modal = document.getElementById(modalId);
    const close = document.getElementById(closeId);
    if (close) {
        close.addEventListener('click', () => modal.style.display = 'none');
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            statusDiv.textContent = "❌ Не удалось включить полный экран";
        });
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

function calibrateBackground() {
    if (!isStreamActive) {
        alert("Сначала запустите камеру!");
        return;
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const src = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
    src.data.set(imageData.data);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 1.5);
    
    if (backgroundMat) backgroundMat.delete();
    backgroundMat = gray.clone();
    isBackgroundCalibrated = true;
    src.delete();
    gray.delete();
    alert("✅ Фон запомнен! Теперь система будет выделять только объекты.");
}

// === ОСНОВНЫЕ ФУНКЦИИ ===
function clearAll() {
    detectionsHistory = [];
    trackedObjects = [];
    stats.bolts = { total: 0, correct: 0, warning: 0, reject: 0 };
    stats.nuts = { total: 0, correct: 0, warning: 0, reject: 0 };
    updateDetectionsList();
    updateStats();
    updateCharts();
    drawLineChart();
}

function printStatistics() {
    const bolts = stats.bolts;
    const nuts = stats.nuts;
    const totalAll = bolts.total + nuts.total;
    const correctAll = bolts.correct + nuts.correct;
    const warningAll = bolts.warning + nuts.warning;
    const rejectAll = bolts.reject + nuts.reject;
    const correctPct = totalAll ? Math.round((correctAll / totalAll) * 100) : 0;
    const warnPct = totalAll ? Math.round((warningAll / totalAll) * 100) : 0;
    const rejectPct = totalAll ? Math.round((rejectAll / totalAll) * 100) : 0;
    const logs = JSON.parse(localStorage.getItem('hexact_logs') || '[]');
    const last10 = logs.slice(-10).map(log => {
        const total = log.stats.bolts.total + log.stats.nuts.total;
        const correct = log.stats.bolts.correct + log.stats.nuts.correct;
        return {
            correctPct: total ? Math.round((correct / total) * 100) : 0,
            date: new Date(log.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        };
    });

    let chartLines = [];
    if (last10.length > 0) {
        const maxY = 100;
        const height = 10;
        chartLines.push("График точности за последние сессии:");
        for (let row = height; row >= 0; row--) {
            let yValue = Math.round((row / height) * maxY);
            let line = yValue.toString().padStart(3) + " | ";
            last10.forEach(point => {
                let barHeight = Math.round((point.correctPct / maxY) * height);
                if (barHeight >= row) {
                    line += "█ ";
                } else {
                    line += "  ";
                }
            });
            chartLines.push(line);
        }
        chartLines.push("    +" + "-".repeat(last10.length * 2));
        let dateLine = "      ";
        last10.forEach(p => {
            dateLine += p.date.padEnd(2, ' ') + " ";
        });
        chartLines.push(dateLine);
    } else {
        chartLines = ["Нет данных для графика"];
    }

    const printWin = window.open('', '_blank');
    printWin.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Статистика детекции болтов и гаек</title>
<style>
body {
font-family: Arial, sans-serif;
padding: 20px;
color: black;
background: white;
}
h1 { text-align: center; margin-bottom: 25px; }
.summary {
display: flex;
justify-content: space-around;
flex-wrap: wrap;
gap: 20px;
margin: 20px 0;
}
.card {
text-align: center;
padding: 15px;
border: 1px solid #000;
border-radius: 10px;
min-width: 130px;
}
.value { font-size: 24px; font-weight: bold; margin-top: 8px; }
.chart {
width: 200px;
height: 20px;
background: #eee;
border: 1px solid #000;
margin: 8px auto;
overflow: hidden;
}
.bar-ok { height: 100%; background: #000; }
.bar-warn { height: 100%; background: #666; }
.bar-bad { height: 100%; background: #ccc; }
.footer {
margin-top: 30px;
text-align: center;
font-size: 14px;
}
.print-chart {
font-family: monospace;
white-space: pre;
font-size: 12px;
line-height: 1.3;
margin: 20px 0;
padding: 10px;
border: 1px solid #000;
background: #f9f9f9;
}
@media print {
body { padding: 0; }
}
</style>
</head>
<body>
<h1>📊 Статистика детекции болтов и гаек</h1>
<div class="summary">
<div class="card">
<div>Правильные</div>
<div class="value">${correctAll} (${correctPct}%)</div>
</div>
<div class="card">
<div>Предупреждения</div>
<div class="value">${warningAll} (${warnPct}%)</div>
</div>
<div class="card">
<div>Брак</div>
<div class="value">${rejectAll} (${rejectPct}%)</div>
</div>
<div class="card">
<div>Всего</div>
<div class="value">${totalAll}</div>
</div>
</div>
<div style="text-align:center; margin:25px 0;">
<div>✅ Правильные</div>
<div class="chart"><div class="bar-ok" style="width:${correctPct}%"></div></div>
<div>⚠️ Предупреждения</div>
<div class="chart"><div class="bar-warn" style="width:${warnPct}%"></div></div>
<div>❌ Брак</div>
<div class="chart"><div class="bar-bad" style="width:${rejectPct}%"></div></div>
</div>
<div class="print-chart">${chartLines.join('\n')}</div>
<div class="footer">
Сгенерировано: ${new Date().toLocaleString('ru-RU')}<br>
Система детекции крепежа на основе OpenCV.js
</div>
<script>
window.onload = () => {
window.print();
setTimeout(() => window.close(), 1000);
};
</script>
</body>
</html>
`);
    printWin.document.close();
}

function saveLog() {
    const log = {
        timestamp: new Date().toISOString(),
        stats: JSON.parse(JSON.stringify(stats)),
        items: detectionsHistory.map(i => ({
            displayType: i.displayType,
            confidence: i.confidence,
            timestamp: i.timestamp.toISOString(),
            category: i.category
        }))
    };
    const logs = JSON.parse(localStorage.getItem('hexact_logs') || '[]');
    logs.push(log);
    localStorage.setItem('hexact_logs', JSON.stringify(logs));
    alert('✅ Лог сохранён!');
    drawLineChart();
}

function exportToCSV() {
    if (detectionsHistory.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    let csv = 'Время;Тип;Подтип;Уверенность (%);Категория\n';
    detectionsHistory.forEach(item => {
        const time = new Date(item.timestamp).toLocaleString('ru-RU');
        csv += `"${time}";"${item.type}";"${item.displayType}";${Math.round(item.confidence)};"${item.category}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hexact_log_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function viewLogs() {
    const logs = JSON.parse(localStorage.getItem('hexact_logs') || '[]');
    const logsList = document.getElementById('logs-list');
    logsList.innerHTML = '';
    if (logs.length === 0) {
        logsList.innerHTML = '<p>Нет сохранённых логов.</p>';
    } else {
        logs.reverse().forEach((log, idx) => {
            const date = new Date(log.timestamp).toLocaleString('ru-RU');
            const total = log.stats.bolts.total + log.stats.nuts.total;
            const correct = log.stats.bolts.correct + log.stats.nuts.correct;
            const warn = log.stats.bolts.warning + log.stats.nuts.warning;
            const reject = log.stats.bolts.reject + log.stats.nuts.reject;
            const div = document.createElement('div');
            div.className = 'log-session';
            div.innerHTML = `
<h3>Сессия #${logs.length - idx} — ${date}</h3>
<div class="log-stats">
<div class="log-stat">✅ Правильные: ${correct}</div>
<div class="log-stat">⚠️ Предупреждения: ${warn}</div>
<div class="log-stat">❌ Брак: ${reject}</div>
<div class="log-stat">📊 Всего: ${total}</div>
</div>
`;
            div.dataset.logIndex = logs.length - 1 - idx;
            div.addEventListener('click', () => showSessionDetails(logs.length - 1 - idx));
            logsList.appendChild(div);
        });
    }
    document.getElementById('logs-modal').style.display = 'block';
}

function showSessionDetails(logIndex) {
    const allLogs = JSON.parse(localStorage.getItem('hexact_logs') || '[]');
    const log = allLogs[logIndex];
    if (!log) return;
    currentSessionLog = log;
    currentSortMethod = 'time';
    const sessionTitle = document.getElementById('session-title');
    const dateStr = new Date(log.timestamp).toLocaleString('ru-RU');
    sessionTitle.textContent = `Детали сессии от ${dateStr}`;
    const sortControls = document.querySelector('.session-sort-controls');
    if (sortControls) {
        sortControls.innerHTML = `
<button class="sort-btn ${currentSortMethod === 'time' ? 'active' : ''}" data-sort="time">По времени</button>
<button class="sort-btn ${currentSortMethod === 'quality' ? 'active' : ''}" data-sort="quality">По качеству</button>
<button class="sort-btn ${currentSortMethod === 'confidence' ? 'active' : ''}" data-sort="confidence">По % уверенности</button>
`;
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentSortMethod = btn.dataset.sort;
                renderSessionItems();
            });
        });
    }
    renderSessionItems();
    document.getElementById('logs-modal').style.display = 'none';
    document.getElementById('session-modal').style.display = 'block';
}

function renderSessionItems() {
    if (!currentSessionLog) return;
    const sessionItems = document.getElementById('session-items');
    let items = [...currentSessionLog.items];
    if (currentSortMethod === 'time') {
        items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (currentSortMethod === 'quality') {
        const prio = { ok: 0, warning: 1, reject: 2 };
        items.sort((a, b) => (prio[a.category] || 3) - (prio[b.category] || 3));
    } else if (currentSortMethod === 'confidence') {
        items.sort((a, b) => b.confidence - a.confidence);
    }
    sessionItems.innerHTML = '';
    if (items.length === 0) {
        sessionItems.innerHTML = '<p>Нет обнаруженных объектов.</p>';
    } else {
        items.forEach(item => {
            const time = new Date(item.timestamp).toLocaleTimeString('ru-RU');
            let typeClass = '';
            if (item.category === 'ok') {
                typeClass = 'session-type-ok';
            } else if (item.category === 'warning') {
                typeClass = 'session-type-warn';
            } else {
                typeClass = 'session-type-reject';
            }
            const div = document.createElement('div');
            div.className = 'session-item';
            div.innerHTML = `
<span class="${typeClass}">${item.displayType}</span>
<span class="session-time">${Math.round(item.confidence)}% • ${time}</span>
`;
            sessionItems.appendChild(div);
        });
    }
}

function updateInstructions() {
    if (currentTab === 'bolts') {
        instructionsDiv.textContent = '🔧 Положите болт головкой вверх. Поддержка: шестигранник, круглые с крестом.';
    } else {
        instructionsDiv.textContent = '🔧 Положите гайку сверху. Поддержка: шестигранник.';
    }
}

function getTrackedObject(detection) {
    const center = {
        x: detection.rect.x + detection.rect.width / 2,
        y: detection.rect.y + detection.rect.height / 2
    };
    const size = (detection.rect.width + detection.rect.height) / 2;
    const now = Date.now();
    
    for (let obj of trackedObjects) {
        const dx = obj.center.x - center.x;
        const dy = obj.center.y - center.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const sizeDiff = Math.abs(obj.size - size);
        if (dist < SIMILARITY_DIST && sizeDiff < SIMILARITY_DIST * 0.5 && obj.type === detection.type && obj.subtype === detection.subtype) {
            obj.lastSeen = now;
            obj.center = center;
            obj.size = size;
            obj.frameCount++;
            return obj;
        }
    }

    const newObj = {
        id: nextId++,
        type: detection.type,
        subtype: detection.subtype,
        center: center,
        size: size,
        lastSeen: now,
        frameCount: 1,
        reported: false
    };
    trackedObjects.push(newObj);
    
    // Очистка старых объектов
    trackedObjects = trackedObjects.filter(obj => now - obj.lastSeen < FORGET_AFTER_MS);
    return newObj;
}

function addToHistoryIfNeeded(detection) {
    const obj = getTrackedObject(detection);
    if (!obj || obj.reported || obj.frameCount < MIN_FRAMES_TO_REPORT) return;
    
    const currentStats = stats[currentTab];
    let category = 'ok';
    let displayType = '';
    let isCorrect = false;

    if (currentTab === 'bolts') {
        if (detection.subtype === 'hex') {
            displayType = 'Шестигранник (болт)';
            isCorrect = true;
            currentStats.correct++;
        } else if (detection.subtype === 'phillips') {
            displayType = 'Крест (Phillips)';
            isCorrect = true;
            currentStats.correct++;
        } else if (['pentagon', 'heptagon', 'octagon', 'incomplete_hex', 'circle_no_cross'].includes(detection.subtype)) {
            category = 'reject';
            currentStats.reject++;
            const names = {
                'pentagon': 'пятиугольник',
                'heptagon': 'семиугольник',
                'octagon': 'восьмиугольник',
                'incomplete_hex': 'незавершённый шестиугольник',
                'circle_no_cross': 'круг без креста'
            };
            displayType = 'Брак: ' + names[detection.subtype];
        } else {
            category = 'warning';
            currentStats.warning++;
            displayType = 'Неизвестная форма';
        }
    } else if (currentTab === 'nuts') {
        if (detection.subtype === 'hex') {
            displayType = 'Шестигранник (гайка)';
            isCorrect = true;
            currentStats.correct++;
        } else {
            category = 'reject';
            currentStats.reject++;
            if (detection.subtype === 'phillips') {
                displayType = '❌ Phillips (не гайка)';
            } else if (detection.subtype === 'circle_no_cross') {
                displayType = '❌ Круг (не гайка)';
            } else if (detection.subtype === 'pentagon') {
                displayType = '❌ Пятиугольник (не гайка)';
            } else if (detection.subtype === 'heptagon') {
                displayType = '❌ Семиугольник (не гайка)';
            } else if (detection.subtype === 'octagon') {
                displayType = '❌ Восьмиугольник (не гайка)';
            } else if (detection.subtype === 'incomplete_hex') {
                displayType = '❌ Незав. шестигранник (брак)';
            } else {
                displayType = '❌ Неизвестная форма (не гайка)';
            }
        }
    }

    currentStats.total++;
    const now = new Date();
    const newItem = {
        id: obj.id,
        type: currentTab,
        subtype: detection.subtype,
        displayType,
        confidence: detection.confidence,
        timestamp: now,
        rect: detection.rect,
        category,
        isCorrect
    };
    detectionsHistory.unshift(newItem);
    obj.reported = true;
    updateDetectionsList();
    updateStats();
    updateCharts();
}

function updateStats() {
    const totalAll = stats.bolts.total + stats.nuts.total;
    const correctAll = stats.bolts.correct + stats.nuts.correct;
    const warningAll = stats.bolts.warning + stats.nuts.warning;
    const rejectAll = stats.bolts.reject + stats.nuts.reject;
    correctCountEl.textContent = correctAll;
    totalCountEl.textContent = totalAll;
    warningCountEl.textContent = warningAll;
    rejectCountEl.textContent = rejectAll;
}

function updateCharts() {
    const container = document.getElementById('charts-container');
    if (!container) return;
    const bolts = stats.bolts;
    const nuts = stats.nuts;
    function getPercent(part, total) {
        return total === 0 ? 0 : Math.round((part / total) * 100);
    }
    const boltsCorrectPct = getPercent(bolts.correct, bolts.total);
    const boltsRejectPct = getPercent(bolts.reject, bolts.total);
    const boltsWarnPct = getPercent(bolts.warning, bolts.total);
    const nutsCorrectPct = getPercent(nuts.correct, nuts.total);
    const nutsRejectPct = getPercent(nuts.reject, nuts.total);
    const nutsWarnPct = getPercent(nuts.warning, nuts.total);
    container.innerHTML = `
<div style="display:flex;gap:30px;flex-wrap:wrap;justify-content:center;margin-top:20px;">
<div style="text-align:center;">
<div style="font-weight:600;">Болты (${bolts.total})</div>
<div style="width:200px;height:20px;background:#e2e8f0;border-radius:4px;margin:5px auto;overflow:hidden;">
<div style="width:${boltsCorrectPct}%;height:100%;background:#10b981;"></div>
</div>
<div>✅ ${boltsCorrectPct}%</div>
<div style="width:200px;height:20px;background:#e2e8f0;border-radius:4px;margin:5px auto;overflow:hidden;">
<div style="width:${boltsWarnPct}%;height:100%;background:#f59e0b;"></div>
</div>
<div>⚠️ ${boltsWarnPct}%</div>
<div style="width:200px;height:20px;background:#e2e8f0;border-radius:4px;margin:5px auto;overflow:hidden;">
<div style="width:${boltsRejectPct}%;height:100%;background:#ef4444;"></div>
</div>
<div>❌ ${boltsRejectPct}%</div>
</div>
<div style="text-align:center;">
<div style="font-weight:600;">Гайки (${nuts.total})</div>
<div style="width:200px;height:20px;background:#e2e8f0;border-radius:4px;margin:5px auto;overflow:hidden;">
<div style="width:${nutsCorrectPct}%;height:100%;background:#10b981;"></div>
</div>
<div>✅ ${nutsCorrectPct}%</div>
<div style="width:200px;height:20px;background:#e2e8f0;border-radius:4px;margin:5px auto;overflow:hidden;">
<div style="width:${nutsWarnPct}%;height:100%;background:#f59e0b;"></div>
</div>
<div>⚠️ ${nutsWarnPct}%</div>
<div style="width:200px;height:20px;background:#e2e8f0;border-radius:4px;margin:5px auto;overflow:hidden;">
<div style="width:${nutsRejectPct}%;height:100%;background:#ef4444;"></div>
</div>
<div>❌ ${nutsRejectPct}%</div>
</div>
</div>
`;
}

function updateDetectionsList() {
    countSpan.textContent = detectionsHistory.length;
    detectionsList.innerHTML = '';
    detectionsHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'detection-item';
        const timeStr = item.timestamp.toLocaleTimeString();
        div.innerHTML = `<span>${item.displayType}</span><span>${Math.round(item.confidence)}% • ${timeStr}</span>`;
        detectionsList.appendChild(div);
    });
}

function updateCurrentList(detections) {
    if (detections.length === 0) {
        currentListDiv.innerHTML = '<div style="color:#94a3b8; font-style:italic; text-align:center;">Ничего не обнаружено</div>';
        return;
    }
    let html = '';
    detections.forEach(det => {
        let typeClass = '', typeText = '';
        if (det.subtype === 'hex') {
            typeText = currentTab === 'bolts' ? 'Шестигранник (болт)' : 'Шестигранник (гайка)';
            typeClass = currentTab === 'bolts' ? 'hex-bolt' : 'hex-nut';
        } else if (det.subtype === 'phillips') {
            typeText = 'Крест (Phillips)';
            typeClass = 'phillips';
        } else if (['pentagon', 'heptagon', 'octagon', 'incomplete_hex', 'circle_no_cross'].includes(det.subtype)) {
            const names = {
                'pentagon': 'Пятиугольник',
                'heptagon': 'Семиугольник',
                'octagon': 'Восьмиугольник',
                'incomplete_hex': 'Незаверш. шестиугольник',
                'circle_no_cross': 'Круг без креста'
            };
            typeText = '❌ ' + names[det.subtype];
            typeClass = 'stat-reject';
        } else {
            typeText = '⚠️ Неизвестная форма';
            typeClass = 'stat-warning';
        }
        html += `
<div class="current-item">
<div class="current-type ${typeClass}">${typeText}</div>
<div class="current-conf">${Math.round(det.confidence)}%</div>
</div>
`;
    });
    currentListDiv.innerHTML = html;
}

function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
        statusDiv.textContent = "❌ Камера не поддерживается";
        statusDiv.className = "warning-reject";
        return;
    }
    const constraints = { video: { width: 560, height: 420 } };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            video.srcObject = stream;
            isStreamActive = true;
            statusDiv.textContent = "🎥 Камера активна. Положите крепёж.";
            requestAnimationFrame(mainLoop);
        })
        .catch(err => {
            statusDiv.textContent = "❌ Доступ к камере запрещён";
            statusDiv.className = "warning-reject";
        });
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    let xx = param < 0 ? x1 : (param > 1 ? x2 : x1 + param * C);
    let yy = param < 0 ? y1 : (param > 1 ? y2 : y1 + param * D);
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function getAngleBetweenLines(l1, l2) {
    const a1 = Math.atan2(l1.y2 - l1.y1, l1.x2 - l1.x1) * 180 / Math.PI;
    const a2 = Math.atan2(l2.y2 - l2.y1, l2.x2 - l2.x1) * 180 / Math.PI;
    let diff = Math.abs(a1 - a2);
    return diff > 180 ? 360 - diff : diff;
}

// === СПЕЦИАЛИЗИРОВАННАЯ ОБРАБОТКА ДЛЯ ГАЕК ===
function preprocessForNuts(gray) {
    // Шаг 1: Размытие для подавления шума резьбы
    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 1.2);
    
    // Шаг 2: Адаптивная бинаризация
    const binary = new cv.Mat();
    cv.adaptiveThreshold(
        blurred,
        binary,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        15,  // Больше окно для лучшей адаптации к градиентам
        5    // Смещение для подавления мелких деталей резьбы
    );
    
    // Шаг 3: Морфологическое закрытие для заполнения отверстий
    // Используем эллиптический элемент для естественного заполнения
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(7, 7));
    const closed = new cv.Mat();
    cv.morphologyEx(binary, closed, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 2);
    
    // Шаг 4: Дополнительное заполнение оставшихся дырок
    const filled = new cv.Mat();
    cv.morphologyEx(closed, filled, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 3);
    
    kernel.delete();
    binary.delete();
    closed.delete();
    blurred.delete();
    
    return filled;
}

function detectAllShapes(gray) {
    let processed = gray;
    if (isBackgroundCalibrated) {
        const diff = new cv.Mat();
        cv.absdiff(gray, backgroundMat, diff);
        processed = diff;
    }
    
    // Специальная предобработка для гаек
    const binary = preprocessForNuts(processed);
    
    // Отладка
    if (enableDebugMode && debugCtx) {
        const debugData = binary.data;
        const imageData = debugCtx.createImageData(debugCanvas.width, debugCanvas.height);
        for (let i = 0; i < debugCanvas.width * debugCanvas.height; i++) {
            const val = debugData[i];
            imageData.data[i * 4] = val;
            imageData.data[i * 4 + 1] = val;
            imageData.data[i * 4 + 2] = val;
            imageData.data[i * 4 + 3] = 255;
        }
        debugCtx.putImageData(imageData, 0, 0);
    }
    
    // Используем иерархию для фильтрации внутренних контуров
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(binary, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    
    const results = [];
    
    // Анализируем иерархию: [next, previous, child, parent]
    for (let i = 0; i < contours.size(); i++) {
        // Пропускаем внутренние контуры (дырки) — у них есть родитель
        if (hierarchy.data32S[i * 4 + 3] !== -1) continue;
        
        const contour = contours.get(i);
        const area = cv.contourArea(contour, false);
        if (area < MIN_AREA || area > MAX_AREA) continue;
        
        const rect = cv.boundingRect(contour);
        const aspect = rect.width / rect.height;
        if (aspect < 0.65 || aspect > 1.55) continue;
        
        const perimeter = cv.arcLength(contour, true);
        if (perimeter === 0) continue;
        
        // Вычисляем solidity (отношение площади к площади выпуклой оболочки)
        // Для гаек с заполненным отверстием solidity близок к 1.0
        const hull = new cv.Mat();
        cv.convexHull(contour, hull, false);
        const hullArea = cv.contourArea(hull, false);
        const solidity = hullArea > 0 ? area / hullArea : 0;
        hull.delete();
        
        // Фильтр по solidity: отбрасываем контуры с большими внутренними дырками
        if (solidity < 0.75) continue;
        
        const epsilon = 0.028 * perimeter;
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, epsilon, true);
        const vertices = approx.rows;
        
        let subtype = 'unknown';
        let confidence = 50;
        
        if (vertices >= 5 && vertices <= 7) {
            if (vertices === 6) {
                const { isRegular, conf } = isRegularHexagonFromApprox(approx, rect);
                if (isRegular) {
                    subtype = 'hex';
                    confidence = conf;
                } else {
                    // Дополнительная проверка по соотношению площадей для гаек
                    const circularity = 4 * Math.PI * area / (perimeter * perimeter);
                    if (circularity > 0.62 && circularity < 0.88) {
                        subtype = 'hex';
                        confidence = 72;
                    } else {
                        subtype = 'incomplete_hex';
                        confidence = 60;
                    }
                }
            } else if (vertices === 5) {
                subtype = 'pentagon';
                confidence = 75;
            } else if (vertices === 7) {
                subtype = 'heptagon';
                confidence = 70;
            }
        }
        
        if (confidence >= 50) {
            results.push({ rect, confidence, type: 'shape', subtype });
        }
        
        approx.delete();
    }
    
    binary.delete();
    if (isBackgroundCalibrated && processed !== gray) processed.delete();
    contours.delete();
    hierarchy.delete();
    
    return results;
}

function isRegularHexagonFromApprox(approx, rect) {
    if (approx.rows < 5) return { isRegular: false, conf: 0 };
    
    const points = [];
    const n = Math.min(6, approx.rows);
    for (let i = 0; i < n; i++) {
        points.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] });
    }
    
    // Центр масс
    let cx = 0, cy = 0;
    points.forEach(p => { cx += p.x; cy += p.y; });
    cx /= points.length; cy /= points.length;
    
    // Радиусы до вершин
    const radii = points.map(p => Math.sqrt((p.x - cx)**2 + (p.y - cy)**2));
    const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
    const radiusStd = Math.sqrt(radii.reduce((sum, r) => sum + (r - avgRadius)**2, 0) / radii.length);
    
    // Углы между соседними вершинами
    const angles = [];
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const v1x = p1.x - cx, v1y = p1.y - cy;
        const v2x = p2.x - cx, v2y = p2.y - cy;
        const dot = v1x * v2x + v1y * v2y;
        const len1 = Math.sqrt(v1x*v1x + v1y*v1y);
        const len2 = Math.sqrt(v2x*v2x + v2y*v2y);
        if (len1 === 0 || len2 === 0) continue;
        let angle = Math.acos(dot / (len1 * len2)) * 180 / Math.PI;
        angles.push(angle);
    }
    
    const avgAngle = angles.reduce((a, b) => a + b, 0) / angles.length;
    const angleStd = Math.sqrt(angles.reduce((sum, a) => sum + (a - avgAngle)**2, 0) / angles.length);
    
    // Оптимизированные критерии для реальных гаек
    const radiusRatio = radiusStd / avgRadius;
    if (radiusRatio <= 0.26 && angleStd <= 26 && angles.length >= 4) {
        let conf = 82;
        if (radiusRatio > 0.19) conf -= 7;
        if (angleStd > 19) conf -= 7;
        return { isRegular: true, conf: Math.max(65, conf) };
    }
    return { isRegular: false, conf: 0 };
}

function detectPhillipsAndCircles(gray) {
    let processed = gray;
    if (isBackgroundCalibrated) {
        const diff = new cv.Mat();
        cv.absdiff(processed, backgroundMat, diff);
        processed = diff;
    }
    
    const blurred = new cv.Mat();
    cv.GaussianBlur(processed, blurred, new cv.Size(7, 7), 1.3);
    
    const circles = new cv.Mat();
    cv.HoughCircles(
        blurred,
        circles,
        cv.HOUGH_GRADIENT,
        1,
        Math.max(22, gray.rows / 7),
        95,
        30,
        20,
        90
    );
    
    const results = [];
    
    if (circles.cols > 0) {
        for (let i = 0; i < Math.min(6, circles.cols); i++) {
            const x = circles.data32F[i * 3];
            const y = circles.data32F[i * 3 + 1];
            const r = circles.data32F[i * 3 + 2];
            if (r < 20 || r > 90) continue;
            
            // ROI для анализа креста
            const roiSize = Math.round(r * 2.3);
            const roiX = Math.max(0, Math.round(x - roiSize / 2));
            const roiY = Math.max(0, Math.round(y - roiSize / 2));
            const roiW = Math.min(roiSize, gray.cols - roiX);
            const roiH = Math.min(roiSize, gray.rows - roiY);
            
            if (roiW < 32 || roiH < 32) continue;
            
            const roi = processed.roi(new cv.Rect(roiX, roiY, roiW, roiH));
            const edges = new cv.Mat();
            cv.Canny(roi, edges, 50, 140, 3, false);
            
            const lines = new cv.Mat();
            cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 28, 24, 9);
            
            let hasCross = false;
            
            if (lines.rows > 0) {
                let validLines = [];
                for (let j = 0; j < lines.rows; j++) {
                    const x1 = lines.data32S[j * 4];
                    const y1 = lines.data32S[j * 4 + 1];
                    const x2 = lines.data32S[j * 4 + 2];
                    const y2 = lines.data32S[j * 4 + 3];
                    const len = Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
                    if (len < r * 0.48) continue;
                    
                    const gx1 = x1 + roiX;
                    const gy1 = y1 + roiY;
                    const gx2 = x2 + roiX;
                    const gy2 = y2 + roiY;
                    
                    const dist = pointToLineDistance(x, y, gx1, gy1, gx2, gy2);
                    if (dist < r * 0.36) {
                        validLines.push({ x1: gx1, y1: gy1, x2: gx2, y2: gy2 });
                    }
                }
                
                for (let a = 0; a < validLines.length && !hasCross; a++) {
                    for (let b = a + 1; b < validLines.length; b++) {
                        const angle = getAngleBetweenLines(validLines[a], validLines[b]);
                        if (angle >= 75 && angle <= 105) {
                            hasCross = true;
                            break;
                        }
                    }
                }
            }
            
            if (hasCross) {
                results.push({
                    rect: { x: x - r, y: y - r, width: r * 2, height: r * 2 },
                    confidence: 90,
                    type: 'phillips',
                    subtype: 'phillips'
                });
            } else {
                // Проверка на шестиугольник внутри круга (для гаек)
                const hexCheck = new cv.Mat();
                cv.cvtColor(roi, hexCheck, cv.COLOR_GRAY2RGBA);
                const grayRoi = new cv.Mat();
                cv.cvtColor(hexCheck, grayRoi, cv.COLOR_RGBA2GRAY);
                const contours = new cv.MatVector();
                const hierarchy = new cv.Mat();
                cv.findContours(grayRoi, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
                
                let foundHex = false;
                for (let i = 0; i < contours.size(); i++) {
                    const contour = contours.get(i);
                    const area = cv.contourArea(contour, false);
                    if (area < 120) continue;
                    const perimeter = cv.arcLength(contour, true);
                    if (perimeter === 0) continue;
                    const epsilon = 0.042 * perimeter;
                    const approx = new cv.Mat();
                    cv.approxPolyDP(contour, approx, epsilon, true);
                    if (approx.rows >= 5 && approx.rows <= 7) {
                        foundHex = true;
                    }
                    approx.delete();
                }
                
                if (foundHex) {
                    results.push({
                        rect: { x: x - r, y: y - r, width: r * 2, height: r * 2 },
                        confidence: 82,
                        type: 'shape',
                        subtype: 'hex'
                    });
                } else {
                    results.push({
                        rect: { x: x - r, y: y - r, width: r * 2, height: r * 2 },
                        confidence: 72,
                        type: 'circle',
                        subtype: 'circle_no_cross'
                    });
                }
                
                contours.delete();
                hierarchy.delete();
                grayRoi.delete();
                hexCheck.delete();
            }
            
            edges.delete();
            roi.delete();
            lines.delete();
        }
    }
    
    circles.delete();
    blurred.delete();
    if (isBackgroundCalibrated && processed !== gray) processed.delete();
    
    return results;
}

// === ОСНОВНОЙ ЦИКЛ ===
function mainLoop() {
    if (!isStreamActive) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const src = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
        src.data.set(imageData.data);
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        
        let currentDetections = [];
        const shapes = detectAllShapes(gray);
        const phillipsAndCircles = detectPhillipsAndCircles(gray);
        currentDetections = [...shapes, ...phillipsAndCircles];
        
        // Фильтрация по порогу
        currentDetections = currentDetections.filter(d => d.confidence >= CONFIDENCE_THRESHOLD);
        currentDetections.sort((a, b) => b.confidence - a.confidence);
        
        // Убираем перекрывающиеся детекции
        const finalDetections = [];
        for (let i = 0; i < currentDetections.length; i++) {
            let overlap = false;
            for (let j = 0; j < finalDetections.length; j++) {
                const r1 = currentDetections[i].rect;
                const r2 = finalDetections[j].rect;
                const xOverlap = Math.max(0, Math.min(r1.x + r1.width, r2.x + r2.width) - Math.max(r1.x, r2.x));
                const yOverlap = Math.max(0, Math.min(r1.y + r1.height, r2.y + r2.height) - Math.max(r1.y, r2.y));
                const overlapArea = xOverlap * yOverlap;
                const area1 = r1.width * r1.height;
                const area2 = r2.width * r2.height;
                if (overlapArea / Math.min(area1, area2) > 0.58) {
                    overlap = true;
                    break;
                }
            }
            if (!overlap) {
                finalDetections.push(currentDetections[i]);
            }
        }
        
        // Отрисовка
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        finalDetections.forEach(det => {
            const r = det.rect;
            let color = "#00ff00";
            if (['pentagon', 'heptagon', 'octagon', 'incomplete_hex', 'circle_no_cross'].includes(det.subtype)) {
                color = "#ff0000";
            } else if (det.subtype === 'unknown' || det.confidence < 68) {
                color = "#ffaa00";
            }
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(r.x, r.y, r.width, r.height);
            ctx.fillStyle = "white";
            ctx.font = "14px Arial";
            ctx.textAlign = "left";
            
            let label = '';
            if (det.subtype === 'hex') {
                label = currentTab === 'bolts' ? 'Болт ✓' : 'Гайка ✓';
            } else if (det.subtype === 'phillips') {
                label = 'Крест ✓';
            } else if (det.subtype === 'circle_no_cross') {
                label = 'Круг ✗';
            } else if (det.subtype === 'pentagon') {
                label = '5-угол ✗';
            } else if (det.subtype === 'heptagon') {
                label = '7-угол ✗';
            } else if (det.subtype === 'octagon') {
                label = '8-угол ✗';
            } else if (det.subtype === 'incomplete_hex') {
                label = 'Незав.6 ✗';
            } else {
                label = '???';
            }
            
            ctx.fillText(`${label} ${Math.round(det.confidence)}%`, r.x + 4, r.y - 6);
        });
        
        updateCurrentList(finalDetections);
        finalDetections.forEach(det => {
            addToHistoryIfNeeded(det);
        });
        
        src.delete();
        gray.delete();
    } catch (e) {
        console.error("Ошибка:", e);
        statusDiv.textContent = `⚠️ Ошибка: ${e.message.substring(0, 50)}`;
        statusDiv.className = "warning-low";
    }
    
    requestAnimationFrame(mainLoop);
}

// === ГРАФИК СТАТИСТИКИ ===
function drawLineChart() {
    const logs = JSON.parse(localStorage.getItem('hexact_logs') || '[]');
    const last10 = logs.slice(-10).map(log => {
        const total = log.stats.bolts.total + log.stats.nuts.total;
        const correct = log.stats.bolts.correct + log.stats.nuts.correct;
        return {
            correctPct: total ? Math.round((correct / total) * 100) : 0,
            date: new Date(log.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        };
    });
    
    const canvas = document.getElementById('stat-chart');
    if (!canvas || last10.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    // Сетка
    ctx.strokeStyle = '#e2e8f0';
    ctx.font = '11px Arial';
    ctx.fillStyle = '#64748b';
    for (let i = 0; i <= 100; i += 20) {
        const y = height - (i / 100) * (height - 40) - 20;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
        ctx.fillText(i + '%', 15, y + 4);
    }
    
    // Ось X
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(50, height - 20);
    ctx.lineTo(width - 20, height - 20);
    ctx.stroke();
    
    // Линия тренда
    if (last10.length > 1) {
        const padding = 50;
        const rightMargin = 30;
        const chartWidth = width - padding - rightMargin;
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        
        for (let i = 0; i < last10.length; i++) {
            const ratio = i / (last10.length - 1);
            const x = padding + ratio * chartWidth;
            const y = height - 20 - (last10[i].correctPct / 100) * (height - 40);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Точки данных
        ctx.fillStyle = '#1e40af';
        for (let i = 0; i < last10.length; i++) {
            const ratio = last10.length > 1 ? i / (last10.length - 1) : 0;
            const x = padding + ratio * chartWidth;
            const y = height - 20 - (last10[i].correctPct / 100) * (height - 40);
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.fillText(last10[i].date, x - 12, height - 5);
            ctx.fillStyle = '#1e40af';
        }
    } else if (last10.length === 1) {
        const x = width / 2;
        const y = height - 20 - (last10[0].correctPct / 100) * (height - 40);
        ctx.fillStyle = '#1e40af';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillText(last10[0].date, x - 12, height - 5);
    }
}

window.addEventListener('load', () => {
    setTimeout(() => drawLineChart(), 1000);
});