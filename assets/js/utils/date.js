export function formatRelativeDate(dateString) {
  const publishedDate = new Date(dateString);
  const differenceInMinutes = Math.max(0, Math.floor((Date.now() - publishedDate) / 60000));

  if (differenceInMinutes < 60) return `${Math.max(1, differenceInMinutes)} min ago`;

  const differenceInHours = Math.floor(differenceInMinutes / 60);

  if (differenceInHours < 24) return `${differenceInHours}h ago`;

  const differenceInDays = Math.floor(differenceInHours / 24);

  return differenceInDays === 1 ? 'Yesterday' : `${differenceInDays} days ago`;
}

export function toDateKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}
