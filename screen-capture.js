'use strict';

async function exportVideoFrame(video, width, height, background, fit) {
  const copy = document.createElement('video');
  copy.crossOrigin = 'anonymous';
  copy.muted = true;
  copy.preload = 'auto';
  const time = video.currentTime;
  const waitFor = (event) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Video karesi yüklenemedi.')), 10000);
    const ready = () => finish();
    const failed = () => finish(new Error('Video karesi için güvenli erişim sağlanamadı. Projeyi Live Server üzerinden açın.'));
    function finish(error) {
      clearTimeout(timer);
      copy.removeEventListener(event, ready);
      copy.removeEventListener('error', failed);
      error ? reject(error) : resolve();
    }
    copy.addEventListener(event, ready, { once: true });
    copy.addEventListener('error', failed, { once: true });
  });
  try {
    const loaded = waitFor('loadeddata');
    copy.src = video.currentSrc || video.src;
    copy.load();
    await loaded;
    if (time > 0) {
      const sought = waitFor('seeked');
      copy.currentTime = Math.min(time, Math.max(0, copy.duration - .01));
      await sought;
    }
    const frame = document.createElement('canvas');
    frame.width = width;
    frame.height = height;
    const context = frame.getContext('2d');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    const ratio = fit === 'contain' ? Math.min(width / copy.videoWidth, height / copy.videoHeight)
      : fit === 'cover' ? Math.max(width / copy.videoWidth, height / copy.videoHeight) : null;
    const drawWidth = ratio === null ? width : copy.videoWidth * ratio;
    const drawHeight = ratio === null ? height : copy.videoHeight * ratio;
    context.drawImage(copy, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    return frame.toDataURL('image/png');
  } finally {
    copy.removeAttribute('src');
    copy.load();
  }
}

// Kaydet ve Yazdır aynı 1920 × 1080 sahne görüntüsünü kullanır.
async function captureStoryScreen() {
  if (location.protocol === 'file:') {
    throw new Error('PNG kaydı için projeyi Live Server ile açın. index.html dosyasını doğrudan açmak, tarayıcının görselleri dışa aktarmasını engelliyor.');
  }
  if (typeof html2canvas !== 'function') {
    throw new Error('Görüntü oluşturucu yüklenemedi. İnternet bağlantısını kontrol edip sayfayı yenileyin.');
  }
  await document.fonts.ready;
  const stage = document.querySelector('.stage');
  const bounds = stage.getBoundingClientRect();
  const frames = new Map();
  for (const video of stage.querySelectorAll('video')) {
    if (video.hidden || video.closest('[hidden]') || video.readyState < 2) continue;
    const frame = document.createElement('canvas');
    const videoBounds = video.getBoundingClientRect();
    frame.width = Math.round(videoBounds.width * 1920 / bounds.width);
    frame.height = Math.round(videoBounds.height * 1920 / bounds.width);
    const context = frame.getContext('2d');
    const style = getComputedStyle(video);
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, frame.width, frame.height);
    const ratio = style.objectFit === 'contain'
      ? Math.min(frame.width / video.videoWidth, frame.height / video.videoHeight)
      : style.objectFit === 'cover'
        ? Math.max(frame.width / video.videoWidth, frame.height / video.videoHeight)
        : null;
    const width = ratio === null ? frame.width : video.videoWidth * ratio;
    const height = ratio === null ? frame.height : video.videoHeight * ratio;
    context.drawImage(video, (frame.width - width) / 2, (frame.height - height) / 2, width, height);
    let src;
    try {
      src = frame.toDataURL('image/png');
    } catch (error) {
      if (error.name !== 'SecurityError') throw error;
      src = await exportVideoFrame(video, frame.width, frame.height, style.backgroundColor, style.objectFit);
    }
    frames.set(video.id, {
      src,
      className: video.className,
      cssText: video.style.cssText,
      parentId: video.parentElement.id,
      childIndex: Array.from(video.parentElement.children).indexOf(video),
    });
  }
  const screenshot = await html2canvas(stage, {
    backgroundColor: '#000000',
    useCORS: true,
    allowTaint: false,
    scale: 1920 / bounds.width,
    logging: false,
    onclone: (copy) => {
      frames.forEach((frame, id) => {
        // html2canvas videoyu kimliği olmayan bir canvas öğesine dönüştürür.
        const parent = copy.getElementById(frame.parentId);
        const video = copy.getElementById(id) || parent?.children[frame.childIndex];
        if (!video || !['VIDEO', 'CANVAS'].includes(video.tagName)) {
          throw new Error('Video karesi ekran görüntüsüne yerleştirilemedi. Sayfayı yenileyip tekrar deneyin.');
        }
        const image = copy.createElement('img');
        image.id = id;
        image.className = frame.className;
        image.style.cssText = frame.cssText;
        image.src = frame.src;
        image.alt = '';
        video.replaceWith(image);
      });
      copy.querySelectorAll('#action-status, #save-status').forEach((status) => {
        status.textContent = '';
      });
    },
  });
  // Yuvarlama kaynaklı tek piksellik farkları kaldır.
  const output = document.createElement('canvas');
  output.width = 1920;
  output.height = 1080;
  output.getContext('2d').drawImage(screenshot, 0, 0, 1920, 1080);
  return output;
}

let capturingStoryScreen = false;
async function useStoryScreenshot(mode) {
  if (capturingStoryScreen) return;
  capturingStoryScreen = true;
  const status = document.getElementById('action-status');
  try {
    saveDraft();
    const canvas = await captureStoryScreen();
    if (mode === 'save') {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG görüntüsü oluşturulamadı.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const title = document.getElementById('story-title').value.trim() || 'Adanın Sırrı';
      link.download = (title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').slice(0, 80).trim() || 'Hikâyem') + '.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'Ekranın tamamı PNG olarak kaydedildi.';
    } else {
      let preview = document.getElementById('print-screen-capture');
      if (!preview) {
        preview = document.createElement('img');
        preview.id = 'print-screen-capture';
        preview.alt = 'Hikâye ekranının tamamı';
        document.body.appendChild(preview);
      }
      preview.src = canvas.toDataURL('image/png');
      await preview.decode();
      document.body.classList.add('printing-screen-capture');
      window.print();
    }
  } catch (error) {
    status.textContent = error.message || 'Ekran görüntüsü oluşturulamadı. Lütfen tekrar deneyin.';
  } finally {
    capturingStoryScreen = false;
  }
}

// Eski parşömen JPG/metin çıktısı yerine tam sahne çıktısını çalıştır.
document.getElementById('download-story').addEventListener('click', (event) => {
  event.stopImmediatePropagation();
  useStoryScreenshot('save');
}, true);
document.getElementById('print-story-button').addEventListener('click', (event) => {
  event.stopImmediatePropagation();
  useStoryScreenshot('print');
}, true);
window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing-screen-capture');
});
