export const formatLastSeen = (isoString) => {
  if (!isoString) return 'hace mucho tiempo';
  const now = new Date();
  const lastSeenDate = new Date(isoString);
  const diffSeconds = Math.round((now - lastSeenDate) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 60) return 'hace unos segundos';
  if (diffMinutes === 1) return `hace 1 minuto`;
  if (diffMinutes < 60) return `hace ${diffMinutes} minutos`;
  if (diffHours === 1) return `hace 1 hora`;
  if (diffHours < 24) return `hace ${diffHours} horas`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;

  return lastSeenDate.toLocaleDateString();
};