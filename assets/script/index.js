let video, canvas, ctx, warningDiv, statusDiv, instructionsDiv;
let currentListDiv, detectionsList, countSpan;
let totalCountEl, warningCountEl, rejectCountEl, correctCountEl;
let isStreamActive = false;
let currentTab = 'bolts';
let detectionsHistory = [];

const stats = {
    bolts: { total: 0, correct: 0, warning: 0, reject: 0 },
    nuts: { total: 0, correct: 0, warning: 0, reject: 0 }
};

let trackedObjects = [];
let nextId = 1;
const FORGET_AFTER_MS = 2500;
const MIN_FRAMES_TO_REPORT = 3;
const SIMILARITY_DIST = 35;

document.addEventListener('DOMContentLoaded', () => {
    video = document.getElementById("video");
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
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

    // === Модальное окно: список логов ===
    const logsModal = document.getElementById('logs-modal');
    const logsClose = document.getElementById('logs-close');

    if (logsClose) {
        logsClose.addEventListener('click', () => {
            logsModal.style.display = 'none';
        });
    }

    if (logsModal) {
        logsModal.addEventListener('click', (e) => {
            if (e.target === logsModal) {
                logsModal.style.display = 'none';
            }
        });
    }

    // === Модальное окно: детали сессии ===
    const sessionModal = document.getElementById('session-modal');
    const sessionClose = document.getElementById('session-close');

    if (sessionClose) {
        sessionClose.addEventListener('click', () => {
            sessionModal.style.display = 'none';
        });
    }

    if (sessionModal) {
        sessionModal.addEventListener('click', (e) => {
            if (e.target === sessionModal) {
                sessionModal.style.display = 'none';
            }
        });
    }

    // Кнопки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            updateInstructions();
        });
    });

    document.getElementById('clear-history').addEventListener('click', clearAll);
    document.getElementById('print-stats').addEventListener('click', printStatistics);
    document.getElementById('save-log').addEventListener('click', saveLog);
    document.getElementById('view-logs').addEventListener('click', viewLogs);

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

function clearAll() {
    detectionsHistory = [];
    trackedObjects = [];
    stats.bolts = { total: 0, correct: 0, warning: 0, reject: 0 };
    stats.nuts = { total: 0, correct: 0, warning: 0, reject: 0 };
    updateDetectionsList();
    updateStats();
    updateCharts();
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

    const sessionTitle = document.getElementById('session-title');
    const sessionItems = document.getElementById('session-items');

    const dateStr = new Date(log.timestamp).toLocaleString('ru-RU');
    sessionTitle.textContent = `Детали сессии от ${dateStr}`;

    const sortedItems = [...log.items].sort((a, b) => {
        const prio = { ok: 0, warning: 1, reject: 2 };
        return (prio[a.category] || 3) - (prio[b.category] || 3);
    });

    sessionItems.innerHTML = '';

    if (sortedItems.length === 0) {
        sessionItems.innerHTML = '<p>Нет обнаруженных объектов.</p>';
    } else {
        sortedItems.forEach(item => {
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

    document.getElementById('logs-modal').style.display = 'none';
    document.getElementById('session-modal').style.display = 'block';
}

function updateInstructions() {
    if (currentTab === 'bolts') {
        instructionsDiv.textContent = 'Положите болт головкой вверх. Только шестигранник или Phillips.';
    } else {
        instructionsDiv.textContent = 'Положите гайку сверху. Только шестигранник.';
    }
}

function getTrackedObject(detection) {
    const center = {
        x: detection.rect.x + detection.rect.width / 2,
        y: detection.rect.y + detection.rect.height / 2
    };
    const size = (detection.rect.width + detection.rect.height) / 2;

    for (let obj of trackedObjects) {
        const dx = obj.center.x - center.x;
        const dy = obj.center.y - center.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const sizeDiff = Math.abs(obj.size - size);
        if (dist < SIMILARITY_DIST && sizeDiff < SIMILARITY_DIST * 0.4 && obj.type === detection.type && obj.subtype === detection.subtype) {
            obj.lastSeen = Date.now();
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
        lastSeen: Date.now(),
        frameCount: 1,
        reported: false
    };
    trackedObjects.push(newObj);

    const now = Date.now();
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

    if (detection.subtype === 'hex') {
        displayType = currentTab === 'bolts' ? 'Шестигранник (болт)' : 'Шестигранник (гайка)';
        isCorrect = true;
        currentStats.correct++;
    } else if (detection.subtype === 'phillips') {
        if (currentTab === 'bolts') {
            displayType = 'Крест (Phillips)';
            isCorrect = true;
            currentStats.correct++;
        } else {
            displayType = '❌ Phillips (не гайка)';
            category = 'reject';
            currentStats.reject++;
        }
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

function detectAllShapes(gray) {
    const binary = new cv.Mat();
    cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
    cv.medianBlur(binary, binary, 5);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const results = [];

    for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour, false);
        if (area < 800 || area > 20000) continue;

        const rect = cv.boundingRect(contour);
        const aspect = rect.width / rect.height;
        if (aspect < 0.6 || aspect > 1.6) continue;

        const perimeter = cv.arcLength(contour, true);
        if (perimeter === 0) continue;

        const epsilon = 0.02 * perimeter;
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, epsilon, true);

        const vertices = approx.rows;
        let subtype = 'unknown';
        let confidence = 60;

        if (vertices >= 4 && vertices <= 8) {
            if (vertices === 5) {
                subtype = 'pentagon';
                confidence = 80;
            } else if (vertices === 6) {
                const { isRegular, conf } = isRegularHexagonFromApprox(approx, rect);
                if (isRegular) {
                    subtype = 'hex';
                    confidence = conf;
                } else {
                    subtype = 'incomplete_hex';
                    confidence = 75;
                }
            } else if (vertices === 7) {
                subtype = 'heptagon';
                confidence = 80;
            } else if (vertices === 8) {
                subtype = 'octagon';
                confidence = 80;
            }
        } else if (vertices < 4) {
            const circularity = 4 * Math.PI * area / (perimeter * perimeter);
            if (circularity > 0.7) {
                subtype = 'possible_circle';
                confidence = 70;
            } else {
                subtype = 'unknown';
                confidence = 50;
            }
        }

        results.push({ rect, confidence, type: 'shape', subtype });
        approx.delete();
    }

    binary.delete();
    contours.delete();
    hierarchy.delete();

    return results;
}

function isRegularHexagonFromApprox(approx, rect) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        points.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] });
    }

    let cx = 0, cy = 0;
    points.forEach(p => { cx += p.x; cy += p.y; });
    cx /= 6; cy /= 6;

    const radii = points.map(p => Math.sqrt((p.x - cx)**2 + (p.y - cy)**2));
    const avgRadius = radii.reduce((a, b) => a + b, 0) / 6;
    const radiusStd = Math.sqrt(radii.reduce((sum, r) => sum + (r - avgRadius)**2, 0) / 6);

    const angles = [];
    for (let i = 0; i < 6; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % 6];
        const v1x = p1.x - cx, v1y = p1.y - cy;
        const v2x = p2.x - cx, v2y = p2.y - cy;
        const dot = v1x * v2x + v1y * v2y;
        const det = v1x * v2y - v1y * v2x;
        let angle = Math.atan2(det, dot) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        angles.push(angle);
    }
    const avgAngle = angles.reduce((a, b) => a + b, 0) / 6;
    const angleStd = Math.sqrt(angles.reduce((sum, a) => sum + (a - avgAngle)**2, 0) / 6);

    if (radiusStd / avgRadius <= 0.15 && angleStd <= 15) {
        let conf = 100;
        if (radiusStd / avgRadius > 0.1) conf = 95;
        if (angleStd > 10) conf = Math.min(conf, 95);
        return { isRegular: true, conf };
    }
    return { isRegular: false, conf: 0 };
}

function detectPhillipsAndCircles(gray) {
    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(7, 7), 0);

    const circles = new cv.Mat();
    cv.HoughCircles(
        blurred,
        circles,
        cv.HOUGH_GRADIENT,
        1,
        gray.rows / 5,
        120,
        35,
        25,
        80
    );

    const results = [];

    if (circles.cols > 0) {
        for (let i = 0; i < circles.cols; i++) {
            const x = circles.data32F[i * 3];
            const y = circles.data32F[i * 3 + 1];
            const r = circles.data32F[i * 3 + 2];
            if (r < 20 || r > 75) continue;

            const roiSize = Math.round(r * 2.2);
            const roiX = Math.max(0, Math.round(x - roiSize / 2));
            const roiY = Math.max(0, Math.round(y - roiSize / 2));
            const roiW = Math.min(roiSize, gray.cols - roiX);
            const roiH = Math.min(roiSize, gray.rows - roiY);

            const roi = gray.roi(new cv.Rect(roiX, roiY, roiW, roiH));
            const edges = new cv.Mat();
            cv.Canny(roi, edges, 60, 160, 3, false);

            const lines = new cv.Mat();
            cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 40, 30, 12);

            let hasCross = false;
            if (lines.rows > 0) {
                let validLines = [];
                for (let j = 0; j < lines.rows; j++) {
                    const x1 = lines.data32S[j * 4];
                    const y1 = lines.data32S[j * 4 + 1];
                    const x2 = lines.data32S[j * 4 + 2];
                    const y2 = lines.data32S[j * 4 + 3];
                    const len = Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
                    if (len < r * 0.6) continue;
                    const gx1 = x1 + roiX;
                    const gy1 = y1 + roiY;
                    const gx2 = x2 + roiX;
                    const gy2 = y2 + roiY;
                    const dist = pointToLineDistance(x, y, gx1, gy1, gx2, gy2);
                    if (dist < r * 0.2) {
                        validLines.push({ x1: gx1, y1: gy1, x2: gx2, y2: gy2 });
                    }
                }

                for (let a = 0; a < validLines.length; a++) {
                    for (let b = a + 1; b < validLines.length; b++) {
                        const angle = getAngleBetweenLines(validLines[a], validLines[b]);
                        if (angle >= 85 && angle <= 95) {
                            hasCross = true;
                            break;
                        }
                    }
                    if (hasCross) break;
                }
            }

            if (hasCross) {
                results.push({
                    rect: { x: x - r, y: y - r, width: r * 2, height: r * 2 },
                    confidence: 95,
                    type: 'phillips',
                    subtype: 'phillips'
                });
            } else {
                results.push({
                    rect: { x: x - r, y: y - r, width: r * 2, height: r * 2 },
                    confidence: 80,
                    type: 'circle',
                    subtype: 'circle_no_cross'
                });
            }

            edges.delete();
            roi.delete();
            lines.delete();
        }
    }

    circles.delete();
    blurred.delete();

    return results;
}

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

        if (currentTab === 'bolts') {
            const shapes = detectAllShapes(gray);
            const phillipsAndCircles = detectPhillipsAndCircles(gray);
            currentDetections = [...shapes, ...phillipsAndCircles];
        } else if (currentTab === 'nuts') {
            const shapes = detectAllShapes(gray);
            currentDetections = shapes.filter(d => d.subtype === 'hex');
        }

        currentDetections = currentDetections.filter(d => d.confidence >= 60);
        currentDetections.sort((a, b) => b.confidence - a.confidence);

        warningDiv.style.display = "none";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        currentDetections.forEach(det => {
            const r = det.rect;
            let color = "#00ff00";
            if (['pentagon', 'heptagon', 'octagon', 'incomplete_hex', 'circle_no_cross'].includes(det.subtype)) {
                color = "#ff0000";
            } else if (det.subtype === 'unknown' || det.confidence < 75) {
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
                label = currentTab === 'bolts' ? 'Болт' : 'Гайка';
            } else if (det.subtype === 'phillips') {
                label = 'Крест';
            } else if (det.subtype === 'circle_no_cross') {
                label = 'Круг (брак)';
            } else if (det.subtype === 'pentagon') {
                label = '5-угол (брак)';
            } else if (det.subtype === 'heptagon') {
                label = '7-угол (брак)';
            } else if (det.subtype === 'octagon') {
                label = '8-угол (брак)';
            } else if (det.subtype === 'incomplete_hex') {
                label = 'Незав.6 (брак)';
            } else {
                label = '???';
            }

            ctx.fillText(`${label} ${Math.round(det.confidence)}%`, r.x + 4, r.y - 6);
        });

        updateCurrentList(currentDetections);

        currentDetections.forEach(det => {
            addToHistoryIfNeeded(det);
        });

        src.delete();
        gray.delete();

    } catch (e) {
        console.error("Ошибка:", e);
        statusDiv.textContent = "⚠️ Ошибка обработки кадра";
        statusDiv.className = "warning-low";
    }

    requestAnimationFrame(mainLoop);
}

window.addEventListener('load', () => {
    setTimeout(() => drawLineChart(), 1000);
});

function drawLineChart() {
    const logs = JSON.parse(localStorage.getItem('hexact_logs') || '[]');
    const last10 = logs.slice(-10).map(log => {
        const total = log.stats.bolts.total + log.stats.nuts.total;
        const correct = log.stats.bolts.correct + log.stats.nuts.correct;
        return {
            correctPct: total ? Math.round((correct / total) * 100) : 0,
            total,
            date: new Date(log.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        };
    });

    const canvas = document.getElementById('stat-chart');
    if (!canvas || last10.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#ccc';
    ctx.font = '12px Arial';
    ctx.fillStyle = '#000';
    for (let i = 0; i <= 100; i += 20) {
        const y = height - (i / 100) * (height - 40) - 20;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
        ctx.fillText(i + '%', 10, y + 4);
    }

    ctx.beginPath();
    ctx.moveTo(50, height - 20);
    ctx.lineTo(width - 20, height - 20);
    ctx.stroke();

    const pointRadius = 4;
    const xStep = (width - 70) / Math.max(1, last10.length - 1);
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < last10.length; i++) {
        const x = 50 + i * xStep;
        const y = height - 20 - (last10[i].correctPct / 100) * (height - 40);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillText(last10[i].date, x - 12, height - 5);
    }
    ctx.stroke();
}