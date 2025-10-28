import i18n from '../i18n';

export const formatMessageTimestamp = (isoString, t) => {
  const tr = t || i18n.t;

  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();

  const isToday = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday = date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return tr('time.timestampYesterday');
  }

  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};