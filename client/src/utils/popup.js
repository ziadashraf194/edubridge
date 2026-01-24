// Lightweight non-blocking popup replacement for window.alert
// This file attaches `showPopup` to window and overrides `window.alert`
// so existing code that calls alert(...) will use this nicer popup.

function createContainer() {
  let container = document.getElementById('edubridge-popup-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'edubridge-popup-container';
    container.setAttribute('aria-live', 'polite');
    container.style.position = 'fixed';
    container.style.zIndex = 2147483646; 
    container.style.right = '20px';
    container.style.top = '20px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.maxWidth = 'min(420px, calc(100% - 40px))';
    document.body.appendChild(container);
  }
  return container;
}

export function showPopup(message, opts = {}) {
  if (!message && message !== 0) return;
  const container = createContainer();

  const toast = document.createElement('div');
  toast.className = 'edubridge-popup';
  // use site colors - purple gradient by default, allow override
  toast.style.background = opts.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  toast.style.color = opts.color || '#fff';
  toast.style.padding = '14px 16px';
  toast.style.borderRadius = '10px';
  toast.style.boxShadow = '0 6px 24px rgba(0,0,0,0.25)';
  toast.style.fontFamily = "Cairo, 'Segoe UI', Roboto, system-ui, -apple-system, 'Helvetica Neue', Arial";
  toast.style.fontSize = '15px';
  toast.style.lineHeight = '1.3';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-6px)';
  toast.style.transition = 'opacity 220ms ease, transform 220ms ease';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.justifyContent = 'space-between';
  toast.style.gap = '12px';

  const text = document.createElement('div');
  text.style.flex = '1 1 auto';
  text.style.wordBreak = 'break-word';
  text.innerText = String(message);

  // optional icon (FontAwesome) based on type
  const type = opts.type || 'info';
  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-triangle-exclamation',
    info: 'fa-circle-info',
    warning: 'fa-exclamation-triangle'
  };
  const iconClass = opts.icon || iconMap[type] || 'fa-circle-info';
  const icon = document.createElement('i');
  icon.className = `fa-solid ${iconClass}`;
  icon.style.marginRight = '10px';
  icon.style.fontSize = '18px';
  icon.style.flex = '0 0 auto';
  icon.style.opacity = '0.95';

  const btn = document.createElement('button');
  btn.innerText = opts.okText || 'حسناً';
  // button styling: use primary gradient for positive, red for error, or custom
  const okBg = opts.okBackground || (type === 'success'
    ? 'linear-gradient(135deg,#10b981 0%, #059669 100%)'
    : type === 'error'
      ? 'linear-gradient(135deg,#ef4444 0%, #dc2626 100%)'
      : 'linear-gradient(135deg,#667eea 0%, #764ba2 100%)');
  btn.style.background = okBg;
  btn.style.border = 'none';
  btn.style.color = '#fff';
  btn.style.padding = '8px 12px';
  btn.style.borderRadius = '8px';
  btn.style.cursor = 'pointer';
  btn.style.flex = '0 0 auto';

  btn.onclick = () => {
    hide(toast);
  };

  // assemble: icon + text + button
  const left = document.createElement('div');
  left.style.display = 'flex';
  left.style.alignItems = 'center';
  left.style.gap = '8px';
  left.appendChild(icon);
  left.appendChild(text);

  toast.appendChild(left);
  toast.appendChild(btn);
  container.appendChild(toast);

  // force reflow then show
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  const timeout = typeof opts.duration === 'number' ? opts.duration : 3800;
  const timer = setTimeout(() => hide(toast), timeout);

  function hide(node) {
    clearTimeout(timer);
    node.style.opacity = '0';
    node.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      try { node.remove(); } catch (e) {}
    }, 250);
  }

  return {
    close: () => hide(toast)
  };
}

// Override the default alert to a non-blocking popup.
try {
  // keep a reference to native alert just in case
  if (!window.__nativeAlert) window.__nativeAlert = window.alert;
  window.alert = function (msg) {
    try {
      showPopup(msg);
    } catch (e) {
      // fallback to native if anything goes wrong
      if (window.__nativeAlert) window.__nativeAlert(msg);
    }
  };

  // expose helper globally
  if (!window.showPopup) window.showPopup = showPopup;
} catch (e) {
  // ignore in non-browser env
}

export default showPopup;

// Promise-based confirm-style modal (non-blocking, returns Promise<boolean>)
export function showConfirm(message, opts = {}) {
  if (!message && message !== 0) return Promise.resolve(false);

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = opts.overlayBackground || 'rgba(0,0,0,0.45)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 2147483647; // above the toast container
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const box = document.createElement('div');
    box.style.background = opts.background || '#0f172a';
    box.style.color = opts.color || '#fff';
    box.style.padding = '18px 20px';
    box.style.borderRadius = '12px';
    box.style.boxShadow = '0 10px 40px rgba(2,6,23,0.6)';
    box.style.maxWidth = opts.maxWidth || '520px';
    box.style.width = 'min(92%, 520px)';
    box.style.fontFamily = "Cairo, 'Segoe UI', Roboto, system-ui, -apple-system, 'Helvetica Neue', Arial";
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.gap = '12px';

    // header (icon + optional title)
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '12px';

    const type = opts.type || 'info';
    const iconMap = {
      success: 'fa-check-circle',
      error: 'fa-triangle-exclamation',
      info: 'fa-circle-info',
      warning: 'fa-exclamation-triangle'
    };
    const iconClass = opts.icon || iconMap[type] || 'fa-circle-info';
    const headerIcon = document.createElement('i');
    headerIcon.className = `fa-solid ${iconClass}`;
    headerIcon.style.fontSize = '22px';
    headerIcon.style.flex = '0 0 auto';
    headerIcon.style.color = opts.iconColor || (type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#667eea');

    header.appendChild(headerIcon);

    if (opts.title) {
      const title = document.createElement('div');
      title.style.fontSize = '16px';
      title.style.fontWeight = '600';
      title.innerText = opts.title;
      header.appendChild(title);
    }

    box.appendChild(header);

    const text = document.createElement('div');
    text.style.fontSize = '15px';
    text.style.lineHeight = '1.4';
    text.style.marginTop = opts.title ? '2px' : '6px';
    text.innerText = String(message);
    box.appendChild(text);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '10px';
    actions.style.justifyContent = 'flex-end';

    const cancel = document.createElement('button');
    cancel.innerText = opts.cancelText || 'إلغاء';
    cancel.style.background = 'transparent';
    cancel.style.border = '1px solid rgba(255,255,255,0.12)';
    cancel.style.color = 'inherit';
    cancel.style.padding = '8px 12px';
    cancel.style.borderRadius = '8px';
    cancel.style.cursor = 'pointer';

    const ok = document.createElement('button');
    ok.innerText = opts.okText || 'موافق';
    const okBg = opts.okBackground || (type === 'success'
      ? 'linear-gradient(135deg,#10b981 0%, #059669 100%)'
      : type === 'error'
        ? 'linear-gradient(135deg,#ef4444 0%, #dc2626 100%)'
        : 'linear-gradient(135deg,#667eea 0%, #764ba2 100%)');
    ok.style.background = okBg;
    ok.style.border = 'none';
    ok.style.color = '#fff';
    ok.style.padding = '8px 12px';
    ok.style.borderRadius = '8px';
    ok.style.cursor = 'pointer';

    actions.appendChild(cancel);
    actions.appendChild(ok);
    box.appendChild(actions);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // focus management (basic)
    ok.focus();

    function cleanup() {
      try { overlay.remove(); } catch (e) {}
    }

    cancel.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    ok.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    // close on overlay click (but only if clicking outside the box)
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay && opts.closeOnOverlay !== false) {
        cleanup();
        resolve(false);
      }
    });
  });
}

// expose confirm helper globally
try {
  if (!window.showConfirm) window.showConfirm = showConfirm;
} catch (e) {}
