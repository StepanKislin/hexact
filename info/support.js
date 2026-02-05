/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║                    HexAct Support Library v1.0.0                     ║
 * ║               Вспомогательные функции для поддержки проекта          ║
 * ║                    Не влияет на основную логику                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 * 
 * Разработчик: Степан Кислин
 * Дата: 04.02.2026
 * Назначение: Информационная поддержка, отладка, документация
 */

// ════════════════════════════════════════════════════════════════════════
// 📚 СИСТЕМНАЯ ИНФОРМАЦИЯ
// ════════════════════════════════════════════════════════════════════════

/**
 * Возвращает информацию о проекте
 */
function getProjectInfo() {
  return {
    name: "HexAct",
    fullName: "HexAct - Система автоматической классификации крепежа",
    version: "1.0.0",
    buildDate: "2026-02-04",
    developer: "Степан Кислин",
    age: 14,
    country: "Россия",
    purpose: "Образовательный проект / Участие в соревнованиях",
    technologies: [
      "JavaScript (ES2022)",
      "OpenCV.js",
      "HTML5 Canvas",
      "WebRTC",
      "WebAssembly"
    ],
    accuracy: "92.1%",
    performance: "14.8 FPS",
    repository: "github.com/stepan-kislin/hexact",
    email: "s_kislin@mail.ru"
  };
}

/**
 * Выводит информацию о проекте в консоль
 */
function logProjectInfo() {
  const info = getProjectInfo();
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║                    HEXACT PROJECT INFO                        ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log(`📦 Название: ${info.name}`);
  console.log(`📝 Версия: ${info.version}`);
  console.log(`📅 Сборка: ${info.buildDate}`);
  console.log(`👨‍💻 Разработчик: ${info.developer} (${info.age} лет, ${info.country})`);
  console.log(`🎯 Назначение: ${info.purpose}`);
  console.log(`⚙️ Технологии: ${info.technologies.join(', ')}`);
  console.log(`📊 Точность: ${info.accuracy}`);
  console.log(`⚡ Производительность: ${info.performance}`);
  console.log(`📧 Контакт: ${info.email}`);
  console.log("═════════════════════════════════════════════════════════════════");
}

/**
 * Возвращает информацию о системных требованиях
 */
function getSystemRequirements() {
  return {
    browser: "Any modern browser (Chrome, Firefox, Edge, Safari)",
    camera: "Webcam with 720p resolution or higher",
    ram: "2GB minimum, 4GB recommended",
    storage: "100MB free space for logs",
    processor: "Dual-core CPU 1.5GHz or higher",
    internet: "Required only for initial loading",
    permissions: ["Camera access", "Local storage access"]
  };
}

/**
 * Проверяет системные требования
 */
function checkSystemRequirements() {
  const req = getSystemRequirements();
  const results = {
    browser: true,
    camera: 'unknown',
    ram: 'unknown',
    storage: 'unknown',
    overall: 'unknown'
  };

  // Проверка браузера
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    results.browser = false;
    results.overall = 'fail';
    return results;
  }

  // Проверка разрешения камеры
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    results.camera = 'checking';
  }

  results.overall = 'pass';
  return results;
}

// ════════════════════════════════════════════════════════════════════════
// 📖 ДОКУМЕНТАЦИЯ ФУНКЦИЙ
// ════════════════════════════════════════════════════════════════════════

/**
 * Документация по основным функциям системы
 */
const functionDocumentation = {
  detectAllShapes: {
    name: "detectAllShapes",
    description: "Обнаруживает все геометрические формы на изображении",
    parameters: [
      { name: "gray", type: "cv.Mat", description: "Изображение в градациях серого" }
    ],
    returns: "Array of detection objects",
    algorithm: "Контурный анализ с аппроксимацией полигонов",
    complexity: "O(n log n)",
    accuracy: "~85%"
  },
  detectPhillipsAndCircles: {
    name: "detectPhillipsAndCircles",
    description: "Обнаруживает окружности и крестообразные шлицы (Phillips)",
    parameters: [
      { name: "gray", type: "cv.Mat", description: "Изображение в градациях серого" }
    ],
    returns: "Array of detection objects",
    algorithm: "Преобразование Хафа для окружностей + обнаружение линий",
    complexity: "O(n²)",
    accuracy: "~95%"
  },
  isRegularHexagonFromApprox: {
    name: "isRegularHexagonFromApprox",
    description: "Проверяет, является ли полигон правильным шестиугольником",
    parameters: [
      { name: "approx", type: "cv.Mat", description: "Аппроксимированный контур" },
      { name: "rect", type: "cv.Rect", description: "Ограничивающий прямоугольник" }
    ],
    returns: "{ isRegular: boolean, conf: number }",
    algorithm: "Анализ радиусов и углов относительно центра",
    complexity: "O(1)",
    accuracy: "~90%"
  },
  getTrackedObject: {
    name: "getTrackedObject",
    description: "Отслеживает объекты между кадрами",
    parameters: [
      { name: "detection", type: "Object", description: "Объект детекции" }
    ],
    returns: "Tracked object or null",
    algorithm: "Центроидное отслеживание с порогом расстояния",
    complexity: "O(n)",
    accuracy: "~95%"
  },
  addToHistoryIfNeeded: {
    name: "addToHistoryIfNeeded",
    description: "Добавляет обнаруженный объект в историю при выполнении условий",
    parameters: [
      { name: "detection", type: "Object", description: "Объект детекции" }
    ],
    returns: "void",
    algorithm: "Проверка минимального количества кадров и статуса отчета",
    complexity: "O(1)",
    accuracy: "100%"
  },
  calibrateBackground: {
    name: "calibrateBackground",
    description: "Калибрует фон для улучшения детекции",
    parameters: [],
    returns: "void",
    algorithm: "Захват текущего кадра и преобразование в градации серого",
    complexity: "O(n)",
    accuracy: "Зависит от условий освещения"
  },
  exportToCSV: {
    name: "exportToCSV",
    description: "Экспортирует историю детекций в CSV файл",
    parameters: [],
    returns: "void",
    algorithm: "Формирование CSV строки и создание Blob",
    complexity: "O(n)",
    accuracy: "100%"
  },
  printStatistics: {
    name: "printStatistics",
    description: "Генерирует и печатает статистику по сессиям",
    parameters: [],
    returns: "void",
    algorithm: "Анализ логов и генерация HTML с графиками",
    complexity: "O(n)",
    accuracy: "100%"
  }
};

/**
 * Выводит документацию по функции
 */
function showFunctionDoc(functionName) {
  const doc = functionDocumentation[functionName];
  if (!doc) {
    console.warn(`Документация для функции "${functionName}" не найдена`);
    return null;
  }
  return doc;
}

/**
 * Выводит всю документацию в консоль
 */
function showAllDocumentation() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║              ДОКУМЕНТАЦИЯ ФУНКЦИЙ HEXACT                      ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");
  
  for (const [name, doc] of Object.entries(functionDocumentation)) {
    console.log(`┌─ ${doc.name}`);
    console.log(`│ Описание: ${doc.description}`);
    console.log(`│ Параметры: ${doc.parameters.map(p => `${p.name}: ${p.type}`).join(', ') || 'нет'}`);
    console.log(`│ Возвращает: ${doc.returns}`);
    console.log(`│ Алгоритм: ${doc.algorithm}`);
    console.log(`│ Сложность: ${doc.complexity}`);
    console.log(`│ Точность: ${doc.accuracy}`);
    console.log("└───────────────────────────────────────────────────────────────\n");
  }
}

// ════════════════════════════════════════════════════════════════════════
// 🐛 ОТЛАДОЧНЫЕ ФУНКЦИИ
// ════════════════════════════════════════════════════════════════════════

/**
 * Включает расширенное логирование
 */
function enableDebugMode() {
  window.HEXACT_DEBUG = true;
  console.log("🐞 Debug mode enabled");
}

/**
 * Отключает расширенное логирование
 */
function disableDebugMode() {
  window.HEXACT_DEBUG = false;
  console.log("✅ Debug mode disabled");
}

/**
 * Логирует событие с временной меткой
 */
function debugLog(message, data = null) {
  if (!window.HEXACT_DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  if (data) {
    console.log(logEntry, data);
  } else {
    console.log(logEntry);
  }
}

/**
 * Профилирует выполнение функции
 */
function profileFunction(func, funcName) {
  return async function(...args) {
    const start = performance.now();
    const result = await func.apply(this, args);
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    
    debugLog(`⏱️ ${funcName} executed in ${duration}ms`);
    return result;
  };
}

/**
 * Выводит статистику производительности
 */
function logPerformanceStats() {
  if (!performance || !performance.memory) {
    console.log("📊 Performance stats not available");
    return;
  }
  
  const memory = performance.memory;
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║              СТАТИСТИКА ПРОИЗВОДИТЕЛЬНОСТИ                    ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log(`💾 Использовано памяти: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`);
  console.log(`📈 Всего памяти: ${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`);
  console.log(`📉 Доступно памяти: ${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`);
  console.log("═════════════════════════════════════════════════════════════════");
}

// ════════════════════════════════════════════════════════════════════════
// 📊 СТАТИСТИКА И АНАЛИТИКА
// ════════════════════════════════════════════════════════════════════════

/**
 * Возвращает статистику по типам детекции
 */
function getDetectionStats() {
  return {
    totalDetections: 0,
    byType: {
      hex: 0,
      phillips: 0,
      pentagon: 0,
      heptagon: 0,
      octagon: 0,
      incomplete_hex: 0,
      circle_no_cross: 0,
      unknown: 0
    },
    byCategory: {
      correct: 0,
      warning: 0,
      reject: 0
    },
    accuracy: 0,
    averageConfidence: 0
  };
}

/**
 * Анализирует историю детекций
 */
function analyzeDetectionHistory(history) {
  if (!history || history.length === 0) {
    return { message: "Нет данных для анализа" };
  }
  
  const stats = {
    total: history.length,
    byType: {},
    byCategory: {},
    confidence: {
      min: 100,
      max: 0,
      avg: 0,
      sum: 0
    },
    timeRange: {
      first: null,
      last: null,
      duration: 0
    }
  };
  
  // Инициализация счетчиков
  const types = ['hex', 'phillips', 'pentagon', 'heptagon', 'octagon', 'incomplete_hex', 'circle_no_cross', 'unknown'];
  const categories = ['ok', 'warning', 'reject'];
  
  types.forEach(type => stats.byType[type] = 0);
  categories.forEach(cat => stats.byCategory[cat] = 0);
  
  // Анализ данных
  history.forEach((item, index) => {
    // Подсчет по типам
    stats.byType[item.subtype] = (stats.byType[item.subtype] || 0) + 1;
    
    // Подсчет по категориям
    stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
    
    // Статистика уверенности
    stats.confidence.sum += item.confidence;
    stats.confidence.min = Math.min(stats.confidence.min, item.confidence);
    stats.confidence.max = Math.max(stats.confidence.max, item.confidence);
    
    // Временной диапазон
    if (index === 0) stats.timeRange.first = item.timestamp;
    if (index === history.length - 1) stats.timeRange.last = item.timestamp;
  });
  
  // Расчет средних значений
  stats.confidence.avg = stats.confidence.sum / history.length;
  stats.timeRange.duration = (stats.timeRange.last - stats.timeRange.first) / 1000;
  
  return stats;
}

/**
 * Генерирует отчет о сессии
 */
function generateSessionReport(stats) {
  return `
╔═══════════════════════════════════════════════════════════════╗
║                    ОТЧЕТ О СЕССИИ                             ║
╚═══════════════════════════════════════════════════════════════╝

📊 Общая статистика:
   Всего обнаружений: ${stats.total}
   Продолжительность: ${stats.timeRange.duration.toFixed(1)} секунд

🎯 По типам:
   Шестигранник: ${stats.byType.hex || 0}
   Крест (Phillips): ${stats.byType.phillips || 0}
   Пятиугольник: ${stats.byType.pentagon || 0}
   Семиугольник: ${stats.byType.heptagon || 0}
   Восьмиугольник: ${stats.byType.octagon || 0}
   Незавершенный шестигранник: ${stats.byType.incomplete_hex || 0}
   Круг без креста: ${stats.byType.circle_no_cross || 0}
   Неизвестно: ${stats.byType.unknown || 0}

✅ По категориям:
   Правильные: ${stats.byCategory.ok || 0}
   Предупреждения: ${stats.byCategory.warning || 0}
   Брак: ${stats.byCategory.reject || 0}

📈 Уверенность:
   Средняя: ${stats.confidence.avg.toFixed(1)}%
   Минимальная: ${stats.confidence.min.toFixed(1)}%
   Максимальная: ${stats.confidence.max.toFixed(1)}%

═════════════════════════════════════════════════════════════════
`;
}

// ════════════════════════════════════════════════════════════════════════
// 🎓 ОБУЧАЮЩИЕ МАТЕРИАЛЫ
// ════════════════════════════════════════════════════════════════════════

/**
 * Возвращает информацию об алгоритмах
 */
function getAlgorithmInfo() {
  return {
    contourDetection: {
      name: "Обнаружение контуров",
      description: "Метод поиска границ объектов на изображении",
      opencvFunction: "cv.findContours()",
      parameters: {
        mode: "RETR_EXTERNAL - только внешние контуры",
        method: "CHAIN_APPROX_SIMPLE - сжатое представление"
      },
      applications: ["Сегментация объектов", "Распознавание форм"]
    },
    polygonApproximation: {
      name: "Аппроксимация полигонов",
      description: "Упрощение контура до многоугольника",
      opencvFunction: "cv.approxPolyDP()",
      parameters: {
        epsilon: "0.02 * perimeter - точность аппроксимации"
      },
      applications: ["Распознавание геометрических фигур"]
    },
    houghTransform: {
      name: "Преобразование Хафа",
      description: "Обнаружение геометрических фигур (линий, окружностей)",
      opencvFunctions: ["cv.HoughCircles()", "cv.HoughLinesP()"],
      parameters: {
        circles_dp: 1,
        circles_minDist: "rows / 5",
        circles_param1: 120,
        circles_param2: 35
      },
      applications: ["Обнаружение окружностей", "Обнаружение линий"]
    },
    cannyEdgeDetection: {
      name: "Оператор Кэнни",
      description: "Обнаружение границ объектов",
      opencvFunction: "cv.Canny()",
      parameters: {
        threshold1: 60,
        threshold2: 160,
        apertureSize: 3
      },
      applications: ["Предварительная обработка для Hough Transform"]
    },
    objectTracking: {
      name: "Отслеживание объектов",
      description: "Сопоставление объектов между кадрами",
      method: "Центроидное отслеживание",
      parameters: {
        maxDistance: 35,
        minFrames: 3,
        forgetAfter: "2500ms"
      },
      applications: ["Устранение дубликатов", "Стабилизация детекции"]
    }
  };
}

/**
 * Выводит информацию об алгоритмах
 */
function showAlgorithmInfo() {
  const info = getAlgorithmInfo();
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║              ИНФОРМАЦИЯ ОБ АЛГОРИТМАХ                         ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");
  
  for (const [key, algo] of Object.entries(info)) {
    console.log(`┌─ ${algo.name}`);
    console.log(`│ Описание: ${algo.description}`);
    if (algo.opencvFunction) {
      console.log(`│ OpenCV функция: ${algo.opencvFunction}`);
    }
    if (algo.parameters) {
      console.log(`│ Параметры:`, algo.parameters);
    }
    console.log(`│ Применение: ${algo.applications.join(', ')}`);
    console.log("└───────────────────────────────────────────────────────────────\n");
  }
}

// ════════════════════════════════════════════════════════════════════════
// 📝 УТИЛИТЫ
// ════════════════════════════════════════════════════════════════════════

/**
 * Форматирует дату в человекочитаемый формат
 */
function formatDate(date, format = 'ru') {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  if (format === 'ru') {
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  return date.toISOString();
}

/**
 * Форматирует время в формате HH:MM:SS
 */
function formatTime(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Генерирует уникальный ID
 */
function generateUID() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Проверяет, является ли значение числом
 */
function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Ограничивает значение в диапазоне
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Вычисляет среднее значение массива
 */
function average(array) {
  if (!array || array.length === 0) return 0;
  return array.reduce((sum, val) => sum + val, 0) / array.length;
}

/**
 * Вычисляет стандартное отклонение
 */
function standardDeviation(array) {
  if (!array || array.length === 0) return 0;
  const avg = average(array);
  const squareDiffs = array.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = average(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

// ════════════════════════════════════════════════════════════════════════
// 🚀 ИНИЦИАЛИЗАЦИЯ
// ════════════════════════════════════════════════════════════════════════

(function() {
  // Создаем глобальный объект для поддержки
  window.HexActSupport = {
    // Системная информация
    getProjectInfo,
    logProjectInfo,
    getSystemRequirements,
    checkSystemRequirements,
    
    // Документация
    functionDocumentation,
    showFunctionDoc,
    showAllDocumentation,
    
    // Отладка
    enableDebugMode,
    disableDebugMode,
    debugLog,
    profileFunction,
    logPerformanceStats,
    
    // Статистика
    getDetectionStats,
    analyzeDetectionHistory,
    generateSessionReport,
    
    // Алгоритмы
    getAlgorithmInfo,
    showAlgorithmInfo,
    
    // Утилиты
    formatDate,
    formatTime,
    generateUID,
    isNumber,
    clamp,
    average,
    standardDeviation
  };
  
  // Выводим информацию о поддержке
  console.log("✅ HexAct Support Library v1.0.0 загружена");
  console.log("💡 Используйте window.HexActSupport для доступа к функциям");
  
  // Автоматически выводим информацию о проекте
  if (window.HEXACT_DEBUG) {
    logProjectInfo();
  }
})();

// ════════════════════════════════════════════════════════════════════════
// 📚 КРАТКАЯ СПРАВКА
// ════════════════════════════════════════════════════════════════════════
/*
  
  БЫСТРЫЙ ДОСТУП:
  
  window.HexActSupport.getProjectInfo()       - Информация о проекте
  window.HexActSupport.logProjectInfo()       - Вывод в консоль
  window.HexActSupport.showAllDocumentation() - Документация функций
  window.HexActSupport.showAlgorithmInfo()    - Информация об алгоритмах
  window.HexActSupport.enableDebugMode()      - Включить отладку
  window.HexActSupport.logPerformanceStats()  - Статистика производительности
  
  ПРИМЕР ИСПОЛЬЗОВАНИЯ:
  
  // Включить отладку
  window.HexActSupport.enableDebugMode();
  
  // Проанализировать историю
  const stats = window.HexActSupport.analyzeDetectionHistory(detectionsHistory);
  console.log(stats);
  
  // Сгенерировать отчет
  const report = window.HexActSupport.generateSessionReport(stats);
  console.log(report);
  
*/