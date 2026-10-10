export const money = (n: number | string) =>
  'Rs. ' + Number(n).toLocaleString('en-LK', { maximumFractionDigits: 2 })

// today's date (or any date) as YYYY-MM-DD in LOCAL time
export function localDate(d: Date = new Date()) {
  const z = d.getTimezoneOffset()
  return new Date(d.getTime() - z * 60000).toISOString().slice(0, 10)
}

export const fmtTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
