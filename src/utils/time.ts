export function isToday(date: string | number) {
  return new Date(date).toDateString() === new Date().toDateString();
}