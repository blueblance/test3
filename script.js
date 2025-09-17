const VOCAB_URL = 'public/vocab.txt';
const DEFAULT_VOCAB_TEXT = `# 預設題庫
elaborate | 詳細說明；精心製作 | 1
brisk | 活潑的；輕快的 | 1
curious | 好奇的 | 1
adventure | 冒險；奇遇 | 1
carefree | 無憂無慮的 | 1
harmony | 和諧；融洽 | 1
marvelous | 令人驚嘆的；不可思議的 | 1
resourceful | 足智多謀的 | 1
sprinkle | 灑落；點綴 | 1
whisper | 低聲說；耳語 | 1`;
const STORAGE_KEYS = {
  progress: 'vocabProgressV1',
  highScore: 'vocabHighScoreV1',
  customVocab: 'vocabCustomFileV1',
  totalCorrect: 'vocabTotalCorrectV1',
};

const ui = {
  meaning: document.getElementById('word-meaning'),
  maskedWord: document.getElementById('masked-word'),
  answerInput: document.getElementById('answer-input'),
  submitBtn: document.getElementById('submit-answer'),
  revealBtn: document.getElementById('reveal-answer'),
  nextBtn: document.getElementById('next-question'),
  feedback: document.getElementById('feedback'),
  score: document.getElementById('current-score'),
  highScore: document.getElementById('high-score'),
  streak: document.getElementById('streak'),
  wordsPlayed: document.getElementById('words-played'),
  fileInput: document.getElementById('vocab-file'),
  resetBtn: document.getElementById('reset-progress'),
  downloadBtn: document.getElementById('download-vocab'),
};

const state = {
  vocabulary: [],
  rawVocabText: '',
  progressMap: new Map(),
  currentItem: null,
  maskedIndices: [],
  score: 0,
  streak: 0,
  totalCorrect: Number(localStorage.getItem(STORAGE_KEYS.totalCorrect) || 0),
};

function loadProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.progress);
    if (!saved) return new Map();
    const parsed = JSON.parse(saved);
    return new Map(Object.entries(parsed));
  } catch (err) {
    console.error('載入進度失敗，已重設。', err);
    return new Map();
  }
}

function saveProgress() {
  const obj = Object.fromEntries(state.progressMap);
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(obj));
}

function setHighScore(value) {
  ui.highScore.textContent = value;
  localStorage.setItem(STORAGE_KEYS.highScore, String(value));
}

function initHighScore() {
  const stored = Number(localStorage.getItem(STORAGE_KEYS.highScore) || 0);
  ui.highScore.textContent = stored;
}

async function loadVocabulary() {
  const custom = localStorage.getItem(STORAGE_KEYS.customVocab);
  let sourceText = custom;

  if (!sourceText) {
    try {
      const response = await fetch(VOCAB_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      sourceText = await response.text();
    } catch (error) {
      console.warn('讀取預設題庫失敗，改用內建範例。', error);
      ui.feedback.textContent = '找不到題庫，已改用內建範例。建議啟動本地伺服器以載入 public/vocab.txt。';
      ui.feedback.className = 'feedback';
      sourceText = DEFAULT_VOCAB_TEXT;
    }
  }

  const parsed = parseVocabulary(sourceText);
  if (parsed.length === 0) {
    ui.meaning.textContent = '題庫為空，請上傳新的題庫。';
    state.vocabulary = [];
    state.rawVocabText = sourceText;
    return;
  }

  state.vocabulary = parsed;
  state.rawVocabText = sourceText;
}

function parseVocabulary(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  const seen = new Set();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split('|').map(part => part.trim());
    if (parts.length < 2) continue;

    const word = parts[0];
    const meaning = parts[1];
    const baseMissing = Math.max(1, Number(parts[2] || 1));

    if (!word || !meaning) continue;

    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ word, meaning, baseMissing });
  }

  return items;
}

function ensureProgressEntry(item) {
  const key = item.word.toLowerCase();
  if (!state.progressMap.has(key)) {
    const entry = {
      correctCount: 0,
      currentMissing: Math.min(Math.max(item.baseMissing, 1), Math.max(item.word.length - 2, 1)),
    };
    state.progressMap.set(key, entry);
    return entry;
  }

  const entry = state.progressMap.get(key);
  entry.currentMissing = clampMissing(entry.currentMissing, item);
  return entry;
}

function clampMissing(missing, item) {
  const maxMissing = Math.max(item.word.length - 2, 1);
  const minMissing = Math.max(Math.min(item.baseMissing, maxMissing), 1);
  return Math.min(Math.max(missing, minMissing), maxMissing);
}

function pickNextItem() {
  if (state.vocabulary.length === 0) return null;
  if (!state.currentItem) {
    return state.vocabulary[Math.floor(Math.random() * state.vocabulary.length)];
  }

  let next;
  do {
    next = state.vocabulary[Math.floor(Math.random() * state.vocabulary.length)];
  } while (state.vocabulary.length > 1 && next.word === state.currentItem.word);

  return next;
}

function prepareQuestion(item) {
  const progress = ensureProgressEntry(item);
  const missingCount = clampMissing(progress.currentMissing, item);

  const indices = selectMissingIndices(item.word, missingCount);
  const maskedWord = maskWord(item.word, indices);

  state.currentItem = { item, progress, maskedWord, missingIndices: indices };
  state.maskedIndices = indices;

  renderQuestion();
}

function selectMissingIndices(word, missingCount) {
  const indices = [];
  const available = [];
  for (let i = 0; i < word.length; i++) {
    if (i === 0 || i === word.length - 1) continue;
    if (!/[a-z]/i.test(word[i])) continue;
    available.push(i);
  }

  const maxSelectable = Math.max(Math.min(missingCount, available.length), 1);
  const candidates = [...available];
  while (indices.length < maxSelectable && candidates.length > 0) {
    const pick = Math.floor(Math.random() * candidates.length);
    indices.push(candidates.splice(pick, 1)[0]);
  }

  return indices.sort((a, b) => a - b);
}

function maskWord(word, missingIndices) {
  const chars = [...word];
  missingIndices.forEach(idx => {
    chars[idx] = '_';
  });
  return chars.join(' ');
}

function renderQuestion() {
  const current = state.currentItem;
  if (!current) return;

  ui.meaning.textContent = current.item.meaning;
  ui.maskedWord.textContent = current.maskedWord;
  ui.feedback.textContent = '';
  ui.feedback.className = 'feedback';
  ui.answerInput.value = '';
  ui.answerInput.disabled = false;
  ui.submitBtn.disabled = false;
  ui.nextBtn.disabled = true;
  ui.answerInput.focus();
}

function updateScoreboard() {
  ui.score.textContent = state.score;
  ui.streak.textContent = state.streak;
  ui.wordsPlayed.textContent = state.totalCorrect;
}

function handleSubmit() {
  if (!state.currentItem) return;
  const userInput = ui.answerInput.value.trim();
  if (!userInput) {
    ui.feedback.textContent = '請先輸入你的答案喔！';
    ui.feedback.className = 'feedback';
    return;
  }

  const answer = state.currentItem.item.word;
  if (userInput.toLowerCase() === answer.toLowerCase()) {
    handleCorrect();
  } else {
    handleIncorrect();
  }
}

function handleCorrect() {
  const { item, progress } = state.currentItem;
  const reward = 10 + state.maskedIndices.length * 2;

  state.score += reward;
  state.streak += 1;
  state.totalCorrect += 1;

  progress.correctCount += 1;
  progress.currentMissing = clampMissing(
    item.baseMissing + Math.floor(progress.correctCount / 2),
    item
  );

  saveProgress();
  localStorage.setItem(STORAGE_KEYS.totalCorrect, String(state.totalCorrect));

  if (state.score > Number(ui.highScore.textContent)) {
    setHighScore(state.score);
  }

  ui.feedback.textContent = `答對了！+${reward} 分`;
  ui.feedback.className = 'feedback success';
  ui.answerInput.disabled = true;
  ui.submitBtn.disabled = true;
  ui.nextBtn.disabled = false;
  ui.maskedWord.textContent = spacedWord(item.word);

  updateScoreboard();
}

function spacedWord(word) {
  return word.split('').join(' ');
}

function handleIncorrect() {
  const { item, progress } = state.currentItem;
  state.streak = 0;
  progress.currentMissing = clampMissing(progress.currentMissing - 1, item);
  saveProgress();

  ui.feedback.textContent = '差一點點，再試一次！';
  ui.feedback.className = 'feedback error';
  updateScoreboard();
}

function handleNextQuestion() {
  const nextItem = pickNextItem();
  if (!nextItem) {
    ui.meaning.textContent = '沒有題目可用了，請上傳新的題庫。';
    ui.maskedWord.textContent = '--';
    return;
  }
  prepareQuestion(nextItem);
}

function handleReveal() {
  if (!state.currentItem) return;

  const { item, progress } = state.currentItem;
  state.streak = 0;
  progress.correctCount = Math.max(progress.correctCount - 1, 0);
  progress.currentMissing = clampMissing(item.baseMissing, item);
  saveProgress();

  ui.maskedWord.textContent = spacedWord(item.word);
  ui.feedback.textContent = `完整單字：${item.word}`;
  ui.feedback.className = 'feedback';
  ui.answerInput.disabled = true;
  ui.submitBtn.disabled = true;
  ui.nextBtn.disabled = false;
  updateScoreboard();
}

function handleResetProgress() {
  const confirmReset = window.confirm('確定要重設所有練習紀錄與分數嗎？');
  if (!confirmReset) return;

  state.score = 0;
  state.streak = 0;
  state.totalCorrect = 0;
  state.progressMap = new Map();
  localStorage.removeItem(STORAGE_KEYS.progress);
  localStorage.removeItem(STORAGE_KEYS.totalCorrect);
  initHighScore();
  updateScoreboard();
  handleNextQuestion();
}

function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.endsWith('.txt')) {
    ui.feedback.textContent = '請選擇副檔名為 .txt 的檔案';
    ui.feedback.className = 'feedback error';
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    const parsed = parseVocabulary(text);
    if (parsed.length === 0) {
      ui.feedback.textContent = '題庫內容不正確或為空，請檢查檔案格式。';
      ui.feedback.className = 'feedback error';
      event.target.value = '';
      return;
    }

    state.vocabulary = parsed;
    state.rawVocabText = text;
    state.progressMap = new Map();
    state.score = 0;
    state.streak = 0;
    state.totalCorrect = 0;

    localStorage.setItem(STORAGE_KEYS.customVocab, text);
    localStorage.removeItem(STORAGE_KEYS.progress);
    localStorage.removeItem(STORAGE_KEYS.totalCorrect);

    ui.feedback.textContent = '新題庫已載入，開始練習吧！';
    ui.feedback.className = 'feedback success';
    initHighScore();
    updateScoreboard();
    handleNextQuestion();
    event.target.value = '';
  };

  reader.onerror = () => {
    ui.feedback.textContent = '讀取檔案時發生錯誤，請再試一次。';
    ui.feedback.className = 'feedback error';
  };

  reader.readAsText(file, 'utf-8');
}

function handleDownloadVocab() {
  if (!state.rawVocabText) {
    ui.feedback.textContent = '目前沒有可供下載的題庫內容。';
    ui.feedback.className = 'feedback';
    return;
  }

  const blob = new Blob([state.rawVocabText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'vocab.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function attachEvents() {
  ui.submitBtn.addEventListener('click', handleSubmit);
  ui.answerInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  });
  ui.nextBtn.addEventListener('click', handleNextQuestion);
  ui.revealBtn.addEventListener('click', handleReveal);
  ui.resetBtn.addEventListener('click', handleResetProgress);
  ui.fileInput.addEventListener('change', handleFileUpload);
  ui.downloadBtn.addEventListener('click', handleDownloadVocab);
}

async function init() {
  initHighScore();
  state.progressMap = loadProgress();
  updateScoreboard();

  await loadVocabulary();
  if (state.vocabulary.length === 0) return;
  handleNextQuestion();
}

attachEvents();
init().catch(() => {
  ui.feedback.textContent = '系統初始化失敗，請重新整理或稍後再試。';
  ui.feedback.className = 'feedback error';
});
