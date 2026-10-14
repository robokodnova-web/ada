'use strict';

// Tasarım 1920 × 1080. Hazır videoları aşağıdaki yollara ekleyin.
const INTRO_VIDEO = 'videos/secim.mp4';
const ISLANDS = {
  butterfly: { name: 'Kelebekler Adası', image: 'images/kelebekler.png', video: 'videos/kelebekler.mp4', smallVideo: 'videos/kelebekmini.mp4' },
  flower: { name: 'Çiçek Adası', image: 'images/cicekvadisi.png', video: 'videos/cicekvadi.mp4', smallVideo: 'videos/cicekmini.mp4' },
};
const $ = (id) => document.getElementById(id);
let selectedIsland = null;
let watchVersion = 0;
let saveTimer;
let appStarted = false;
let selectionReady = false;
let transitioning = false;
let writerOpening = false;
const drafts = new Map();

function showScreen(name) {
  $('intro-video').pause();
  $('island-video').pause();
  $('writing-video').pause();
  ['welcome', 'watch', 'write'].forEach((screen) => {
    $(screen + '-screen').hidden = screen !== name;
  });
}

async function playVideo(video) {
  video.muted = false;
  try {
    await video.play();
  } catch {
    // Tarayıcı sesli otomatik oynatmayı engellerse ilk dokunuş sesi açar.
    video.muted = true;
    try { await video.play(); } catch { /* İlk dokunuşta tekrar denenir. */ }
  }
}

function setSelectionReady(ready) {
  selectionReady = ready;
  $('selection-hint').hidden = !ready;
  document.querySelectorAll('[data-island]').forEach((button) => { button.disabled = !ready; });
}

function revealSelection() {
  $('start-overlay').hidden = true;
  setSelectionReady(true);
}

function prepareIntro() {
  const video = $('intro-video');
  video.onloadeddata = () => {
    if (appStarted && !$('welcome-screen').hidden) video.hidden = false;
  };
  video.onplaying = () => {
    if ($('welcome-screen').hidden) return;
    video.hidden = false;
    $('start-overlay').hidden = true;
    setSelectionReady(false);
  };
  video.onended = () => {
    if (!$('welcome-screen').hidden) revealSelection();
  };
  video.onerror = () => {
    video.hidden = true;
    if (appStarted) revealSelection();
  };
  video.src = INTRO_VIDEO;
  video.load();
}

async function startApp() {
  appStarted = true;
  const video = $('intro-video');
  $('start-button').disabled = true;
  if (video.error) { revealSelection(); return; }
  video.muted = false;
  try {
    // Doğrudan düğme tıklamasından oynatarak ses iznini alır.
    await video.play();
  } catch {
    if (video.error) { revealSelection(); return; }
    $('start-button').disabled = false;
  }
}

function showChoices() {
  watchVersion++;
  showScreen('welcome');
  const video = $('intro-video');
  appStarted = false;
  selectedIsland = null;
  setSelectionReady(false);
  video.hidden = true;
  video.currentTime = 0;
  $('start-overlay').hidden = false;
  $('start-button').disabled = false;
}

function openIsland(key, deferPlayback = false) {
  selectedIsland = key;
  const island = ISLANDS[key];
  const version = ++watchVersion;
  showScreen('watch');
  $('watch-screen').setAttribute('aria-label', island.name);
  $('island-preview').src = island.image;
  $('island-preview').alt = island.name;
  $('island-preview').hidden = false;
  $('write-button').hidden = true;
  const video = $('island-video');
  $('watch-screen').insertBefore(video, $('change-island'));
  video.loop = false;
  video.playbackRate = 1;
  video.hidden = true;
  video.controls = false;
  video.onloadeddata = () => {
    if (version !== watchVersion || $('watch-screen').hidden) return;
    video.hidden = false;
    $('island-preview').hidden = true;
    if (!deferPlayback) playVideo(video);
  };
  video.onerror = () => {
    if (version !== watchVersion) return;
    video.hidden = true;
    $('island-preview').hidden = false;
    $('write-button').hidden = false;
  };
  video.onended = () => {
    if (version === watchVersion && !$('watch-screen').hidden) openWriter();
  };
  video.src = island.video;
  video.load();
}

function waitForIslandVideo() {
  const video = $('island-video');
  if (video.readyState >= 2 || video.error) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      video.removeEventListener('loadeddata', finish);
      video.removeEventListener('error', finish);
      resolve();
    };
    const timer = setTimeout(finish, 6000);
    video.addEventListener('loadeddata', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
  });
}

async function travelToIsland(key) {
  if (transitioning) return;
  transitioning = true;
  const previousScreen = document.querySelector('.screen:not([hidden])');
  const stage = document.querySelector('.stage');
  let version;
  stage.classList.add('switching');
  try {
    openIsland(key, true);
    version = watchVersion;
    // Video hazırlanırken mevcut kare ekranda kalır.
    previousScreen.hidden = false;
    previousScreen.style.zIndex = '5';
    await waitForIslandVideo();
    if (version !== watchVersion) return;
    // Videoların birleşim kareleri aynı: ekstra kararma veya efekt kullanma.
    if (!$('island-video').hidden) await playVideo($('island-video'));
  } finally {
    if (version === watchVersion) previousScreen.hidden = true;
    previousScreen.style.removeProperty('z-index');
    stage.classList.remove('switching');
    transitioning = false;
  }
}

function readDraft(key) {
  if (drafts.has(key)) return drafts.get(key);
  try {
    const draft = JSON.parse(localStorage.getItem('oyun-adasi-story-' + key) || '{}');
    return { title: typeof draft.title === 'string' ? draft.title : '', text: typeof draft.text === 'string' ? draft.text : '' };
  } catch { return { title: '', text: '' }; }
}

function saveDraft() {
  clearTimeout(saveTimer);
  if (!selectedIsland) return;
  const draft = { title: $('story-title').value, text: $('story-text').value };
  drafts.set(selectedIsland, draft);
  try {
    localStorage.setItem('oyun-adasi-story-' + selectedIsland, JSON.stringify(draft));
    $('save-status').textContent = 'Hikâyen saklandı.';
  } catch {
    $('save-status').textContent = 'Tarayıcı kaydına erişilemiyor. Hikâyeni indirme düğmesiyle kaydedebilirsin.';
  }
}

async function openWriter() {
  if (!$('write-screen').hidden || writerOpening) return;
  writerOpening = true;
  const video = $('island-video');
  const hasVideo = !video.hidden && video.readyState >= 2 && !video.error;
  const version = watchVersion;
  const stage = document.querySelector('.stage');
  const veil = $('mini-transition');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const miniReady = prepareMiniVideo(selectedIsland);
  veil.hidden = false;
  stage.classList.add('switching');
  try {
    // Önce tamamen karar; kaynak ve sayfa değişimi siyah örtünün altında yapılır.
    await veil.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: reducedMotion ? 0 : 450, easing: 'ease-in-out', fill: 'forwards',
    }).finished;
    const hasMiniVideo = await miniReady;
    if (version !== watchVersion) return;
    const draft = readDraft(selectedIsland);
    $('story-title').value = draft.title || 'Adanın Sırrı';
    $('story-text').value = draft.text;
    $('write-screen').setAttribute('aria-label', ISLANDS[selectedIsland].name + ' hikâyeni yaz');
    showScreen('write');
    $('action-status').textContent = '';
    const image = $('writing-preview-image');
    image.src = ISLANDS[selectedIsland].image;
    image.alt = ISLANDS[selectedIsland].name;
    image.hidden = false;
    const mini = $('writing-video');
    mini.hidden = true;
    let miniPlaying = false;
    if (hasMiniVideo) {
      mini.muted = true;
      mini.loop = true;
      mini.currentTime = 0;
      try {
        await mini.play();
        mini.hidden = false;
        video.hidden = true;
        image.hidden = true;
        miniPlaying = true;
      } catch { mini.hidden = true; }
    }
    if (!miniPlaying && hasVideo) {
      $('writing-preview').appendChild(video);
      video.hidden = false;
      video.loop = true;
      video.muted = true;
      video.playbackRate = .75;
      video.currentTime = 0;
      video.play().catch(() => {});
      image.hidden = true;
    }
    await veil.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: reducedMotion ? 0 : 650, easing: 'ease-in-out', fill: 'forwards',
    }).finished;
    if (version === watchVersion && !$('write-screen').hidden) $('story-text').focus({ preventScroll: true });
  } finally {
    veil.hidden = true;
    veil.getAnimations().forEach((animation) => animation.cancel());
    stage.classList.remove('switching');
    writerOpening = false;
  }
}

function prepareMiniVideo(key) {
  const mini = $('writing-video');
  mini.defaultPlaybackRate = .75;
  mini.playbackRate = .75;
  return new Promise((resolve) => {
    const finish = (ready) => {
      clearTimeout(timer);
      mini.onloadeddata = null;
      mini.onerror = null;
      resolve(ready);
    };
    const timer = setTimeout(() => finish(false), 6000);
    mini.onloadeddata = () => finish(true);
    mini.onerror = () => finish(false);
    mini.src = ISLANDS[key].smallVideo;
    mini.load();
  });
}

document.querySelectorAll('[data-island]').forEach((button) => {
  button.addEventListener('click', () => {
    if (selectionReady) travelToIsland(button.dataset.island);
  });
});
$('start-button').addEventListener('click', startApp);
$('welcome-screen').addEventListener('pointerdown', (event) => {
  if (event.target.closest('[data-island]')) return;
  const video = $('intro-video');
  if (!video.hidden && !video.ended) { video.muted = false; video.play().catch(() => {}); }
});
$('island-video').addEventListener('pointerdown', () => {
  const video = $('island-video');
  if ($('write-screen').hidden) video.muted = false;
  video.play().catch(() => {});
});
$('change-island').addEventListener('click', showChoices);
$('write-button').addEventListener('click', openWriter);
$('back-to-video').addEventListener('click', () => { saveDraft(); showChoices(); });
['story-title', 'story-text'].forEach((id) => {
  $(id).addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 350);
  });
});
function wrapImageText(context, value, width) {
  const lines = [];
  for (const paragraph of value.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/u).filter(Boolean)) {
      if (line && context.measureText(line + ' ' + word).width > width) {
        lines.push(line);
        line = '';
      }
      if (context.measureText(word).width > width) {
        if (line) { lines.push(line); line = ''; }
        for (const character of word) {
          if (line && context.measureText(line + character).width > width) { lines.push(line); line = ''; }
          line += character;
        }
      } else line += (line ? ' ' : '') + word;
    }
    lines.push(line);
  }
  return lines;
}

async function makeStoryJpeg(title, text) {
  await document.fonts.ready;
  const image = $('writing-background');
  await image.decode();
  const paperRect = $('writing-paper').getBoundingClientRect();
  const imageRect = image.getBoundingClientRect();
  const titleRect = $('story-title').getBoundingClientRect();
  const textRect = $('story-text').getBoundingClientRect();
  const scale = 1920 / document.querySelector('.stage').getBoundingClientRect().width;
  const width = Math.round(paperRect.width * scale);
  const baseHeight = Math.round(paperRect.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  const context = canvas.getContext('2d');
  const titleStyle = getComputedStyle($('story-title'));
  const textStyle = getComputedStyle($('story-text'));
  const titleSize = parseFloat(titleStyle.fontSize) * scale;
  const textSize = parseFloat(textStyle.fontSize) * scale;
  const lineHeight = parseFloat(textStyle.lineHeight) * scale;
  const titleY = (titleRect.top - paperRect.top + parseFloat(titleStyle.paddingTop)) * scale;
  const textX = (textRect.left - paperRect.left) * scale;
  const textWidth = textRect.width * scale;
  context.font = `${titleSize}px ${titleStyle.fontFamily}`;
  const titleLines = wrapImageText(context, title, titleRect.width * scale);
  const textY = Math.max((textRect.top - paperRect.top) * scale, titleY + titleLines.length * titleSize * 1.3 + 26);
  context.font = `${textSize}px ${textStyle.fontFamily}`;
  const lines = wrapImageText(context, text, textWidth);
  canvas.height = Math.ceil(Math.max(baseHeight, textY + lines.length * lineHeight + baseHeight * .19));

  // Parşömenin üst/alt rulolarını koruyup uzun hikâyeler için orta kısmı uzat.
  const background = document.createElement('canvas');
  background.width = width;
  background.height = baseHeight;
  const bg = background.getContext('2d');
  bg.fillStyle = '#fff';
  bg.fillRect(0, 0, width, baseHeight);
  bg.drawImage(image, (imageRect.left - paperRect.left) * scale, (imageRect.top - paperRect.top) * scale, imageRect.width * scale, imageRect.height * scale);
  const cap = Math.round(baseHeight * .18);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, canvas.height);
  context.drawImage(background, 0, 0, width, cap, 0, 0, width, cap);
  context.drawImage(background, 0, cap, width, baseHeight - cap * 2, 0, cap, width, canvas.height - cap * 2);
  context.drawImage(background, 0, baseHeight - cap, width, cap, 0, canvas.height - cap, width, cap);
  context.fillStyle = '#654225';
  context.textBaseline = 'top';
  context.textAlign = 'center';
  for (const heading of document.querySelectorAll('.paper-heading h1, .paper-heading p')) {
    const rect = heading.getBoundingClientRect();
    const style = getComputedStyle(heading);
    context.font = `${parseFloat(style.fontSize) * scale}px ${style.fontFamily}`;
    context.fillText(heading.textContent, (rect.left + rect.width / 2 - paperRect.left) * scale, (rect.top - paperRect.top) * scale);
  }
  context.font = `${titleSize}px ${titleStyle.fontFamily}`;
  titleLines.forEach((line, index) => context.fillText(line, width / 2, titleY + index * titleSize * 1.3));
  context.strokeStyle = '#80522140';
  context.beginPath();
  context.moveTo(textX, textY - 18);
  context.lineTo(textX + textWidth, textY - 18);
  context.stroke();
  context.textAlign = 'left';
  context.font = `${textSize}px ${textStyle.fontFamily}`;
  lines.forEach((line, index) => context.fillText(line, textX, textY + index * lineHeight));
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('JPG oluşturulamadı')), 'image/jpeg', .95));
}

$('download-story').addEventListener('click', async () => {
  if (!$('story-text').value.trim()) { $('story-text').focus(); return; }
  saveDraft();
  const title = $('story-title').value.trim() || 'Benim Ada Hikâyem';
  $('download-story').disabled = true;
  $('action-status').textContent = 'JPG hazırlanıyor…';
  try {
    const blob = await makeStoryJpeg(title, $('story-text').value.trim());
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').slice(0, 80).trim() || 'Hikayem') + '.jpg';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('action-status').textContent = 'Hikâyen JPG olarak kaydedildi.';
  } catch {
    $('action-status').textContent = 'JPG oluşturulamadı. Hikâyen tarayıcıda saklandı; tekrar deneyebilirsin.';
  } finally { $('download-story').disabled = false; }
});
$('print-story-button').addEventListener('click', () => {
  if (!$('story-text').value.trim()) { $('story-text').focus(); return; }
  saveDraft();
  $('print-title').textContent = $('story-title').value.trim() || 'Benim Ada Hikâyem';
  $('print-island').textContent = ISLANDS[selectedIsland].name;
  $('print-text').textContent = $('story-text').value;
  window.print();
});
window.addEventListener('beforeprint', () => {
  $('writing-video').pause();
  if (!$('write-screen').hidden) $('island-video').pause();
});
window.addEventListener('afterprint', () => {
  if ($('write-screen').hidden) return;
  const video = $('writing-video').hidden ? $('island-video') : $('writing-video');
  if (!video.hidden) video.play().catch(() => {});
});
window.addEventListener('pagehide', () => { if (!$('write-screen').hidden) saveDraft(); });
document.querySelectorAll('[data-island]').forEach((button) => {
  const halo = document.createElement('span');
  halo.className = 'star-halo';
  halo.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 20; index++) {
    const angle = index / 20 * Math.PI * 2;
    const star = document.createElement('span');
    star.className = 'halo-star';
    star.textContent = index % 3 === 0 ? '✧' : '✦';
    star.style.left = (50 + Math.cos(angle) * 48) + '%';
    star.style.top = (50 + Math.sin(angle) * 44) + '%';
    star.style.setProperty('--delay', (-index * .19) + 's');
    star.style.setProperty('--drift-x', (Math.cos(angle) * .45) + 'cqw');
    star.style.setProperty('--drift-y', (Math.sin(angle) * .3) + 'cqw');
    star.style.setProperty('--size', (index % 3 === 0 ? .88 : .62) + 'cqw');
    halo.appendChild(star);
  }
  button.appendChild(halo);
});
prepareIntro();
