import Link from "next/link";
import {
  cancelTimetableEntry,
  createClass,
  createSubject,
  createTeacher,
  createTimetableEntry,
  deleteClass,
  deleteSubject,
  deleteTeacher,
  deleteTimetableEntry,
  getAllClasses,
  getAllSubjects,
  getAllTeachers,
  getWeeklySchedule,
  logoutAdmin,
  resumeTimetableEntry,
  updateClass,
  updateSubject,
  updateTeacher,
  updateTimetableEntry,
} from "../action";
import { Button } from "@/components/ui/button";
import { WEEK_DAYS, type WeekDay } from "@/lib/timetable";

export const dynamic = "force-dynamic";

type AdminPageParams = {
  menu?: "overview" | "teachers" | "classes" | "subjects" | "timetable";
  classFilter?: string;
  dayFilter?: string;
  teacherFilter?: string;
  teacherStatus?: string;
  teacherReason?: string;
  classStatus?: string;
  classReason?: string;
  subjectStatus?: string;
  subjectReason?: string;
  scheduleStatus?: string;
  scheduleReason?: string;
  cancelStatus?: string;
  cancelReason?: string;
};

function toValidDay(value: string | undefined): WeekDay | "" {
  if (!value) return "";
  return WEEK_DAYS.includes(value as WeekDay) ? (value as WeekDay) : "";
}

function statusMessage(status: string | undefined, reason: string | undefined, entity: string) {
  if (!status) return null;
  if (status === "saved") return `${entity} saved successfully.`;
  if (status === "updated") return `${entity} updated successfully.`;
  if (status === "deleted") return `${entity} deleted successfully.`;
  if (status === "cancelled") return "Entry marked as cancelled.";
  if (status === "resumed") return "Cancelled entry resumed.";
  if (status === "missing-config") return "Supabase config is missing.";
  if (status === "missing-name" || status === "missing-fields") return "Please fill all required fields.";
  if (status === "error") return `${entity} failed: ${reason ? decodeURIComponent(reason) : "Unknown error"}`;
  return null;
}

function statusTone(status: string | undefined) {
  if (status === "error") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "cancelled") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "resumed") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "saved" || status === "updated" || status === "deleted") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

const inputCls = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none";
const smallInputCls = "h-8 w-full rounded-md border border-slate-300 px-2 text-xs text-slate-900 focus:border-cyan-400 focus:outline-none";

export default async function AdminPage({ searchParams }: { searchParams: Promise<AdminPageParams> }) {
  const params = await searchParams;
  const menu = params.menu ?? "overview";

  const teachers = await getAllTeachers();
  const classes = await getAllClasses();
  const subjects = await getAllSubjects();
  const weeklyEntries = await getWeeklySchedule(classes.map((c) => c.id));
  const cancelledCount = weeklyEntries.filter((e) => e.is_cancelled).length;
  const activeCount = weeklyEntries.length - cancelledCount;

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
  const todayName = DAY_NAMES[new Date().getDay()];
  const todayEntries = WEEK_DAYS.includes(todayName as WeekDay)
    ? weeklyEntries.filter((e) => e.day === todayName)
    : [];

  // Timetable filter state
  const selectedClassId = params.classFilter ?? "";
  const selectedDayFilter = toValidDay(params.dayFilter);
  const selectedTeacherFilter = params.teacherFilter ?? "";
  const hasViewFilter = !!(selectedClassId || selectedDayFilter || selectedTeacherFilter);
  const viewClassIds = selectedClassId ? [selectedClassId] : classes.map((c) => c.id);
  const rawTimetable = hasViewFilter ? await getWeeklySchedule(viewClassIds, selectedDayFilter) : [];
  const timetable = selectedTeacherFilter
    ? rawTimetable.filter((e) => e.teacher_id === selectedTeacherFilter)
    : rawTimetable;

  // Status messages
  const teacherMsg = statusMessage(params.teacherStatus, params.teacherReason, "Teacher");
  const classMsg = statusMessage(params.classStatus, params.classReason, "Class");
  const subjectMsg = statusMessage(params.subjectStatus, params.subjectReason, "Subject");
  const scheduleMsg = statusMessage(params.scheduleStatus, params.scheduleReason, "Timetable entry");
  const cancelMsg = statusMessage(params.cancelStatus, params.cancelReason, "Timetable status");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "teachers", label: "Teachers" },
    { id: "classes", label: "Classes" },
    { id: "subjects", label: "Subjects" },
    { id: "timetable", label: "Timetable" },
  ] as const;

  function formatTimeRange(start: string, end: string | null) {
    const startTime = start.slice(0, 5);
    const endTime = end?.slice(0, 5);
    return endTime ? `${startTime} - ${endTime}` : startTime;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(130deg,#f0f9ff_0%,#fff7ed_55%,#ecfeff_100%)]">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">

        {/* â”€â”€ Header â”€â”€ */}
        <div className="rounded-3xl border border-cyan-200 bg-white/90 p-5 shadow-xl backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Control Center</p>
              <h1 className="text-3xl font-heading font-black text-slate-900">Admin Dashboard</h1>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="bg-white"><Link href="/">Student View</Link></Button>
              <form action={logoutAdmin}>
                <Button type="submit" variant="outline" className="bg-white">Logout</Button>
              </form>
            </div>
          </div>

          {/* â”€â”€ Stats â”€â”€ */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Teachers</p>
              <p className="mt-1 text-3xl font-heading font-bold text-sky-900">{teachers.length}</p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Classes</p>
              <p className="mt-1 text-3xl font-heading font-bold text-violet-900">{classes.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Subjects</p>
              <p className="mt-1 text-3xl font-heading font-bold text-amber-900">{subjects.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Active</p>
              <p className="mt-1 text-3xl font-heading font-bold text-emerald-900">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Cancelled</p>
              <p className="mt-1 text-3xl font-heading font-bold text-rose-900">{cancelledCount}</p>
            </div>
          </div>

          {/* â”€â”€ Tab nav â”€â”€ */}
          <nav className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={`/admin?menu=${tab.id}`}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  menu === tab.id
                    ? "bg-cyan-600 text-white shadow"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• OVERVIEW â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {menu === "overview" ? (
          <div className="space-y-5">
            {/* Today at a glance */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Today at a Glance</h2>
                  <p className="text-sm text-slate-500">{todayName} - {todayEntries.length} session{todayEntries.length !== 1 ? "s" : ""}</p>
                </div>
                <Link href={`/admin?menu=timetable&dayFilter=${todayName}`} className="text-sm font-medium text-cyan-600 hover:underline">
                  Search {todayName} -&gt;
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Class</th>
                      <th className="px-3 py-2 text-left">Teacher</th>
                      <th className="px-3 py-2 text-left">Subject</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayEntries.length > 0 ? todayEntries.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="px-3 py-2 tabular-nums font-medium text-slate-800">{formatTimeRange(e.start_time, e.end_time)}</td>
                        <td className="px-3 py-2">{e.class_name ?? "-"}</td>
                        <td className="px-3 py-2">{e.teacher_name ?? "-"}</td>
                        <td className="px-3 py-2">{e.subject}</td>
                        <td className="px-3 py-2">
                          {e.is_cancelled
                            ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Cancelled</span>
                            : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-500">
                        {WEEK_DAYS.includes(todayName as WeekDay) ? "No sessions today." : "No school today (weekend)."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent entries */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">All Timetable Entries</h2>
                <Link href="/admin?menu=timetable" className="text-sm font-medium text-cyan-600 hover:underline">Manage -&gt;</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2 text-left">Day</th>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Class</th>
                      <th className="px-3 py-2 text-left">Teacher</th>
                      <th className="px-3 py-2 text-left">Subject</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyEntries.slice(0, 12).map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="px-3 py-2"><span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">{e.day}</span></td>
                        <td className="px-3 py-2 tabular-nums">{formatTimeRange(e.start_time, e.end_time)}</td>
                        <td className="px-3 py-2">{e.class_name ?? "-"}</td>
                        <td className="px-3 py-2">{e.teacher_name ?? "-"}</td>
                        <td className="px-3 py-2">{e.subject}</td>
                        <td className="px-3 py-2">
                          {e.is_cancelled
                            ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Cancelled</span>
                            : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>}
                        </td>
                      </tr>
                    ))}
                    {weeklyEntries.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-500">No entries yet.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TEACHERS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {menu === "teachers" ? (
          <section className="space-y-4">
            {teacherMsg ? <p className={`rounded-lg border px-3 py-2 text-sm ${statusTone(params.teacherStatus)}`}>{teacherMsg}</p> : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Add Teacher</h2>
                <form action={createTeacher} className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Name *</label>
                    <input name="name" required placeholder="Teacher name" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
                    <input name="email" type="email" placeholder="email@school.com" className={inputCls} />
                  </div>
                  <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Save Teacher</Button>
                </form>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Teacher List ({teachers.length})</h2>
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {teachers.map((t) => (
                    <div key={t.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <form action={updateTeacher} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <input type="hidden" name="id" value={t.id} />
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Name</label>
                          <input name="name" defaultValue={t.name} className={smallInputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Email</label>
                          <input name="email" defaultValue={t.email ?? ""} className={smallInputCls} />
                        </div>
                        <Button type="submit" size="sm">Update</Button>
                      </form>
                      <form action={deleteTeacher} className="mt-2">
                        <input type="hidden" name="id" value={t.id} />
                        <Button type="submit" size="sm" variant="outline" className="text-rose-600 hover:border-rose-300 hover:bg-rose-50">Delete</Button>
                      </form>
                    </div>
                  ))}
                  {teachers.length === 0 ? <p className="text-sm text-slate-500">No teachers yet.</p> : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• CLASSES â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {menu === "classes" ? (
          <section className="space-y-4">
            {classMsg ? <p className={`rounded-lg border px-3 py-2 text-sm ${statusTone(params.classStatus)}`}>{classMsg}</p> : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Add Class</h2>
                <form action={createClass} className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Class Name *</label>
                    <input name="name" required placeholder="e.g. Grade 5A" className={inputCls} />
                  </div>
                  <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Save Class</Button>
                </form>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Class List ({classes.length})</h2>
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {classes.map((cls) => (
                    <div key={cls.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <form action={updateClass} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                        <input type="hidden" name="id" value={cls.id} />
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Name</label>
                          <input name="name" defaultValue={cls.name} className={smallInputCls} />
                        </div>
                        <Button type="submit" size="sm">Update</Button>
                      </form>
                      <form action={deleteClass} className="mt-2">
                        <input type="hidden" name="id" value={cls.id} />
                        <Button type="submit" size="sm" variant="outline" className="text-rose-600 hover:border-rose-300 hover:bg-rose-50">Delete</Button>
                      </form>
                    </div>
                  ))}
                  {classes.length === 0 ? <p className="text-sm text-slate-500">No classes yet.</p> : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SUBJECTS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {menu === "subjects" ? (
          <section className="space-y-4">
            {subjectMsg ? <p className={`rounded-lg border px-3 py-2 text-sm ${statusTone(params.subjectStatus)}`}>{subjectMsg}</p> : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Add Subject</h2>
                <form action={createSubject} className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Subject Name *</label>
                    <input name="name" required placeholder="e.g. Mathematics" className={inputCls} />
                  </div>
                  <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Save Subject</Button>
                </form>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Subject List ({subjects.length})</h2>
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {subjects.map((s) => (
                    <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <form action={updateSubject} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                        <input type="hidden" name="id" value={s.id} />
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Name</label>
                          <input name="name" defaultValue={s.name} className={smallInputCls} />
                        </div>
                        <Button type="submit" size="sm">Update</Button>
                      </form>
                      <form action={deleteSubject} className="mt-2">
                        <input type="hidden" name="id" value={s.id} />
                        <Button type="submit" size="sm" variant="outline" className="text-rose-600 hover:border-rose-300 hover:bg-rose-50">Delete</Button>
                      </form>
                    </div>
                  ))}
                  {subjects.length === 0 ? <p className="text-sm text-slate-500">No subjects yet.</p> : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TIMETABLE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {menu === "timetable" ? (
          <section className="space-y-4">
            {scheduleMsg ? <p className={`rounded-lg border px-3 py-2 text-sm ${statusTone(params.scheduleStatus)}`}>{scheduleMsg}</p> : null}
            {cancelMsg ? <p className={`rounded-lg border px-3 py-2 text-sm ${statusTone(params.cancelStatus)}`}>{cancelMsg}</p> : null}

            {/* Search bar */}
            <article className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Search Timetable</h2>
              <p className="mt-1 text-sm text-slate-500">Filter by class, day, or teacher - any combination.</p>
              <form className="mt-4 grid gap-3 items-end md:grid-cols-4">
                <input type="hidden" name="menu" value="timetable" />
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Class</label>
                  <select name="classFilter" defaultValue={selectedClassId} className={inputCls}>
                    <option value="">All classes</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Day</label>
                  <select name="dayFilter" defaultValue={selectedDayFilter} className={inputCls}>
                    <option value="">All days</option>
                    {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Teacher</label>
                  <select name="teacherFilter" defaultValue={selectedTeacherFilter} className={inputCls}>
                    <option value="">All teachers</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">Search</Button>
                  <Button asChild variant="outline"><a href="/admin?menu=timetable">Clear</a></Button>
                </div>
              </form>
              {hasViewFilter && (
                <p className="mt-3 text-xs text-slate-500">
                  <strong>{timetable.length}</strong> entr{timetable.length === 1 ? "y" : "ies"} found
                  {selectedClassId ? ` | ${classes.find(c => c.id === selectedClassId)?.name}` : ""}
                  {selectedDayFilter ? ` | ${selectedDayFilter}` : ""}
                  {selectedTeacherFilter ? ` | ${teachers.find(t => t.id === selectedTeacherFilter)?.name}` : ""}
                </p>
              )}
            </article>

            {/* Add entry */}
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Add Timetable Entry</h2>
              {!selectedClassId ? (
                <p className="mt-3 text-sm text-slate-500">Choose a <strong>class</strong> in the search above first to enable adding entries for that class.</p>
              ) : (
                <form action={createTimetableEntry} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <input type="hidden" name="class_id" value={selectedClassId} />
                  <input type="hidden" name="classFilter" value={selectedClassId} />
                  <input type="hidden" name="dayFilter" value={selectedDayFilter} />
                  <input type="hidden" name="teacherFilter" value={selectedTeacherFilter} />
                  <div className="sm:col-span-2 lg:col-span-4 rounded-lg bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800">
                    Adding for: <strong>{classes.find(c => c.id === selectedClassId)?.name}</strong>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Subject *</label>
                    <select name="subject" required className={inputCls}>
                      <option value="">Select subject</option>
                      {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Teacher</label>
                    <select name="teacher_id" className={inputCls}>
                      <option value="">No teacher</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Day *</label>
                    <select name="day" required className={inputCls}>
                      <option value="">Select day</option>
                      {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Start Time *</label>
                    <input name="start_time" type="time" required className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">End Time *</label>
                    <input name="end_time" type="time" required className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Zoom Link</label>
                    <input name="link" placeholder="https://zoom.us/j/..." className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Zoom ID</label>
                    <input name="zoom_id" placeholder="Meeting ID" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Passcode</label>
                    <input name="password" placeholder="Passcode" className={inputCls} />
                  </div>
                  <div className="flex items-end sm:col-span-2 lg:col-span-1">
                    <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700">Add Entry</Button>
                  </div>
                </form>
              )}
            </article>

            {/* Results */}
            {hasViewFilter ? (
              <article className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <h2 className="text-base font-semibold text-slate-900">Timetable Entries</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 text-left">Class</th>
                        <th className="px-4 py-3 text-left">Day</th>
                        <th className="px-4 py-3 text-left">Time</th>
                        <th className="px-4 py-3 text-left">Subject</th>
                        <th className="px-4 py-3 text-left">Teacher</th>
                        <th className="px-4 py-3 text-left">Zoom</th>
                        <th className="px-4 py-3 text-left">Status / Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {timetable.map((entry) => (
                        <tr key={entry.id} className="align-top hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-medium text-slate-800">{entry.class_name ?? "-"}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">{entry.day}</span>
                          </td>
                          <td className="px-4 py-3 tabular-nums font-semibold text-slate-900">{formatTimeRange(entry.start_time, entry.end_time)}</td>
                          <td className={`px-4 py-3 ${entry.is_cancelled ? "text-slate-400 line-through" : "text-slate-800"}`}>{entry.subject}</td>
                          <td className="px-4 py-3 text-slate-600">{entry.teacher_name ?? <span className="text-slate-400 italic">No teacher</span>}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 space-y-0.5">
                            {entry.zoom_id ? <div>ID: {entry.zoom_id}</div> : null}
                            {entry.password ? <div>Pass: {entry.password}</div> : null}
                            {entry.link ? <a className="block text-sky-600 hover:underline" href={entry.link} target="_blank" rel="noreferrer">Open link</a> : null}
                            {!entry.zoom_id && !entry.password && !entry.link ? <span className="text-slate-400">-</span> : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1.5">
                              {/* Status + cancel/resume */}
                              {entry.is_cancelled ? (
                                <div>
                                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Cancelled</span>
                                  {entry.cancel_reason ? <p className="mt-0.5 text-xs text-rose-500">{entry.cancel_reason}</p> : null}
                                  <form action={resumeTimetableEntry} className="mt-1">
                                    <input type="hidden" name="entry_id" value={entry.id} />
                                    <input type="hidden" name="classFilter" value={selectedClassId} />
                                    <input type="hidden" name="dayFilter" value={selectedDayFilter} />
                                    <input type="hidden" name="teacherFilter" value={selectedTeacherFilter} />
                                    <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">Resume</Button>
                                  </form>
                                </div>
                              ) : (
                                <div>
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
                                  <form action={cancelTimetableEntry} className="mt-1 flex gap-1">
                                    <input type="hidden" name="entry_id" value={entry.id} />
                                    <input type="hidden" name="classFilter" value={selectedClassId} />
                                    <input type="hidden" name="dayFilter" value={selectedDayFilter} />
                                    <input type="hidden" name="teacherFilter" value={selectedTeacherFilter} />
                                    <input name="cancel_reason" placeholder="Reason" className="h-7 w-24 rounded-md border border-slate-300 px-2 text-xs" />
                                    <Button type="submit" size="sm" className="h-7 bg-rose-600 hover:bg-rose-700 text-xs">Cancel</Button>
                                  </form>
                                </div>
                              )}

                              {/* Edit details toggle */}
                              <details className="group">
                                <summary className="mt-1 cursor-pointer list-none text-xs font-semibold text-cyan-600 hover:text-cyan-800">
                                  Edit details
                                </summary>
                                <form action={updateTimetableEntry} className="mt-2 grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <input type="hidden" name="id" value={entry.id} />
                                  <input type="hidden" name="class_id" value={entry.class_id} />
                                  <input type="hidden" name="classFilter" value={selectedClassId} />
                                  <input type="hidden" name="dayFilter" value={selectedDayFilter} />
                                  <input type="hidden" name="teacherFilter" value={selectedTeacherFilter} />
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">Subject</label>
                                      <select name="subject" defaultValue={entry.subject} className={smallInputCls} required>
                                        {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">Teacher</label>
                                      <select name="teacher_id" defaultValue={entry.teacher_id ?? ""} className={smallInputCls}>
                                        <option value="">No teacher</option>
                                        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">Day</label>
                                      <select name="day" defaultValue={entry.day} className={smallInputCls} required>
                                        {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">Time</label>
                                      <input name="start_time" defaultValue={entry.start_time.slice(0, 5)} className={smallInputCls} required />
                                    </div>
                                    <div>
                                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">End Time</label>
                                      <input name="end_time" defaultValue={entry.end_time?.slice(0, 5) ?? ""} className={smallInputCls} required />
                                    </div>
                                    <div>
                                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">Zoom ID</label>
                                      <input name="zoom_id" defaultValue={entry.zoom_id ?? ""} placeholder="Meeting ID" className={smallInputCls} />
                                    </div>
                                    <div>
                                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">Passcode</label>
                                      <input name="password" defaultValue={entry.password ?? ""} placeholder="Pass" className={smallInputCls} />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">Zoom Link</label>
                                    <input name="link" defaultValue={entry.link ?? ""} placeholder="https://zoom.us/j/..." className={smallInputCls} />
                                  </div>
                                  <Button type="submit" size="sm" className="mt-1 h-7 w-full bg-cyan-600 hover:bg-cyan-700 text-xs">Save Changes</Button>
                                </form>
                              </details>

                              {/* Delete */}
                              <form action={deleteTimetableEntry}>
                                <input type="hidden" name="id" value={entry.id} />
                                <input type="hidden" name="classFilter" value={selectedClassId} />
                                <input type="hidden" name="dayFilter" value={selectedDayFilter} />
                                <input type="hidden" name="teacherFilter" value={selectedTeacherFilter} />
                                <Button type="submit" size="sm" variant="outline" className="h-7 w-full text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50">Delete</Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {timetable.length === 0 ? (
                        <tr><td colSpan={7} className="py-10 text-center text-slate-500">No entries match the selected filters.</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>
            ) : null}
          </section>
        ) : null}

      </div>
    </main>
  );
}

