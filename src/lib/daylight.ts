// Sunrise and sunset for Tromsø, from NOAA's general solar position equations.
// Pure functions, so server and client render the same numbers.

const LATITUDE = 69.6492
const LONGITUDE = 18.9553
const ZENITH = 90.833 // centre of the sun at the horizon, corrected for refraction
const YEAR = 2026 // any non-leap year; only used to place days on the calendar

export const DAYS_IN_YEAR = 365
export const WINTER_SOLSTICE = 355 // 21 December

export const MONTHS = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
]
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Day of year (1 to 365) at which each month starts. */
export const MONTH_STARTS = MONTH_LENGTHS.reduce<number[]>(
  (starts, _, i) => [...starts, i === 0 ? 1 : starts[i - 1] + MONTH_LENGTHS[i - 1]],
  []
)

export type SunDay = {
  day: number
  /** Minutes after midnight UTC, or null when the sun stays down or up. */
  riseUtc: number | null
  setUtc: number | null
  daylightMinutes: number
  kind: "normal" | "polar-night" | "midnight-sun"
}

const rad = (deg: number) => (deg * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export function sunDay(day: number): SunDay {
  const g = ((2 * Math.PI) / DAYS_IN_YEAR) * (day - 1)
  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const lat = rad(LATITUDE)
  const cosH = Math.cos(rad(ZENITH)) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl)

  if (cosH > 1) return { day, riseUtc: null, setUtc: null, daylightMinutes: 0, kind: "polar-night" }
  if (cosH < -1) return { day, riseUtc: null, setUtc: null, daylightMinutes: 1440, kind: "midnight-sun" }

  const h = deg(Math.acos(cosH))
  return {
    day,
    riseUtc: 720 - 4 * (LONGITUDE + h) - eqTime,
    setUtc: 720 - 4 * (LONGITUDE - h) - eqTime,
    daylightMinutes: 8 * h,
    kind: "normal",
  }
}

/** The whole year, computed once. */
export const YEAR_OF_LIGHT: SunDay[] = Array.from({ length: DAYS_IN_YEAR }, (_, i) => sunDay(i + 1))

export function monthAndDate(day: number) {
  let month = 0
  while (month < 11 && day >= MONTH_STARTS[month + 1]) month++
  return { month, date: day - MONTH_STARTS[month] + 1 }
}

export function formatDate(day: number) {
  const { month, date } = monthAndDate(day)
  return `${date}.\u00a0${MONTHS[month]}` // the number and month stay on one line
}

const clock = new Intl.DateTimeFormat("nb-NO", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Oslo",
})

/** "07.53", Norwegian style, in local Tromsø time including summer time. */
export function formatClock(day: number, minutesUtc: number) {
  const { month, date } = monthAndDate(day)
  const instant = new Date(Date.UTC(YEAR, month, date, 0, Math.round(minutesUtc)))
  const parts = clock.formatToParts(instant)
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00"
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00"
  return `${hour}.${minute}`
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (minutes <= 0) return "ingen dagslys"
  if (minutes >= 1440) return "sol hele døgnet"
  return `${h} t ${m} min dagslys`
}

/** Day of year (1 to 365) for a local date; 29 February folds into 28 February. */
export function dayOfYear(date: Date) {
  const month = date.getMonth()
  const d = Math.min(date.getDate(), MONTH_LENGTHS[month])
  return MONTH_STARTS[month] + d - 1
}
