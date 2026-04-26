import i18n from '../i18n';
import type { TFunction } from 'i18next';

export const formatLastSeen = (isoString?: string | null, t?: TFunction): string => {
  const tr = t || i18n.t.bind(i18n);

  if (!isoString) return tr('time.longAgo');

  const now = new Date();
  const lastSeenDate = new Date(isoString);
  const diffSeconds = Math.round((now.getTime() - lastSeenDate.getTime()) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 60) return tr('time.justNow');
  if (diffMinutes === 1) return tr('time.minuteAgo');
  if (diffMinutes < 60) return tr('time.minutesAgo').replace('{count}', String(diffMinutes));
  if (diffHours === 1) return tr('time.hourAgo');
  if (diffHours < 24) return tr('time.hoursAgo').replace('{count}', String(diffHours));
  if (diffDays === 1) return tr('time.lastSeenYesterday');
  if (diffDays < 7) return tr('time.daysAgo').replace('{count}', String(diffDays));

  return lastSeenDate.toLocaleDateString();
};
