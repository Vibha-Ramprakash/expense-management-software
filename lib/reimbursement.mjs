export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY = 86400000;

function calendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose a valid calendar date in YYYY-MM-DD form.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Choose a valid calendar date in YYYY-MM-DD form.");
  return date;
}

export function validateSchedule(schedule) {
  const frequency = String(schedule.frequency ?? "").trim().toLowerCase();
  if (!["weekly", "fortnightly", "monthly"].includes(frequency)) throw new Error("Choose weekly, fortnightly (every two weeks), or monthly reimbursement.");
  const leadDays = schedule.leadDays;
  if (!Number.isInteger(leadDays) || leadDays < 0 || leadDays > 30) throw new Error("Lead time must be a whole number from 0 to 30 calendar days.");
  if (frequency === "monthly") {
    if (!Number.isInteger(schedule.dayOfMonth) || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) throw new Error("Choose a monthly reimbursement day from 1 to 31.");
    return { frequency, leadDays, dayOfMonth: schedule.dayOfMonth };
  }
  const weekday = WEEKDAYS.find((day) => day.toLowerCase() === String(schedule.weekday ?? "").trim().toLowerCase());
  if (!weekday) throw new Error("Choose a reimbursement weekday from Sunday to Saturday.");
  if (frequency === "fortnightly") {
    const anchor = calendarDate(schedule.anchorDate);
    if (WEEKDAYS[anchor.getUTCDay()] !== weekday) throw new Error("The first fortnightly reimbursement date must fall on the selected weekday.");
    return { frequency, weekday, leadDays, anchorDate: schedule.anchorDate };
  }
  return { frequency, weekday, leadDays };
}

export function nextReimbursementDate(schedule, now = new Date()) {
  const policy = validateSchedule(schedule);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("The scheduling date is invalid.");
  const eligible = calendarDate(now.toISOString().slice(0, 10));
  eligible.setUTCDate(eligible.getUTCDate() + policy.leadDays);
  let result;
  if (policy.frequency === "fortnightly") {
    const anchor = calendarDate(policy.anchorDate);
    const periods = Math.max(0, Math.ceil((eligible.getTime() - anchor.getTime()) / (14 * DAY)));
    result = new Date(anchor.getTime() + periods * 14 * DAY);
  } else if (policy.frequency === "monthly") {
    const inMonth = (offset) => {
      const date = new Date(eligible);
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + offset);
      const last = new Date(date);
      last.setUTCMonth(last.getUTCMonth() + 1, 0);
      date.setUTCDate(Math.min(policy.dayOfMonth, last.getUTCDate()));
      return date;
    };
    result = inMonth(0);
    if (result < eligible) result = inMonth(1);
  } else {
    result = new Date(eligible);
    result.setUTCDate(result.getUTCDate() + (WEEKDAYS.indexOf(policy.weekday) - result.getUTCDay() + 7) % 7);
  }
  return result.toISOString().slice(0, 10);
}

export function describeSchedule(schedule) {
  const policy = validateSchedule(schedule);
  return policy.frequency === "monthly"
    ? { heading: `Day ${policy.dayOfMonth}`, badge: String(policy.dayOfMonth), note: "monthly · month-end if shorter" }
    : { heading: policy.weekday, badge: policy.weekday.slice(0, 3).toUpperCase(), note: policy.frequency === "fortnightly" ? `fortnightly · from ${policy.anchorDate}` : "weekly run" };
}
