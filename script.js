const HIGH_PROGRESS_LIMIT = 50;
const LOW_PROGRESS_LIMIT = 10;
const GOOD_AVERAGE_LIMIT = 30;
const wordsPerDay = [12, 55, 8, 63, 30, 5, 72];

const STORAGE_THEME_KEY = 'vadim_theme';
const STORAGE_DICT_KEY = 'vadim_dictionary';
const STORAGE_DICT_VISIBLE_KEY = 'vadim_dict_visible';

function safeGetStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch (err) {
        console.warn('localStorage недоступен для чтения:', err.message);
        return null;
    }
}

function safeSetStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (err) {
        console.warn('localStorage недоступен для записи:', err.message);
    }
}

function getEl(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn('Элемент с id="' + id + '" не найден');
    }
    return el;
}

function getFirst(selector) {
    const el = document.querySelector(selector);
    if (!el) {
        console.warn('Элемент по селектору "' + selector + '" не найден');
    }
    return el;
}

function getAll(selector) {
    const list = document.querySelectorAll(selector);
    if (list.length === 0) {
        console.warn('Элементы по селектору "' + selector + '" не найдены');
    }
    return list;
}

function findMax(numbers) {
    let max = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] > max) {
            max = numbers[i];
        }
    }
    return max;
}

function filterAbove(numbers, limit) {
    const result = [];
    for (let i = 0; i < numbers.length; i++) {
        if (numbers[i] > limit) {
            result.push(numbers[i]);
        }
    }
    return result;
}

function sumArray(numbers) {
    let sum = 0;
    for (let i = 0; i < numbers.length; i++) {
        sum += numbers[i];
    }
    return sum;
}

function getLevel(words) {
    if (words > HIGH_PROGRESS_LIMIT) {
        return 'high';
    }
    if (words <= LOW_PROGRESS_LIMIT) {
        return 'low';
    }
    return 'normal';
}

const LEVEL_NAMES = {
    high: 'высокий',
    normal: 'средний',
    low: 'малый'
};

function setText(id, text) {
    const element = getEl(id);
    if (element) {
        element.textContent = text;
    }
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function renderChart(numbers, max) {
    const chart = getEl('days-chart');
    if (!chart) {
        return;
    }
    chart.textContent = '';
    for (let i = 0; i < numbers.length; i++) {
        const level = getLevel(numbers[i]);
        const row = createElement('li', 'day-row');
        row.appendChild(createElement('span', 'day-label', 'День ' + (i + 1)));
        const track = createElement('div', 'day-track');
        const bar = createElement('div', 'day-bar ' + level);
        bar.style.width = (numbers[i] / max * 100) + '%';
        track.appendChild(bar);
        row.appendChild(track);
        const value = createElement('span', 'day-value', numbers[i] + ' слов');
        value.appendChild(createElement('span', 'day-tag ' + level, LEVEL_NAMES[level]));
        row.appendChild(value);
        chart.appendChild(row);
    }
}

function applyTheme(theme) {
    const body = document.body;
    const toggleBtn = getEl('theme-toggle');
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        if (toggleBtn) toggleBtn.textContent = '☀️ Светлая тема';
    } else {
        body.classList.remove('dark-theme');
        if (toggleBtn) toggleBtn.textContent = '🌙 Тёмная тема';
    }
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    safeSetStorage(STORAGE_THEME_KEY, newTheme);
}

function loadTheme() {
    const saved = safeGetStorage(STORAGE_THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
        applyTheme(saved);
    } else {
        applyTheme('light');
    }
}

let dictionary = [];

function saveDictionary() {
    safeSetStorage(STORAGE_DICT_KEY, JSON.stringify(dictionary));
}

function loadDictionary() {
    const saved = safeGetStorage(STORAGE_DICT_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                dictionary = parsed;
            }
        } catch (err) {
            console.error('Ошибка парсинга словаря:', err.message);
            dictionary = [];
        }
    }
}

function showError(message) {
    const errorEl = getEl('dictionary-error');
    if (errorEl) {
        errorEl.textContent = message;
        setTimeout(function () {
            if (errorEl.textContent === message) {
                errorEl.textContent = '';
            }
        }, 3000);
    }
}

function renderDictionary() {
    const tbody = getEl('dictionary-body');
    const emptyMsg = getEl('dictionary-empty');
    if (!tbody) return;

    tbody.textContent = '';

    if (dictionary.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('dictionary-hidden');
        return;
    }

    if (emptyMsg) emptyMsg.classList.add('dictionary-hidden');

    dictionary.forEach(function (item, index) {
        const tr = document.createElement('tr');

        const tdWord = document.createElement('td');
        tdWord.textContent = item.word;

        const tdTrans = document.createElement('td');
        tdTrans.textContent = item.translation;

        const tdAction = document.createElement('td');
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.textContent = 'Удалить';
        delBtn.setAttribute('data-index', index);
        delBtn.addEventListener('click', function () {
            deleteWord(index);
        });
        tdAction.appendChild(delBtn);

        tr.appendChild(tdWord);
        tr.appendChild(tdTrans);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
    });
}

function addWord(word, translation) {
    if (!word || !translation) {
        showError('Ошибка: слово и перевод не могут быть пустыми.');
        return false;
    }
    if (typeof word !== 'string' || typeof translation !== 'string') {
        showError('Ошибка: слово и перевод должны быть строками.');
        return false;
    }

    const trimmedWord = word.trim();
    const trimmedTrans = translation.trim();

    if (trimmedWord.length === 0 || trimmedTrans.length === 0) {
        showError('Ошибка: введите непустые значения.');
        return false;
    }

    const exists = dictionary.some(function (item) {
        return item.word.toLowerCase() === trimmedWord.toLowerCase();
    });
    if (exists) {
        showError('Ошибка: слово "' + trimmedWord + '" уже есть в словаре.');
        return false;
    }

    dictionary.push({ word: trimmedWord, translation: trimmedTrans });
    saveDictionary();
    renderDictionary();
    return true;
}

function deleteWord(index) {
    if (index < 0 || index >= dictionary.length) {
        showError('Ошибка: неверный индекс слова.');
        return;
    }
    const removed = dictionary.splice(index, 1);
    saveDictionary();
    renderDictionary();
    console.log('Удалено слово:', removed[0]);
}

function clearDictionary() {
    if (dictionary.length === 0) {
        showError('Словарь уже пуст.');
        return;
    }
    if (confirm('Вы уверены, что хотите очистить весь словарь?')) {
        dictionary = [];
        saveDictionary();
        renderDictionary();
        console.log('Словарь очищен.');
    }
}

function toggleDictionaryVisibility() {
    const content = getEl('dictionary-content');
    const toggleBtn = getEl('toggle-dictionary');
    if (!content || !toggleBtn) return;

    const isHidden = content.classList.toggle('dictionary-hidden');
    toggleBtn.textContent = isHidden ? 'Показать словарь' : 'Скрыть словарь';

    safeSetStorage(STORAGE_DICT_VISIBLE_KEY, isHidden ? 'hidden' : 'visible');
}

function loadDictionaryVisibility() {
    const saved = safeGetStorage(STORAGE_DICT_VISIBLE_KEY);
    const content = getEl('dictionary-content');
    const toggleBtn = getEl('toggle-dictionary');
    if (!content || !toggleBtn) return;

    if (saved === 'hidden') {
        content.classList.add('dictionary-hidden');
        toggleBtn.textContent = 'Показать словарь';
    }
}

function run() {
    loadTheme();

    const themeBtn = getFirst('#theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }

    let userName = prompt('Как вас зовут?');
    if (userName === null || userName.trim() === '') {
        userName = 'Гость';
    }
    alert('Привет, ' + userName + '! Давайте посмотрим на ваш прогресс в изучении слов.');

    const totalWords = sumArray(wordsPerDay);
    const highDays = filterAbove(wordsPerDay, HIGH_PROGRESS_LIMIT);
    const bestDay = findMax(wordsPerDay);
    const average = totalWords / wordsPerDay.length;
    const lowDays = [];
    for (let i = 0; i < wordsPerDay.length; i++) {
        if (wordsPerDay[i] <= LOW_PROGRESS_LIMIT) {
            lowDays.push(i + 1);
        }
    }
    const lowPercent = (lowDays.length / wordsPerDay.length) * 100;

    alert('Всего выучено ' + totalWords + ' слов, в ' + highDays.length + ' днях прогресс был высоким');

    console.log('%cПрогресс изучения слов: ' + userName, 'color: #0e7490; font-size: 16px; font-weight: bold;');
    console.table(wordsPerDay.map(function (words, index) {
        return { 'День': index + 1, 'Слов': words, 'Прогресс': LEVEL_NAMES[getLevel(words)] };
    }));
    console.log('Лучший день: ' + bestDay + ' слов');
    console.log('Дни с высоким прогрессом (> ' + HIGH_PROGRESS_LIMIT + '): ' + highDays.join(', '));
    console.log('Дней с малым прогрессом (≤ ' + LOW_PROGRESS_LIMIT + '): ' + lowDays.length + ' (дни: ' + lowDays.join(', ') + ')');
    console.log('Процент дней с малым прогрессом: ' + lowPercent.toFixed(1) + '%');
    console.log('Среднее за день: ' + Math.round(average) + ' слов');

    const goodTempo = average > GOOD_AVERAGE_LIMIT;
    if (goodTempo) {
        console.log('%cОтличный темп изучения языка!', 'color: #166534; font-weight: bold;');
    }

    setText('greeting', 'Привет, ' + userName + '! Вот ваш прогресс за ' + wordsPerDay.length + ' дней.');
    setText('stat-total', totalWords);
    setText('stat-high', highDays.length);
    setText('stat-low', lowDays.length + ' (' + lowPercent.toFixed(1) + '%)');
    setText('stat-average', Math.round(average));
    renderChart(wordsPerDay, bestDay);

    const note = getEl('tempo-note');
    if (note) {
        note.hidden = !goodTempo;
    }

    loadDictionary();
    renderDictionary();
    loadDictionaryVisibility();

    const wordForm = getFirst('#word-form');
    if (wordForm) {
        wordForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const wordInput = getEl('word-input');
            const transInput = getEl('translation-input');
            if (!wordInput || !transInput) return;

            const word = wordInput.value;
            const translation = transInput.value;

            if (addWord(word, translation)) {
                wordInput.value = '';
                transInput.value = '';
                wordInput.focus();
            }
        });
    }

    const clearBtn = getEl('clear-dictionary');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearDictionary);
    }

    const toggleDictBtn = getEl('toggle-dictionary');
    if (toggleDictBtn) {
        toggleDictBtn.addEventListener('click', toggleDictionaryVisibility);
    }

    const langCards = getAll('.lang-card');
    langCards.forEach(function (card, idx) {
        card.setAttribute('data-index', idx);
    });

    const firstH2 = getFirst('main h2');
    if (firstH2) {
        console.log('Первый заголовок h2 в main:', firstH2.textContent);
    }
}

window.addEventListener('load', function () {
    setTimeout(run, 100);
});