import i18n from '../i18n';

export const formatLastSeen = (isoString, t) => {
  const tr = t || i18n.t;

  if (!isoString) return tr('time.longAgo');
  
  const now = new Date();
  const lastSeenDate = new Date(isoString);
  const diffSeconds = Math.round((now - lastSeenDate) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 60) return tr('time.justNow');
  if (diffMinutes === 1) return tr('time.minuteAgo');
  if (diffMinutes < 60) return tr('time.minutesAgo', { count: diffMinutes });
  if (diffHours === 1) return tr('time.hourAgo');
  if (diffHours < 24) return tr('time.hoursAgo', { count: diffHours });
  if (diffDays === 1) return tr('time.lastSeenYesterday');
  if (diffDays < 7) return tr('time.daysAgo', { count: diffDays });

  return lastSeenDate.toLocaleDateString();
};