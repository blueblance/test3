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

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

const ui = {
  meaning: document.getElementById('word-meaning'),
  maskedWord: document.getElementById('masked-word'),
  choiceContainer: document.getElementById('choice-container'),
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
  showVocabBtn: document.getElementById('show-vocab'),
  vocabModal: document.getElementById('vocab-modal'),
  vocabList: document.getElementById('vocab-list'),
  closeVocabBtn: document.getElementById('close-vocab'),
  vocabCount: document.getElementById('vocab-count'),
  // Level system elements
  levelImage: document.getElementById('level-image'),
  currentLevel: document.getElementById('current-level'),
  experienceFill: document.getElementById('experience-fill'),
  experienceCurrent: document.getElementById('experience-current'),
  experienceTarget: document.getElementById('experience-target'),
};

// Fun sound effects and celebrations
const celebrations = [
  '🎉 太棒了！',
  '⭐ 好厲害！',
  '🏆 答對了！',
  '✨ 很棒！',
  '🎊 做得好！',
  '🌟 超讚的！',
  '🎈 好聪明！'
];

const encouragements = [
  '💪 再試一次！',
  '🤔 仔細想想！',
  '📚 慢慢來！',
  '🌈 別放棄！',
  '🎯 加油！',
  '💡 你可以的！'
];

function playSuccessSound() {
  try {
    const audio = new Audio('public/audio/good.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => {
      console.log('Failed to play success sound:', e);
      // Fallback to Web Audio API
      playFallbackSuccessSound();
    });
  } catch (e) {
    console.log('Audio not supported, using fallback');
    playFallbackSuccessSound();
  }
}

function playFallbackSuccessSound() {
  // Using Web Audio API to create simple success tone as fallback
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Fallback audio not supported');
  }
}

function playErrorSound() {
  try {
    const audio = new Audio('public/audio/fail.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => {
      console.log('Failed to play error sound:', e);
      // Fallback to Web Audio API
      playFallbackErrorSound();
    });
  } catch (e) {
    console.log('Audio not supported, using fallback');
    playFallbackErrorSound();
  }
}

function playFallbackErrorSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.log('Fallback audio not supported');
  }
}

function triggerCelebration() {
  // Add confetti-like effect
  const colors = ['#ff6b9d', '#ffd93d', '#4299e1', '#9f7aea', '#48bb78'];
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        left: ${Math.random() * 100}vw;
        top: -10px;
        animation: confettiFall 2s ease-out forwards;
      `;
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 2000);
    }, i * 50);
  }
  
  // Add CSS animation if not already present
  if (!document.getElementById('confetti-styles')) {
    const style = document.createElement('style');
    style.id = 'confetti-styles';
    style.textContent = `
      @keyframes confettiFall {
        to {
          transform: translateY(100vh) rotate(360deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function animateScoreIncrease(element) {
  element.classList.add('animate-score');
  setTimeout(() => {
    element.classList.remove('animate-score');
  }, 600);
}

// Level System Functions
function calculateLevel(score) {
  return Math.min(Math.floor(score / 200), 4);
}

function calculateExperience(score) {
  const currentLevel = calculateLevel(score);
  const baseExp = currentLevel * 200;
  const currentExp = score - baseExp;
  const targetExp = currentLevel >= 4 ? 200 : 200;
  return { current: currentExp, target: targetExp };
}

function updateLevelDisplay() {
  const level = calculateLevel(state.score);
  const experience = calculateExperience(state.score);
  
  // Update level number
  ui.currentLevel.textContent = level;
  
  // Update level image with fallback
  const imageExtensions = ['png', 'jpg', 'jpeg'];
  let imageLoaded = false;
  
  for (const ext of imageExtensions) {
    const img = new Image();
    img.onload = function() {
      if (!imageLoaded) {
        ui.levelImage.src = `public/pic/level${level}.${ext}`;
        ui.levelImage.alt = `Level ${level}`;
        imageLoaded = true;
      }
    };
    img.src = `public/pic/level${level}.${ext}`;
  }
  
  // Update experience bar
  const expPercentage = level >= 4 ? 100 : (experience.current / experience.target) * 100;
  ui.experienceFill.style.width = `${expPercentage}%`;
  ui.experienceCurrent.textContent = level >= 4 ? 'MAX' : experience.current;
  ui.experienceTarget.textContent = level >= 4 ? 'MAX' : experience.target;
}

function checkLevelUp(oldScore, newScore) {
  const oldLevel = calculateLevel(oldScore);
  const newLevel = calculateLevel(newScore);
  
  if (newLevel > oldLevel) {
    triggerLevelUpCelebration(newLevel);
    return true;
  }
  return false;
}

function triggerLevelUpCelebration(newLevel) {
  // Level up visual effects
  ui.levelImage.classList.add('level-up');
  document.querySelector('.level-info').classList.add('level-up-celebration');
  
  // Special confetti for level up
  triggerCelebration();
  
  // Show level up message
  const levelUpMessages = [
    `🎉 升級了！現在是 ${newLevel} 級！`,
    `⭐ 太棒了！達到 ${newLevel} 級！`,
    `🏆 恭喜升級到 ${newLevel} 級！`,
    `🎊 厲害！你已經是 ${newLevel} 級了！`
  ];
  
  const message = levelUpMessages[Math.floor(Math.random() * levelUpMessages.length)];
  ui.feedback.textContent = message;
  ui.feedback.className = 'feedback success';
  
  // Play success sound
  playSuccessSound();
  
  // Remove animations after delay
  setTimeout(() => {
    ui.levelImage.classList.remove('level-up');
    document.querySelector('.level-info').classList.remove('level-up-celebration');
  }, 1500);
}

const state = {
  vocabulary: [],
  rawVocabText: '',
  progressMap: new Map(),
  currentItem: null,
  maskedIndices: [],
  choiceButtons: [],
  questionLocked: false,
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
    refreshVocabModalIfOpen();
    return;
  }

  state.vocabulary = parsed;
  state.rawVocabText = sourceText;
  refreshVocabModalIfOpen();
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
  const missingLetters = indices.map(index => item.word[index]).join('');

  state.currentItem = {
    item,
    progress,
    maskedWord,
    missingIndices: indices,
    missingLetters,
  };
  state.maskedIndices = indices;
  state.questionLocked = false;

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

  if (available.length === 0) {
    return [];
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
  if (current.missingLetters.length === 0) {
    ui.maskedWord.textContent = spacedWord(current.item.word);
    ui.feedback.textContent = '這個單字沒有可填入的空格，已直接顯示答案。';
    ui.feedback.className = 'feedback';
    ui.nextBtn.disabled = false;
    state.questionLocked = true;
    ui.choiceContainer.innerHTML = '';
    state.choiceButtons = [];
    return;
  }

  ui.maskedWord.textContent = current.maskedWord;
  ui.feedback.textContent = '';
  ui.feedback.className = 'feedback';
  ui.nextBtn.disabled = true;
  renderChoices();
}

function updateScoreboard() {
  ui.score.textContent = state.score;
  ui.streak.textContent = state.streak;
  ui.wordsPlayed.textContent = state.totalCorrect;
  updateLevelDisplay();
}

function handleCorrect() {
  const { item, progress } = state.currentItem;
  const reward = 10 + state.maskedIndices.length * 2;
  const oldScore = state.score;

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

  // Check for level up
  const leveledUp = checkLevelUp(oldScore, state.score);
  
  if (!leveledUp) {
    // Normal celebration effects (level up celebration is handled in triggerLevelUpCelebration)
    const celebration = celebrations[Math.floor(Math.random() * celebrations.length)];
    ui.feedback.textContent = `${celebration} +${reward} 分`;
    ui.feedback.className = 'feedback success';
    
    // Trigger fun effects
    playSuccessSound();
    if (state.streak >= 3) {
      triggerCelebration();
    }
  }
  
  ui.nextBtn.disabled = false;
  ui.maskedWord.textContent = spacedWord(item.word);
  setChoiceButtonsDisabled(true);
  highlightCorrectChoice();

  animateScoreIncrease(ui.score.parentElement);
  if (state.streak > 1) {
    animateScoreIncrease(ui.streak.parentElement);
  }

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

  // Fun encouragement messages
  const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
  ui.feedback.textContent = encouragement;
  ui.feedback.className = 'feedback error';
  
  // Play gentle error sound
  playErrorSound();
  
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
  ui.nextBtn.disabled = false;
  setChoiceButtonsDisabled(true);
  highlightCorrectChoice();
  state.questionLocked = true;
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
    refreshVocabModalIfOpen();

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

function renderVocabList() {
  if (!ui.vocabList) return;

  const sorted = [...state.vocabulary].sort((a, b) =>
    a.word.localeCompare(b.word, 'zh-Hant', { sensitivity: 'base' })
  );

  ui.vocabList.innerHTML = '';

  if (sorted.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'vocab-modal__empty';
    empty.textContent = '目前沒有單字可以顯示，請先載入題庫。';
    ui.vocabList.appendChild(empty);
    if (ui.vocabCount) {
      ui.vocabCount.textContent = '0';
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  sorted.forEach(({ word, meaning }) => {
    const entry = document.createElement('div');
    entry.className = 'vocab-entry';
    entry.setAttribute('role', 'listitem');

    const wordSpan = document.createElement('span');
    wordSpan.className = 'vocab-entry__word';
    wordSpan.textContent = word;

    const meaningSpan = document.createElement('span');
    meaningSpan.className = 'vocab-entry__meaning';
    meaningSpan.textContent = meaning;

    entry.append(wordSpan, meaningSpan);
    fragment.appendChild(entry);
  });

  ui.vocabList.appendChild(fragment);
  if (ui.vocabCount) {
    ui.vocabCount.textContent = String(sorted.length);
  }
}

function openVocabModal() {
  if (!state.vocabulary.length) {
    ui.feedback.textContent = '目前沒有可顯示的單字，請先載入題庫。';
    ui.feedback.className = 'feedback';
    return;
  }

  renderVocabList();
  if (ui.vocabModal) {
    ui.vocabModal.classList.add('show');
    ui.vocabModal.setAttribute('aria-hidden', 'false');
  }
  if (ui.showVocabBtn) {
    ui.showVocabBtn.setAttribute('aria-expanded', 'true');
  }
  ui.closeVocabBtn?.focus();
}

function closeVocabModal() {
  if (ui.vocabModal) {
    ui.vocabModal.classList.remove('show');
    ui.vocabModal.setAttribute('aria-hidden', 'true');
  }
  if (ui.showVocabBtn) {
    ui.showVocabBtn.setAttribute('aria-expanded', 'false');
    ui.showVocabBtn.focus();
  }
}

function refreshVocabModalIfOpen() {
  if (ui.vocabModal?.classList.contains('show')) {
    renderVocabList();
  }
}

function handleModalKeydown(event) {
  if (event.key !== 'Escape' && event.key !== 'Esc') return;
  if (ui.vocabModal?.classList.contains('show')) {
    closeVocabModal();
  }
}

function renderChoices() {
  if (!state.currentItem) return;

  const correct = state.currentItem.missingLetters.toLowerCase();
  if (correct.length === 0) {
    ui.choiceContainer.innerHTML = '';
    state.choiceButtons = [];
    return;
  }
  const options = generateChoiceOptions(correct);
  ui.choiceContainer.innerHTML = '';
  state.choiceButtons = [];

  options.forEach(option => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice-button';
    button.textContent = option.toUpperCase();
    button.dataset.value = option;
    button.addEventListener('click', () => handleChoiceSelection(option, button));
    ui.choiceContainer.appendChild(button);
    state.choiceButtons.push(button);
  });
}

function generateChoiceOptions(correct) {
  if (!correct || correct.length === 0) {
    return [];
  }
  const choices = new Set([correct]);
  const length = correct.length;

  while (choices.size < 4) {
    let candidate = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * ALPHABET.length);
      candidate += ALPHABET[randomIndex];
    }
    if (candidate === correct) continue;
    choices.add(candidate);
  }

  return shuffleArray([...choices]);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function handleChoiceSelection(option, button) {
  if (!state.currentItem) return;
  if (state.questionLocked) return;

  const normalized = option.toLowerCase();
  const correct = state.currentItem.missingLetters.toLowerCase();

  if (normalized === correct) {
    state.questionLocked = true;
    button.classList.add('choice-button--correct');
    handleCorrect();
  } else {
    button.disabled = true;
    button.classList.add('choice-button--incorrect');
    handleIncorrect();
  }
}

function setChoiceButtonsDisabled(disabled) {
  state.choiceButtons.forEach(button => {
    button.disabled = disabled;
  });
}

function highlightCorrectChoice() {
  const correct = state.currentItem?.missingLetters.toLowerCase();
  if (!correct) return;

  state.choiceButtons.forEach(button => {
    if (button.dataset.value === correct) {
      button.classList.add('choice-button--correct');
    }
  });
}

function attachEvents() {
  ui.nextBtn.addEventListener('click', handleNextQuestion);
  ui.revealBtn.addEventListener('click', handleReveal);
  ui.resetBtn.addEventListener('click', handleResetProgress);
  ui.fileInput.addEventListener('change', handleFileUpload);
  ui.downloadBtn.addEventListener('click', handleDownloadVocab);
  ui.showVocabBtn?.addEventListener('click', openVocabModal);
  ui.closeVocabBtn?.addEventListener('click', closeVocabModal);
  ui.vocabModal?.addEventListener('click', event => {
    if (event.target === ui.vocabModal) {
      closeVocabModal();
    }
  });
  document.addEventListener('keydown', handleModalKeydown);
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
