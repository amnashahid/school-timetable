import Link from "next/link";
import { addTeacherTimetableEntry, getAllClasses, getAllSubjects, getAllTeachers, getWeeklySchedule } from "../action";
import { Button } from "@/components/ui/button";
import { WEEK_DAYS, type WeekDay } from "@/lib/timetable";

export const dynamic = "force-dynamic";

type TeacherSearchParams = {
  teacherId?: string;
  day?: string;
  classId?: string;
  addStatus?: string;
  addReason?: string;
};

function toValidDay(value: string | undefined) {
  if (!value) return "";
  return WEEK_DAYS.includes(value as WeekDay) ? (value as WeekDay) : "";
}

function addStatusMessage(status: string | undefined, reason: string | undefined) {
  if (!status) return null;
  if (status === "saved") return { msg: "Timetable entry added successfully.", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (status === "missing-fields") return { msg: "Please fill all required fields.", tone: "border-amber-200 bg-amber-50 text-amber-700" };
  if (status === "missing-config") return { msg: "Supabase config is missing.", tone: "border-rose-200 bg-rose-50 text-rose-700" };
  if (status === "error") return { msg: `Failed to add entry: ${reason ? decodeURIComponent(reason) : "Unknown error"}`, tone: "border-rose-200 bg-rose-50 text-rose-700" };
  return null;
}

export default async function TeacherDashboard({ searchParams }: { searchParams: Promise<TeacherSearchParams> }) {
  const params = await searchParams;
  const teachers = await getAllTeachers();
  const classes = await getAllClasses();
  const subjects = await getAllSubjects();

  const selectedTeacherId = params.teacherId ?? "";
  const selectedDay = toValidDay(params.day);
  const selectedClassId = params.classId ?? "";

  const allClassIds = classes.map((item) => item.id);
  const allEntries = selectedTeacherId ? await getWeeklySchedule(allClassIds, selectedDay) : [];
  const schedule = allEntries.filter((entry) => {
    if (entry.teacher_id !== selectedTeacherId) return false;
    if (selectedClassId && entry.class_id !== selectedClassId) return false;
    return true;
  });

  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId);
  const classCount = new Set(schedule.map((entry) => entry.class_id)).size;

  const addAlert = addStatusMessage(params.addStatus, params.addReason);

  function formatTimeRange(start: string, end: string | null) {
    const startTime = start.slice(0, 5);
    const endTime = end?.slice(0, 5);
    return endTime ? `${startTime} - ${endTime}` : startTime;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(125deg,#eef2ff_0%,#ffffff_48%,#ecfeff_100%)]">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">

        {/* Header */}
        <section className="rounded-3xl border border-sky-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Teacher Workspace</p>
              <h1 className="text-3xl font-heading font-black text-slate-900">Teacher Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">View your classes by day, add new entries, and quickly access Zoom details.</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link href="/admin">Admin Dashboard</Link></Button>
              <Button asChild variant="outline"><Link href="/">Student View</Link></Button>
            </div>
          </div>

          {/* Filter form */}
          <form className="mt-5 grid gap-4 md:grid-cols-4">
            <div>
              <label htmlFor="teacherId" className="mb-2 block text-sm font-semibold text-slate-700">Teacher</label>
              <select
                id="teacherId"
                name="teacherId"
                defaultValue={selectedTeacherId}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="day" className="mb-2 block text-sm font-semibold text-slate-700">Day</label>
              <select
                id="day"
                name="day"
                defaultValue={selectedDay}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
              >
                <option value="">All days</option>
                {WEEK_DAYS.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="classId" className="mb-2 block text-sm font-semibold text-slate-700">Class</label>
              <select
                id="classId"
                name="classId"
                defaultValue={selectedClassId}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
              >
                <option value="">All classes</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit" className="h-11 w-full bg-sky-600 hover:bg-sky-700">Show Schedule</Button>
            </div>
          </form>
        </section>

        {addAlert ? (
          <p className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${addAlert.tone}`}>{addAlert.msg}</p>
        ) : null}

        {!selectedTeacherId ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-700">Select a teacher above to view their schedule and add new entries.</p>
          </section>
        ) : (
          <>
            {/* Add Entry form */}
            <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Add Timetable Entry</h2>
              <p className="mt-1 text-sm text-slate-500">
                Adding as: <strong className="text-sky-700">{selectedTeacher?.name ?? "Unknown"}</strong>
              </p>
              <form action={addTeacherTimetableEntry} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <input type="hidden" name="teacher_id" value={selectedTeacherId} />

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Class *</label>
                  <select name="class_id" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                    <option value="">Select class</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Subject *</label>
                  <select name="subject" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Day *</label>
                  <select name="day" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                    <option value="">Select day</option>
                    {WEEK_DAYS.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Start Time *</label>
                  <input name="start_time" type="time" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">End Time *</label>
                  <input name="end_time" type="time" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Zoom Link</label>
                  <input name="link" placeholder="https://zoom.us/j/..." className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Zoom ID</label>
                  <input name="zoom_id" placeholder="Meeting ID" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Passcode</label>
                  <input name="password" placeholder="Passcode" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </div>

                <div className="flex items-end lg:col-span-2">
                  <Button type="submit" className="bg-sky-600 hover:bg-sky-700">Add Entry</Button>
                </div>
              </form>
            </section>

            {/* Schedule table */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedTeacher?.name ?? "Teacher"} — Schedule
                </h2>
                <div className="flex items-center gap-3">
                  {selectedDay ? (
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{selectedDay}</span>
                  ) : null}
                  {selectedClassId ? (
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                      {classes.find(c => c.id === selectedClassId)?.name ?? selectedClassId}
                    </span>
                  ) : null}
                  <p className="text-sm text-slate-500">{classCount} class{classCount !== 1 ? "es" : ""} · {schedule.length} entr{schedule.length !== 1 ? "ies" : "y"}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2">Day</th>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Zoom</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">{entry.day}</span>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{formatTimeRange(entry.start_time, entry.end_time)}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{entry.class_name ?? "—"}</td>
                        <td className={`px-3 py-2 ${entry.is_cancelled ? "text-slate-400 line-through" : "text-slate-800"}`}>{entry.subject}</td>
                        <td className="px-3 py-2">
                          {entry.is_cancelled ? (
                            <div>
                              <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Cancelled</span>
                              {entry.cancel_reason ? <p className="mt-1 text-xs text-rose-500">{entry.cancel_reason}</p> : null}
                            </div>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {entry.zoom_id || entry.password || entry.link ? (
                            <>
                              {entry.zoom_id ? <div>ID: {entry.zoom_id}</div> : null}
                              {entry.password ? <div>Pass: {entry.password}</div> : null}
                              {entry.link ? <a className="text-sky-600 hover:underline" href={entry.link} target="_blank" rel="noreferrer">Open Zoom</a> : null}
                            </>
                          ) : (
                            <span className="text-slate-400">No zoom details</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {schedule.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">No entries found for the selected filters.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
