export function isToday(date: string | number) {
  return new Date(date).toDateString() === new Date().toDateString();
}

export function isYesterday(date: string | number) {
  return (
    new Date(date).toDateString() ===
    new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
  );
}
