export function getDate(params?: {
  ts?: number,
  format?: string
}) {
  const d = new Date(params && params.ts ? params.ts : Date.now());
  const format = (params && params.format) ? params.format : 'YYYY-MM-DD hh:mm:ss';
  const year = `${d.getFullYear()}`
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const date = `${d.getDate()}`.padStart(2, '0')
  const hour = `${d.getHours()}`.padStart(2, '0')
  const minute = `${d.getMinutes()}`.padStart(2, '0')
  const second = `${d.getSeconds()}`.padStart(2, '0')
  return format.replace('YYYY', year).replace('MM', month).replace('DD', date).replace('hh', hour).replace('mm', minute).replace('ss', second)
}

export function getTsStartOf(ts?: number) {
  const now = ts ? new Date(ts) : new Date()
  now.setHours(0)
  now.setMinutes(0)
  now.setSeconds(0)
  now.setMilliseconds(0)
  return now.getTime()
}

export function getTsStartOfDay() {
  const now = new Date()
  now.setHours(0)
  now.setMinutes(0)
  now.setSeconds(0)
  now.setMilliseconds(0)
  return now.getTime()
}

export function getTsEndOf(ts?: number) {
  const now = ts ? new Date(ts) : new Date()
  now.setHours(24)
  now.setMinutes(0)
  now.setSeconds(0)
  now.setMilliseconds(0)
  return now.getTime() - 1
}

export function getTsEndOfDay() {
  const now = new Date()
  now.setHours(24)
  now.setMinutes(0)
  now.setSeconds(0)
  now.setMilliseconds(0)
  return now.getTime() - 1
}

export function getSameTimeOfDay(ts: number) {
  const now = new Date()
  const date = new Date(ts)
  now.setHours(date.getHours())
  now.setMinutes(date.getMinutes())
  now.setSeconds(date.getSeconds())
  now.setMilliseconds(0)
  return now.getTime()
}