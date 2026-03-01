const MOMENT_TYPES = [
  { id: 'wake_up', label: 'Wake up', icon: '🌅' },
  { id: 'eat', label: 'Eating', icon: '🍽️' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'movie', label: 'Movie', icon: '🎬' },
  { id: 'thought', label: 'Thought', icon: '💭' },
  { id: 'sleep', label: 'Sleep', icon: '😴' },
  { id: 'exercise', label: 'Exercise', icon: '🏃' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'photo', label: 'Photo', icon: '📷' },
  { id: 'book', label: 'Book', icon: '📖' },
];

// Selected moment type (survives form reset; used on submit)
let selectedMomentType = '';
// Photo moment: data URL when user takes/selects a photo
let momentPhotoDataUrl = '';
// Current user profile (avatar_url, cover_url, name, bio)
let currentUser = null;

function $(sel, el = document) { return el.querySelector(sel); }
function $$(sel, el = document) { return Array.from(el.querySelectorAll(sel)); }

function setOverlayOpen(open) {
  document.body.classList.toggle('body-overlay-open', !!open);
}

function showScreen(id) {
  const root = document.getElementById('root');
  if (root) root.dataset.screen = id;
  const addOverlay = $('#add-moment-overlay');
  const profileOverlay = $('#profile-overlay');
  const famsOverlay = $('#fams-overlay');
  const feedbackOverlay = $('#feedback-overlay');
  if (addOverlay) addOverlay.hidden = true;
  if (profileOverlay) profileOverlay.hidden = true;
  if (famsOverlay) famsOverlay.hidden = true;
  if (feedbackOverlay) feedbackOverlay.hidden = true;
  setOverlayOpen(false);
}

function showError(msg) {
  const existing = $('.error-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'error-toast';
  t.setAttribute('role', 'alert');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });
  let data = {};
  try {
    const text = await res.text();
    if (text) data = JSON.parse(text);
  } catch (_) {}
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

async function checkAuth() {
  try {
    const { user } = await api('/auth/me');
    return user;
  } catch {
    return null;
  }
}

function renderTimeline(moments) {
  const list = $('#timeline-list');
  const loading = $('#timeline-loading');
  const empty = $('#timeline-empty');
  loading.hidden = true;
  list.innerHTML = '';
  if (!moments.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  const typeMap = Object.fromEntries(MOMENT_TYPES.map(t => [t.id, t]));
  moments.forEach(m => {
    const type = typeMap[m.type] || { icon: '•', label: m.type };
    const time = new Date(m.created_at);
    const timeStr = time.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const initial = (m.user_name || '?').charAt(0).toUpperCase();
    const typeClass = (m.type && typeMap[m.type]) ? m.type : 'default';
    const avatarHtml = m.user_avatar
      ? `<img class="moment-avatar-img" src="${escapeHtml(m.user_avatar)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><span class="moment-avatar-initial" style="display:none">${escapeHtml(initial)}</span>`
      : `<span class="moment-avatar-initial">${escapeHtml(initial)}</span>`;
    const bodyHtml = m.body ? `<div class="moment-body">${escapeHtml(m.body)}</div>` : '';
    const imageHtml = m.image_url ? `<div class="moment-image-wrap" role="button" tabindex="0" title="Tap to view or download"><img class="moment-image" src="${escapeHtml(m.image_url)}" alt="" loading="lazy" onerror="this.onerror=null;this.style.background='var(--bg-input)';this.style.minHeight='80px';this.alt='Image unavailable (check bucket is public)';" /></div>` : '';
    const commentCount = (m.comments || []).length;
    const commentsList = (m.comments || []).map(c => {
      const cTime = new Date(c.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      return `<div class="moment-comment"><span class="moment-comment-name">${escapeHtml(c.user_name || 'Someone')}</span> ${escapeHtml(c.body)}<span class="moment-comment-time">${cTime}</span></div>`;
    }).join('');
    const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    const reactionSummary = (m.reactions && Object.keys(m.reactions).length) ? Object.entries(m.reactions).map(([emoji, count]) => count ? `${emoji} ${count}` : '').filter(Boolean).join('  ') : '';
    const myReactionEmoji = m.my_reaction || '';
    const reactIconHtml = myReactionEmoji ? myReactionEmoji : '<span class="moment-react-icon" aria-hidden="true">🙂</span>';
    const commentsHtml = `
      <div class="moment-actions">
        <div class="moment-reactions-wrap">
          <button type="button" class="moment-react-btn" data-moment-id="${m.id}" title="React">${reactIconHtml}<span class="moment-react-summary">${escapeHtml(reactionSummary)}</span></button>
          <div class="moment-reaction-picker" data-moment-id="${m.id}" hidden>
            ${REACTION_EMOJIS.map(emoji => `<button type="button" class="moment-picker-emoji" data-moment-id="${m.id}" data-emoji="${escapeHtml(emoji)}">${emoji}</button>`).join('')}
          </div>
        </div>
        <button type="button" class="moment-comment-btn" data-moment-id="${m.id}" title="Comments">
          <span class="moment-comment-icon">💬</span><span class="moment-comment-count">${commentCount ? commentCount : ''}</span>
        </button>
      </div>
      <div class="moment-comments moment-comments-collapsed" data-moment-id="${m.id}" hidden>
        ${commentsList ? `<div class="moment-comments-list">${commentsList}</div>` : ''}
        <form class="moment-comment-form" data-moment-id="${m.id}">
          <input type="text" placeholder="Write a comment..." class="moment-comment-input" maxlength="500" />
          <button type="submit" class="moment-comment-submit">Comment</button>
        </form>
      </div>`;
    const row = document.createElement('article');
    row.className = 'moment-row';
    row.innerHTML = `
      <div class="moment-node" aria-hidden="true"></div>
      <div class="moment-avatar">${avatarHtml}</div>
      <div class="moment-type-badge ${escapeHtml(typeClass)}" title="${escapeHtml(type.label)}">${type.icon}</div>
      <div class="moment-content">
        <div class="moment-meta">
          <span class="moment-name">${escapeHtml(m.user_name || 'Someone')}</span>
          <span class="moment-time">${timeStr}</span>
        </div>
        ${imageHtml}
        ${bodyHtml}
        ${commentsHtml}
      </div>
    `;
    list.appendChild(row);
  });
  $$('.moment-comment-form').forEach(form => {
    form.addEventListener('submit', (e) => submitComment(e));
  });
  $$('.moment-comment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mid = btn.getAttribute('data-moment-id');
      const panel = list.querySelector(`.moment-comments[data-moment-id="${mid}"]`);
      if (panel) {
        panel.hidden = !panel.hidden;
      }
    });
  });
  $$('.moment-react-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mid = btn.getAttribute('data-moment-id');
      const picker = list.querySelector(`.moment-reaction-picker[data-moment-id="${mid}"]`);
      const wasOpen = picker && !picker.hidden;
      $$('.moment-reaction-picker').forEach(p => { p.hidden = true; });
      if (picker && !wasOpen) picker.hidden = false;
    });
  });
  $$('.moment-reaction-picker').forEach(picker => {
    picker.addEventListener('click', (e) => e.stopPropagation());
  });
  $$('.moment-picker-emoji').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const momentId = btn.getAttribute('data-moment-id');
      const emoji = btn.getAttribute('data-emoji');
      sendReaction(momentId, emoji, list);
      const picker = btn.closest('.moment-reaction-picker');
      if (picker) picker.hidden = true;
    });
  });
  $$('.moment-image-wrap').forEach(wrap => {
    wrap.addEventListener('click', (e) => {
      e.preventDefault();
      const img = wrap.querySelector('.moment-image');
      if (img && img.src) openImageLightbox(img.src);
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const img = wrap.querySelector('.moment-image');
        if (img && img.src) openImageLightbox(img.src);
      }
    });
  });
}

function submitComment(e) {
  e.preventDefault();
  const form = e.target;
  const momentId = form.getAttribute('data-moment-id');
  const input = form.querySelector('.moment-comment-input');
  const body = input && input.value.trim();
  if (!body) return;
  api('/api/moments/' + momentId + '/comments', {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
    .then(() => {
      input.value = '';
      loadTimeline();
    })
    .catch(err => showError(err.message || 'Failed to post comment'));
}

function sendReaction(momentId, emoji, list) {
  if (!momentId || !emoji) return;
  const momentIdNum = Number(String(momentId).replace(/[^0-9]/g, '')) || 0;
  if (!momentIdNum) return;
  api('/api/reactions', {
    method: 'POST',
    body: JSON.stringify({ moment_id: momentIdNum, emoji }),
  })
    .then(({ reactions: newCounts, my_reaction }) => {
      const btn = list.querySelector(`.moment-react-btn[data-moment-id="${momentId}"]`);
      if (!btn) { loadTimeline(); return; }
      const summary = (newCounts && Object.keys(newCounts).length) ? Object.entries(newCounts).map(([e, c]) => c ? `${e} ${c}` : '').filter(Boolean).join('  ') : '';
      const summarySpan = summary ? `<span class="moment-react-summary">${escapeHtml(summary)}</span>` : '<span class="moment-react-summary"></span>';
      const iconHtml = my_reaction ? my_reaction : '<span class="moment-react-icon" aria-hidden="true">🙂</span>';
      btn.innerHTML = iconHtml + summarySpan;
    })
    .catch(err => showError(err.message || 'Failed to react'));
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function loadProfile() {
  try {
    const { profile } = await api('/api/profile');
    currentUser = profile;
    updateProfileBanner();
    return profile;
  } catch (e) {
    // Fallback: use /auth/me so Edit profile still works (e.g. if /api/profile 404s)
    try {
      const { user } = await api('/auth/me');
      if (user) {
        currentUser = { ...user, cover_url: user.cover_url || null, bio: user.bio || null };
        updateProfileBanner();
        return currentUser;
      }
    } catch (_) {}
    return currentUser;
  }
}

async function openProfileEditor() {
  if (!currentUser) {
    const profile = await loadProfile();
    if (!profile) {
      showError('Could not load profile');
      return;
    }
  }
  const nameEl = $('#profile-name');
  const avatarUrlEl = $('#profile-avatar-url');
  const coverUrlEl = $('#profile-cover-url');
  const bioEl = $('#profile-bio');
  if (nameEl) nameEl.value = (currentUser && currentUser.name) || '';
  if (avatarUrlEl) avatarUrlEl.value = (currentUser && currentUser.avatar_url) || '';
  if (coverUrlEl) coverUrlEl.value = (currentUser && currentUser.cover_url) || '';
  if (bioEl) bioEl.value = (currentUser && currentUser.bio) || '';
  updateProfilePreviews();
  const overlay = $('#profile-overlay');
  const statusEl = $('#profile-upload-status');
  if (statusEl) statusEl.textContent = '';
  if (overlay) {
    overlay.hidden = false;
    setOverlayOpen(true);
  }
}

function safeCssUrl(url) {
  if (!url) return '';
  return 'url("' + String(url).replace(/\\/g, '\\\\').replace(/"/g, '\\22') + '")';
}

function updateProfilePreviews() {
  const coverUrl = ($('#profile-cover-url') && $('#profile-cover-url').value) || (currentUser && currentUser.cover_url);
  const avatarUrl = ($('#profile-avatar-url') && $('#profile-avatar-url').value) || (currentUser && currentUser.avatar_url);
  const coverPreview = $('#profile-cover-preview');
  const avatarPreview = $('#profile-avatar-preview');
  if (coverPreview) {
    coverPreview.style.backgroundImage = safeCssUrl(coverUrl) || 'none';
    const hint = coverPreview.querySelector('.drop-zone-hint');
    if (hint) hint.style.display = coverUrl ? 'none' : 'flex';
  }
  if (avatarPreview) {
    avatarPreview.style.backgroundImage = safeCssUrl(avatarUrl) || 'none';
    const hint = avatarPreview.querySelector('.drop-zone-hint');
    const initialEl = avatarPreview.querySelector('.profile-avatar-initial');
    if (hint) hint.style.display = avatarUrl ? 'none' : 'flex';
    if (initialEl) {
      initialEl.textContent = !avatarUrl && currentUser && currentUser.name ? currentUser.name.charAt(0).toUpperCase() : (!avatarUrl ? '?' : '');
      initialEl.style.display = !avatarUrl ? 'flex' : 'none';
    }
  }
}

async function uploadImageFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  let res;
  try {
    res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
  } catch (e) {
    throw new Error('Network error — check connection and try again.');
  }
  const text = await res.text();
  let data = {};
  try {
    if (text) data = JSON.parse(text);
  } catch (_) {}
  if (res.ok) return data.url || null;
  throw new Error(data.error || `Upload failed (${res.status})`);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Failed to read file'));
    r.readAsDataURL(file);
  });
}

const COMPRESS_MAX_SIZE = 1200;
const COMPRESS_QUALITY = 0.85;
const COMPRESS_MIN_BYTES = 300000;

function compressImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return Promise.resolve(file);
  if (file.size < COMPRESS_MIN_BYTES) return Promise.resolve(file);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) { resolve(file); return; }
      if (w <= COMPRESS_MAX_SIZE && h <= COMPRESS_MAX_SIZE) { resolve(file); return; }
      if (w > h) {
        h = Math.round((h * COMPRESS_MAX_SIZE) / w);
        w = COMPRESS_MAX_SIZE;
      } else {
        w = Math.round((w * COMPRESS_MAX_SIZE) / h);
        h = COMPRESS_MAX_SIZE;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const name = (file.name || 'photo').replace(/\.[^.]+$/i, '') + '.jpg';
          resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        COMPRESS_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/** Center-crop image for profile (square) or cover (wide). Returns a new File or the original on failure. */
function centerCropProfileImage(file, isCover) {
  if (!file || !file.type.startsWith('image/')) return Promise.resolve(file);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) { resolve(file); return; }
      let sw, sh, sx, sy;
      if (isCover) {
        const targetRatio = 3;
        const currentRatio = w / h;
        if (currentRatio > targetRatio) {
          sh = h;
          sw = h * targetRatio;
          sx = (w - sw) / 2;
          sy = 0;
        } else {
          sw = w;
          sh = w / targetRatio;
          sx = 0;
          sy = (h - sh) / 2;
        }
      } else {
        const size = Math.min(w, h);
        sw = sh = size;
        sx = (w - size) / 2;
        sy = (h - size) / 2;
      }
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const name = (file.name || 'photo').replace(/\.[^.]+$/i, '') + '.jpg';
          resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        COMPRESS_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

async function fileToImageUrl(file) {
  const toUpload = await compressImageFile(file);
  const url = await uploadImageFile(toUpload);
  if (url) return url;
  return readFileAsDataUrl(file);
}

function setProfilePreviewOnly(coverUrl, avatarUrl) {
  const coverPreview = $('#profile-cover-preview');
  const avatarPreview = $('#profile-avatar-preview');
  if (coverPreview) {
    coverPreview.style.backgroundImage = safeCssUrl(coverUrl) || 'none';
    const hint = coverPreview.querySelector('.drop-zone-hint');
    if (hint) hint.style.display = coverUrl ? 'none' : 'flex';
  }
  if (avatarPreview) {
    avatarPreview.style.backgroundImage = safeCssUrl(avatarUrl) || 'none';
    const hint = avatarPreview.querySelector('.drop-zone-hint');
    const initialEl = avatarPreview.querySelector('.profile-avatar-initial');
    if (hint) hint.style.display = avatarUrl ? 'none' : 'flex';
    if (initialEl) initialEl.style.display = avatarUrl ? 'none' : 'flex';
  }
}

function setupProfilePhotoFromAlbum() {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  function isImageFile(file) { return file && file.type && imageTypes.includes(file.type); }
  let lastProfileObjectUrl = null;
  const statusEl = $('#profile-upload-status');
  function setUploadStatus(text) {
    if (statusEl) statusEl.textContent = text || '';
  }
  async function handleProfileFile(inputId, file) {
    if (!file || !isImageFile(file)) {
      showError('Please choose an image (JPEG, PNG, GIF, or WebP)');
      return;
    }
    if (lastProfileObjectUrl) {
      URL.revokeObjectURL(lastProfileObjectUrl);
      lastProfileObjectUrl = null;
    }
    const input = document.getElementById(inputId);
    if (!input) return;
    const isCover = inputId === 'profile-cover-url';
    const objectUrl = URL.createObjectURL(file);
    lastProfileObjectUrl = objectUrl;
    setUploadStatus('Uploading…');
    try {
      if (isCover) setProfilePreviewOnly(objectUrl, $('#profile-avatar-url')?.value || (currentUser && currentUser.avatar_url));
      else setProfilePreviewOnly($('#profile-cover-url')?.value || (currentUser && currentUser.cover_url), objectUrl);
      const cropped = await centerCropProfileImage(file, isCover);
      const url = await fileToImageUrl(cropped);
      if (url) {
        if (lastProfileObjectUrl === objectUrl) lastProfileObjectUrl = null;
        URL.revokeObjectURL(objectUrl);
        input.value = url;
        updateProfilePreviews();
        setUploadStatus('Photo ready — tap Save to update profile.');
      } else {
        setUploadStatus('');
        showError('Upload failed. Preview kept — try again or paste a URL.');
      }
    } catch (err) {
      setUploadStatus('');
      showError(err.message || 'Failed to use image');
      try {
        const dataUrl = await readFileAsDataUrl(file);
        if (dataUrl) {
          input.value = dataUrl;
          updateProfilePreviews();
          setUploadStatus('Using photo — tap Save (upload failed).');
        }
      } catch (_) { /* ignore */ }
    }
  }
  const coverFile = $('#profile-cover-file');
  const avatarFile = $('#profile-avatar-file');
  // Use programmatic click so the file picker opens reliably on iOS (label+hidden input often fails)
  $('#btn-cover-from-album')?.addEventListener('click', (e) => {
    e.preventDefault();
    coverFile?.click();
  });
  $('#btn-avatar-from-album')?.addEventListener('click', (e) => {
    e.preventDefault();
    avatarFile?.click();
  });
  coverFile?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setUploadStatus('Photo selected, uploading…');
      handleProfileFile('profile-cover-url', file);
    }
    e.target.value = '';
  });
  avatarFile?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setUploadStatus('Photo selected, uploading…');
      handleProfileFile('profile-avatar-url', file);
    }
    e.target.value = '';
  });
}

function setupProfileDropZones() {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  function isImageFile(file) { return file && file.type && imageTypes.includes(file.type); }
  $$('.drop-zone[data-drop-for]').forEach(zone => {
    const inputId = zone.getAttribute('data-drop-for');
    const input = document.getElementById(inputId);
    if (!input) return;
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      zone.classList.add('drop-over');
    });
    zone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drop-over');
    });
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drop-over');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file || !isImageFile(file)) {
        showError('Please drop an image (JPEG, PNG, GIF, or WebP)');
        return;
      }
      try {
        const url = await fileToImageUrl(file);
        input.value = url;
        updateProfilePreviews();
      } catch (err) {
        showError(err.message || 'Failed to read image');
      }
    });
  });
}

function updateProfileBanner() {
  const coverEl = $('#profile-banner-cover');
  const avatarEl = $('#profile-banner-avatar');
  const timeEl = $('#profile-banner-time');
  if (!coverEl || !avatarEl) return;
  const coverUrl = currentUser && currentUser.cover_url;
  const avatarUrl = currentUser && currentUser.avatar_url;
  const name = currentUser && currentUser.name;
  const initial = (name || '?').charAt(0).toUpperCase();
  coverEl.style.backgroundImage = safeCssUrl(coverUrl) || 'none';
  if (avatarUrl) {
    avatarEl.style.backgroundImage = 'none';
    avatarEl.textContent = '';
    let img = avatarEl.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      img.loading = 'eager';
      img.onerror = () => {
        img.remove();
        avatarEl.textContent = initial;
      };
      avatarEl.appendChild(img);
    }
    img.src = avatarUrl;
  } else {
    avatarEl.style.backgroundImage = 'none';
    avatarEl.querySelector('img')?.remove();
    avatarEl.textContent = initial;
  }
  if (timeEl) {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    timeEl.textContent = `${greeting} · ${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
}

function openImageLightbox(imageUrl) {
  const overlay = $('#image-lightbox-overlay');
  const imgEl = $('#image-lightbox-img');
  const downloadLink = $('#image-lightbox-download');
  if (!overlay || !imgEl || !downloadLink) return;
  imgEl.src = imageUrl;
  downloadLink.href = imageUrl;
  downloadLink.download = 'moment-photo.jpg';
  overlay.hidden = false;
  setOverlayOpen(true);
}

function closeImageLightbox() {
  const overlay = $('#image-lightbox-overlay');
  if (overlay) overlay.hidden = true;
  setOverlayOpen(false);
}

async function loadTimeline() {
  const loading = $('#timeline-loading');
  const empty = $('#timeline-empty');
  if (loading) loading.hidden = false;
  if (empty) empty.hidden = true;
  try {
    const { moments } = await api('/api/timeline');
    renderTimeline(moments);
  } catch (e) {
    showError(e.message || 'Failed to load timeline');
    renderTimeline([]);
  }
}

function bindMomentTypes() {
  const container = $('#moment-types');
  if (!container) return;
  $$('.moment-type-btn', container).forEach(btn => {
    const id = btn.dataset.type;
    if (!id) return;
    btn.addEventListener('click', () => {
      selectedMomentType = id;
      $$('.moment-type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updateMomentPhotoUI();
    });
  });
}

function setMomentTypeSelection() {
  selectedMomentType = MOMENT_TYPES[0].id;
  momentPhotoDataUrl = '';
  updateMomentPhotoUI();
  $$('.moment-type-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.type === selectedMomentType);
  });
}

function updateMomentPhotoUI() {
  const section = $('#moment-photo-section');
  const previewWrap = $('#moment-photo-preview-wrap');
  const previewImg = $('#moment-photo-preview');
  if (!section) return;
  const isPhoto = selectedMomentType === 'photo';
  section.hidden = !isPhoto;
  if (previewWrap) previewWrap.hidden = !momentPhotoDataUrl;
  if (previewImg && momentPhotoDataUrl) previewImg.src = momentPhotoDataUrl;
}

async function setMomentPhotoFromFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  try {
    const url = await fileToImageUrl(file);
    momentPhotoDataUrl = url;
    updateMomentPhotoUI();
  } catch (err) {
    showError(err.message || 'Failed to load image');
  }
}

function init() {
  const formLogin = $('#form-login');
  const formSignup = $('#form-signup');
  const linkSignup = $('#link-signup');
  const linkLogin = $('#link-login');
  const btnLogout = $('#btn-logout');
  const btnEditProfile = $('#btn-edit-profile');
  const btnMenu = $('#btn-menu');
  const headerMenu = $('#header-menu');
  const btnAddMoment = $('#btn-add-moment');
  const addMomentOverlay = $('#add-moment-overlay');
  const profileOverlay = $('#profile-overlay');
  const famsOverlay = $('#fams-overlay');
  const feedbackOverlay = $('#feedback-overlay');
  const formMoment = $('#form-moment');
  const formProfile = $('#form-profile');
  const btnCancelMoment = $('#btn-cancel-moment');
  const btnCancelProfile = $('#btn-cancel-profile');

  linkSignup?.addEventListener('click', (e) => { e.preventDefault(); showScreen('signup'); });
  linkLogin?.addEventListener('click', (e) => { e.preventDefault(); showScreen('login'); });
  $('#link-terms')?.addEventListener('click', (e) => { e.preventDefault(); });
  $('#link-privacy')?.addEventListener('click', (e) => { e.preventDefault(); });

  btnMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (headerMenu) {
      headerMenu.hidden = !headerMenu.hidden;
      btnMenu?.setAttribute('aria-expanded', headerMenu.hidden ? 'false' : 'true');
    }
  });
  document.addEventListener('click', (e) => {
    if (headerMenu && !headerMenu.hidden && !headerMenu.contains(e.target) && e.target !== btnMenu) {
      headerMenu.hidden = true;
      btnMenu?.setAttribute('aria-expanded', 'false');
    }
    if (!e.target.closest('.moment-reaction-picker') && !e.target.closest('.moment-react-btn')) {
      document.querySelectorAll('.moment-reaction-picker').forEach(p => { p.hidden = true; });
    }
  });

  $('#image-lightbox-backdrop')?.addEventListener('click', closeImageLightbox);
  $('#image-lightbox-close')?.addEventListener('click', closeImageLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const lightbox = $('#image-lightbox-overlay');
    if (lightbox && !lightbox.hidden) {
      closeImageLightbox();
      return;
    }
    if (addMomentOverlay && !addMomentOverlay.hidden) {
      addMomentOverlay.hidden = true;
      setOverlayOpen(false);
    } else if (profileOverlay && !profileOverlay.hidden) {
      profileOverlay.hidden = true;
      setOverlayOpen(false);
    } else if (famsOverlay && !famsOverlay.hidden) {
      famsOverlay.hidden = true;
      setOverlayOpen(false);
    } else if (feedbackOverlay && !feedbackOverlay.hidden) {
      feedbackOverlay.hidden = true;
      setOverlayOpen(false);
    } else if (headerMenu && !headerMenu.hidden) {
      headerMenu.hidden = true;
    }
  });

  btnEditProfile?.addEventListener('click', () => {
    if (headerMenu) headerMenu.hidden = true;
    openProfileEditor();
  });
  $('#btn-feedback')?.addEventListener('click', () => {
    if (headerMenu) headerMenu.hidden = true;
    const overlay = $('#feedback-overlay');
    const ta = $('#feedback-message');
    if (overlay) overlay.hidden = false;
    if (ta) { ta.value = ''; ta.focus(); }
    setOverlayOpen(true);
  });
  $('#btn-cancel-feedback')?.addEventListener('click', () => {
    const overlay = $('#feedback-overlay');
    if (overlay) overlay.hidden = true;
    setOverlayOpen(false);
  });
  $('#feedback-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'feedback-overlay') {
      e.target.hidden = true;
      setOverlayOpen(false);
    }
  });
  $('#form-feedback')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ta = $('#feedback-message');
    const message = (ta && ta.value) ? ta.value.trim() : '';
    if (!message) {
      showError('Please enter your feedback or suggestion.');
      return;
    }
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
    try {
      const data = await api('/api/feedback', { method: 'POST', body: JSON.stringify({ message }) });
      $('#feedback-overlay').hidden = true;
      setOverlayOpen(false);
      if (ta) ta.value = '';
      showError(data.message || 'Thanks! Your feedback has been sent.'); // reuse toast for success
      const t = document.querySelector('.error-toast');
      if (t) { t.classList.add('success-toast'); t.classList.remove('error-toast'); }
    } catch (err) {
      showError(err.message || 'Could not send feedback.');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
    }
  });
  // Prevent menu from closing when clicking a menu button (so Edit profile fires)
  headerMenu?.addEventListener('click', (e) => e.stopPropagation());

  ['profile-avatar-url', 'profile-cover-url'].forEach(id => {
    const el = $('#' + id);
    el?.addEventListener('input', updateProfilePreviews);
  });
  setupProfileDropZones();
  setupProfilePhotoFromAlbum();

  btnCancelProfile?.addEventListener('click', () => {
    profileOverlay.hidden = true;
    setOverlayOpen(false);
  });
  profileOverlay?.addEventListener('click', (e) => {
    if (e.target === profileOverlay) {
      profileOverlay.hidden = true;
      setOverlayOpen(false);
    }
  });

  formProfile?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
    }
    const fd = new FormData(form);
    try {
      const { profile } = await api('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: fd.get('name')?.trim() || null,
          avatar_url: fd.get('avatar_url')?.trim() || null,
          cover_url: fd.get('cover_url')?.trim() || null,
          bio: fd.get('bio')?.trim() || null,
        }),
      });
      currentUser = profile;
      const statusEl = $('#profile-upload-status');
      if (statusEl) statusEl.textContent = '';
      profileOverlay.hidden = true;
      setOverlayOpen(false);
      updateProfileBanner();
      loadTimeline();
    } catch (err) {
      showError(err.message || 'Failed to save profile');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });

  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';
    }
    const fd = new FormData(form);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
      });
      currentUser = data.user;
      showScreen('app');
      await loadProfile();
      loadTimeline();
    } catch (err) {
      showError(err.message || 'Login failed');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
    }
  });

  formSignup?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    const password = form.querySelector('input[name="password"]')?.value || '';
    const passwordConfirm = form.querySelector('input[name="password_confirm"]')?.value || '';
    if (password !== passwordConfirm) {
      showError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters and include a letter and a number');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      showError('Password must include at least one letter and one number');
      return;
    }
    if (!form.querySelector('input[name="accept_terms"]')?.checked) {
      showError('Please accept the Terms of Service and Privacy Policy');
      return;
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account…';
    }
    const fd = new FormData(form);
    try {
      const data = await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name')?.toString().trim(),
          email: fd.get('email')?.toString().trim().toLowerCase(),
          password: fd.get('password'),
          password_confirm: fd.get('password_confirm'),
          accept_terms: true,
        }),
      });
      currentUser = data.user;
      showScreen('app');
      await loadProfile();
      loadTimeline();
    } catch (err) {
      showError(err.message || 'Sign up failed');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
    }
  });

  btnLogout?.addEventListener('click', async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    showScreen('login');
  });

  bindMomentTypes();
  btnAddMoment?.addEventListener('click', () => {
    setMomentTypeSelection();
    formMoment?.reset();
    momentPhotoDataUrl = '';
    updateMomentPhotoUI();
    addMomentOverlay.hidden = false;
    setOverlayOpen(true);
  });

  const photoFileInput = $('#moment-photo-file');
  photoFileInput?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) setMomentPhotoFromFile(file);
    e.target.value = '';
  });
  $('#btn-remove-moment-photo')?.addEventListener('click', () => {
    momentPhotoDataUrl = '';
    updateMomentPhotoUI();
  });

  btnCancelMoment?.addEventListener('click', () => {
    addMomentOverlay.hidden = true;
    setOverlayOpen(false);
  });

  const famsList = $('#fams-list');
  const btnCloseFams = $('#btn-close-fams');
  const btnFams = $('#btn-fams');
  const btnCreateFam = $('#btn-create-fam');
  const famsCreateForm = $('#fams-create-form');
  const famNameInput = $('#fam-name-input');
  const btnSubmitCreateFam = $('#btn-submit-create-fam');
  const btnCancelCreateFam = $('#btn-cancel-create-fam');

  async function loadFamsList() {
    if (!famsList) return;
    famsList.innerHTML = '<p class="fams-loading">Loading…</p>';
    try {
      const { fams: famsData } = await api('/api/fams');
      if (!famsData || !famsData.length) {
        famsList.innerHTML = '<p class="fams-empty">You have no fams yet. Start one and invite people by email.</p>';
        return;
      }
      famsList.innerHTML = famsData.map(f => {
        const members = f.members || [];
        const membersHtml = members.map(m => {
          const initial = (m.name || '?').charAt(0).toUpperCase();
          const avatarHtml = m.avatar_url
            ? `<img class="fam-member-avatar-img" src="${escapeHtml(m.avatar_url)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><span class="fam-member-initial" style="display:none">${escapeHtml(initial)}</span>`
            : `<span class="fam-member-initial">${escapeHtml(initial)}</span>`;
          return `<div class="fam-member"><span class="fam-member-avatar" aria-hidden="true">${avatarHtml}</span><span class="fam-member-name">${escapeHtml(m.name || 'Someone')}</span></div>`;
        }).join('');
        return `
        <div class="fam-item" data-fam-id="${f.id}">
          <div class="fam-item-header">
            <span class="fam-item-name">${escapeHtml(f.name)}</span>
            <span class="fam-item-count">${f.member_count || 0} member${(f.member_count || 0) !== 1 ? 's' : ''}</span>
          </div>
          ${members.length ? `<div class="fam-members">${membersHtml}</div>` : ''}
          <div class="fam-invite-row">
            <input type="email" class="fam-invite-email" placeholder="Email to invite" data-fam-id="${f.id}" />
            <button type="button" class="btn-invite-fam" data-fam-id="${f.id}">Invite</button>
          </div>
        </div>`;
      }).join('');
      famsList.querySelectorAll('.btn-invite-fam').forEach(btn => {
        btn.addEventListener('click', async () => {
          const famId = btn.getAttribute('data-fam-id');
          const row = btn.closest('.fam-item');
          const emailInput = row?.querySelector('.fam-invite-email');
          const email = emailInput?.value?.trim();
          if (!email) {
            showError('Enter an email address');
            return;
          }
          btn.disabled = true;
          const origText = btn.textContent;
          btn.textContent = '…';
          try {
            const data = await api('/api/fams/' + famId + '/invite', { method: 'POST', body: JSON.stringify({ email }) });
            showError(data.message || 'Done');
            if (emailInput) emailInput.value = '';
            loadFamsList();
            loadTimeline();
          } catch (e) {
            showError(e.message || 'Could not invite');
          } finally {
            btn.disabled = false;
            btn.textContent = origText;
          }
        });
      });
    } catch (e) {
      famsList.innerHTML = '<p class="fams-empty">Could not load fams.</p>';
    }
  }

  btnFams?.addEventListener('click', () => {
    if (headerMenu) headerMenu.hidden = true;
    if (famsOverlay) {
      famsOverlay.hidden = false;
      setOverlayOpen(true);
      if (famsCreateForm) famsCreateForm.hidden = true;
      loadFamsList();
    }
  });
  btnCloseFams?.addEventListener('click', () => {
    if (famsOverlay) { famsOverlay.hidden = true; setOverlayOpen(false); }
  });
  famsOverlay?.addEventListener('click', (e) => {
    if (e.target === famsOverlay) { famsOverlay.hidden = true; setOverlayOpen(false); }
  });
  btnCreateFam?.addEventListener('click', () => {
    if (famsCreateForm) famsCreateForm.hidden = !famsCreateForm.hidden;
    if (famNameInput) { famNameInput.value = ''; famNameInput.focus(); }
  });
  btnCancelCreateFam?.addEventListener('click', () => {
    if (famsCreateForm) famsCreateForm.hidden = true;
  });
  btnSubmitCreateFam?.addEventListener('click', async () => {
    const name = famNameInput?.value?.trim() || 'My Fam';
    btnSubmitCreateFam.disabled = true;
    try {
      await api('/api/fams', { method: 'POST', body: JSON.stringify({ name }) });
      if (famsCreateForm) famsCreateForm.hidden = true;
      loadFamsList();
      loadTimeline();
    } catch (e) {
      showError(e.message || 'Could not create fam');
    } finally {
      btnSubmitCreateFam.disabled = false;
    }
  });

  formMoment?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const type = selectedMomentType || MOMENT_TYPES[0].id;
    const body = fd.get('body')?.trim() || null;
    if (type === 'photo' && !momentPhotoDataUrl && !body) {
      showError('Add a photo or a comment');
      return;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting…';
    }
    try {
      await api('/api/moments', {
        method: 'POST',
        body: JSON.stringify({
          type,
          body,
          image_url: type === 'photo' ? (momentPhotoDataUrl || null) : null,
        }),
      });
      addMomentOverlay.hidden = true;
      setOverlayOpen(false);
      momentPhotoDataUrl = '';
      loadTimeline();
    } catch (err) {
      showError(err.message || 'Failed to post');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });

  addMomentOverlay?.addEventListener('click', (e) => {
    if (e.target === addMomentOverlay) {
      addMomentOverlay.hidden = true;
      setOverlayOpen(false);
    }
  });

  (async () => {
    const user = await checkAuth();
    if (user) {
      currentUser = user;
      showScreen('app');
      updateProfileBanner();
      await loadProfile();
      loadTimeline();
    } else {
      showScreen('login');
    }
  })();
}

init();
