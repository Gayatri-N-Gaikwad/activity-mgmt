const TOAST_CONTAINER_ID = 'app-toast-container';

function ensureContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    document.body.appendChild(container);
  }
  return container;
}

export default function showToast(type = 'info', message = '', timeout = 4000) {
  const container = ensureContainer();

  const toast = document.createElement('div');
  toast.className = `app-toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // show animation
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => container.removeChild(toast), 300);
  }, timeout);
}
