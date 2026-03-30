import Link from "next/link";
import { getAllClasses, getWeeklySchedule } from "./action";
import { Button } from "@/components/ui/button";
import { WEEK_DAYS, type TimetableEntry, type WeekDay } from "@/lib/timetable";

export const dynamic = "force-dynamic";

type SearchParams = {
  classId?: string;
  view?: "weekly" | "day";
  day?: string;
};

function toValidDay(value: string | undefined) {
  if (!value) return "Monday";
  return WEEK_DAYS.includes(value as WeekDay) ? (value as WeekDay) : "Monday";
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function getClassHighlights(entries: TimetableEntry[]) {
  const now = new Date();
  const nowDayName = DAY_NAMES[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function entryMinutes(e: TimetableEntry) {
    const [h, m] = e.start_time.split(":").map(Number);
    return h * 60 + m;
  }

  function entryEndMinutes(e: TimetableEntry) {
    if (e.end_time) {
      const [h, m] = e.end_time.split(":").map(Number);
      return h * 60 + m;
    }
    return entryMinutes(e) + 60;
  }

  const activeEntries = entries.filter((e) => !e.is_cancelled);

  // Today's active entries sorted by time
  const todayEntries = activeEntries
    .filter((e) => e.day === nowDayName)
    .sort((a, b) => entryMinutes(a) - entryMinutes(b));

  // Current: class where current time is between start and end.
  const currentClass =
    todayEntries
      .filter((e) => {
        const start = entryMinutes(e);
        const end = entryEndMinutes(e);
        return start <= nowMinutes && nowMinutes < end;
      })
      .at(-1) ?? null;

  // Next: first class today after now, else first class on the next school day
  const nextToday = todayEntries.find((e) => entryMinutes(e) > nowMinutes) ?? null;

  let nextClass: TimetableEntry | null = nextToday;
  if (!nextClass) {
    // Look through the upcoming school days (up to 4 days ahead)
    for (let offset = 1; offset <= 4; offset++) {
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + offset);
      const nextDayName = DAY_NAMES[nextDate.getDay()];
      if (!WEEK_DAYS.includes(nextDayName as WeekDay)) continue;
      const dayEntries = activeEntries
        .filter((e) => e.day === nextDayName)
        .sort((a, b) => entryMinutes(a) - entryMinutes(b));
      if (dayEntries.length > 0) {
        nextClass = dayEntries[0];
        break;
      }
    }
  }

  return { currentClass, nextClass, isWeekend: !WEEK_DAYS.includes(nowDayName as WeekDay) };
}

export default async function SchoolHub({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const classes = await getAllClasses();

  const selectedClassId = params.classId ?? "";
  const selectedView = params.view === "day" ? "day" : "weekly";
  const selectedDay = toValidDay(params.day);
  const hasClassSelection = Boolean(selectedClassId);
  const canShowTable = hasClassSelection;

  // Table schedule (may be day-filtered)
  const schedule = canShowTable
    ? await getWeeklySchedule([selectedClassId], selectedView === "day" ? selectedDay : "")
    : [];

  // Full weekly schedule for current/next detection (reuse if already weekly)
  const weeklySchedule =
    canShowTable && selectedView === "day"
      ? await getWeeklySchedule([selectedClassId])
      : schedule;

  const classMap = new Map(classes.map((item) => [item.id, item]));
  const selectedClass = classMap.get(selectedClassId);

  const { currentClass, nextClass, isWeekend } = canShowTable
    ? getClassHighlights(weeklySchedule)
    : { currentClass: null, nextClass: null, isWeekend: false };

  function formatTimeRange(entry: TimetableEntry) {
    const start = entry.start_time.slice(0, 5);
    const end = entry.end_time?.slice(0, 5);
    return end ? `${start} - ${end}` : start;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff7ed_0%,#f0f9ff_45%,#ecfeff_100%)]">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-200 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-cyan-200/50 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-8 h-44 w-44 rounded-full bg-orange-200/50 blur-2xl" />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Student Zone</p>
              <h1 className="mt-1 text-3xl font-heading font-black text-slate-900 md:text-4xl">Fun Timetable</h1>
              <p className="mt-2 text-sm text-slate-600">Pick your class and view the full week timetable.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button asChild variant="outline" className="w-full bg-white/80 sm:w-auto">
                <Link href="/teacher">Teacher Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-white/80 sm:w-auto">
                <Link href="/admin">Admin Dashboard</Link>
              </Button>
            </div>
          </div>

          <form className="relative z-10 mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="classId" className="mb-2 block text-sm font-semibold text-slate-700">Class</label>
              <select
                id="classId"
                name="classId"
                defaultValue={selectedClassId}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Select your class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="view" className="mb-2 block text-sm font-semibold text-slate-700">View</label>
              <select
                id="view"
                name="view"
                defaultValue={selectedView}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none"
              >
                <option value="weekly">Whole Week</option>
                <option value="day">Single Day</option>
              </select>
            </div>

            <div>
              <label htmlFor="day" className="mb-2 block text-sm font-semibold text-slate-700">Day (for day view)</label>
              <select
                id="day"
                name="day"
                defaultValue={selectedDay}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none"
              >
                {WEEK_DAYS.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit" className="h-11 w-full rounded-xl bg-cyan-600 text-white hover:bg-cyan-700">Show Timetable</Button>
            </div>
          </form>
        </section>

        {!canShowTable ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">Select your class to unlock your timetable.</p>
            <p className="mt-2 text-sm text-slate-500">Your schedule appears here with class status and direct Zoom access.</p>
          </section>
        ) : (
          <>
            {/* Current & Next class highlights */}
            {(currentClass || nextClass) ? (
              <section className="grid gap-4 sm:grid-cols-2">
                {/* NOW tile */}
                {currentClass ? (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-500 to-teal-500 p-5 text-white shadow-lg">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/10" />
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-white">
                          <span className="inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-white/70" />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">Happening Now</p>
                      </div>
                      <h2 className="mt-2 text-2xl font-heading font-black">{currentClass.subject}</h2>
                      <p className="mt-1 text-sm font-medium text-emerald-100">
                        {currentClass.day} · {formatTimeRange(currentClass)}
                      </p>
                      {currentClass.teacher_name ? (
                        <p className="mt-0.5 text-sm text-emerald-200">with {currentClass.teacher_name}</p>
                      ) : null}
                      {currentClass.class_name ? (
                        <p className="mt-0.5 text-xs text-emerald-200">{currentClass.class_name}</p>
                      ) : null}
                      {currentClass.link ? (
                        <a
                          href={currentClass.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-emerald-700 shadow hover:bg-emerald-50"
                        >
                          Join Class →
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">No class right now</p>
                      <p className="mt-1 text-xs text-slate-400">{isWeekend ? "Enjoy your weekend!" : "Check your next class →"}</p>
                    </div>
                  </div>
                )}

                {/* UP NEXT tile */}
                {nextClass ? (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-400 to-amber-400 p-5 text-white shadow-lg">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/10" />
                    <div className="relative">
                      <p className="text-xs font-bold uppercase tracking-widest text-orange-100">Up Next</p>
                      <h2 className="mt-2 text-2xl font-heading font-black">{nextClass.subject}</h2>
                      <p className="mt-1 text-sm font-medium text-orange-100">
                        {nextClass.day} · {formatTimeRange(nextClass)}
                      </p>
                      {nextClass.teacher_name ? (
                        <p className="mt-0.5 text-sm text-orange-200">with {nextClass.teacher_name}</p>
                      ) : null}
                      {nextClass.class_name ? (
                        <p className="mt-0.5 text-xs text-orange-200">{nextClass.class_name}</p>
                      ) : null}
                      <p className="mt-3 text-xs font-semibold text-orange-100">Join button will appear when this class becomes active.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-500">No upcoming classes this week</p>
                  </div>
                )}
              </section>
            ) : null}

            {/* Timetable table */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-cyan-600 to-sky-600 px-4 py-4 text-white md:px-5">
                <h2 className="text-lg font-bold md:text-xl">{selectedView === "day" ? `${selectedDay} Timetable` : "Weekly Timetable"}</h2>
                <p className="text-sm text-cyan-50">
                  {selectedClass?.name ?? "Selected class"}
                </p>
              </div>

              {schedule.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-slate-600">No classes scheduled for this class.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-4 md:hidden">
                    {schedule.map((entry) => {
                      const isCurrent = currentClass?.id === entry.id;
                      const isNext = !isCurrent && nextClass?.id === entry.id;
                      return (
                        <article
                          key={entry.id}
                          className={`rounded-xl border p-3 ${
                            isCurrent
                              ? "border-emerald-300 bg-emerald-50"
                              : isNext
                              ? "border-orange-300 bg-orange-50"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{entry.day}</p>
                              <h3 className={`text-base font-bold ${entry.is_cancelled ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                {entry.subject}
                              </h3>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{formatTimeRange(entry)}</p>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {isCurrent ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">NOW</span> : null}
                            {isNext ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">NEXT</span> : null}
                            {entry.is_cancelled ? (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">Cancelled</span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">On Schedule</span>
                            )}
                          </div>

                          <div className="mt-3 space-y-1 text-xs text-slate-600">
                            <p>Class: {entry.class_name ?? selectedClass?.name ?? "-"}</p>
                            <p>Teacher: {entry.teacher_name ?? "-"}</p>
                            {entry.cancel_reason ? <p className="text-rose-600">Reason: {entry.cancel_reason}</p> : null}
                          </div>

                          <div className="mt-3">
                            {entry.link && isCurrent && !entry.is_cancelled ? (
                              <Button asChild size="sm" className="w-full rounded-full bg-orange-500 hover:bg-orange-600">
                                <a href={entry.link} target="_blank" rel="noreferrer">Join Class</a>
                              </Button>
                            ) : (
                              <p className="text-xs text-slate-400">Join is available only during active class time.</p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
                          <th className="px-5 py-3">Day</th>
                          <th className="px-5 py-3">Time</th>
                          <th className="px-5 py-3">Subject</th>
                          <th className="px-5 py-3">Class</th>
                          <th className="px-5 py-3">Teacher</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map((entry, index) => {
                          const isCurrent = currentClass?.id === entry.id;
                          const isNext = !isCurrent && nextClass?.id === entry.id;
                          const rowBg = isCurrent
                            ? "bg-emerald-50 border-l-4 border-l-emerald-500"
                            : isNext
                            ? "bg-orange-50 border-l-4 border-l-orange-400"
                            : index % 2 === 0
                            ? "bg-white"
                            : "bg-cyan-50/40";
                          return (
                            <tr key={entry.id} className={`${rowBg} border-t border-slate-100`}>
                              <td className="px-5 py-4 text-sm font-medium text-slate-700">
                                {isCurrent ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-500"><span className="inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400" /></span>
                                    {entry.day}
                                  </span>
                                ) : isNext ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                                    {entry.day}
                                  </span>
                                ) : entry.day}
                              </td>
                              <td className="px-5 py-4 text-sm font-bold text-slate-900">{formatTimeRange(entry)}</td>
                              <td className={`px-5 py-4 text-sm ${entry.is_cancelled ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                {entry.subject}
                                {isCurrent ? <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">NOW</span> : null}
                                {isNext ? <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">NEXT</span> : null}
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-700">{entry.class_name ?? selectedClass?.name ?? "-"}</td>
                              <td className="px-5 py-4 text-sm text-slate-700">{entry.teacher_name ?? "-"}</td>
                              <td className="px-5 py-4 text-sm">
                                {entry.is_cancelled ? (
                                  <div>
                                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Cancelled</span>
                                    {entry.cancel_reason ? <p className="mt-1 text-xs text-rose-600">{entry.cancel_reason}</p> : null}
                                  </div>
                                ) : (
                                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">On Schedule</span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-center">
                                {entry.link && isCurrent && !entry.is_cancelled ? (
                                  <Button asChild size="sm" className="rounded-full bg-orange-500 px-5 hover:bg-orange-600">
                                    <a href={entry.link} target="_blank" rel="noreferrer">Join Class</a>
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400">Available only when class is active</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
