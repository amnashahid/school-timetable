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
  resumeTimetableEntry,
  updateClass,
  updateSubject,
  updateTeacher,
  updateTimetableEntry,
} from "../../action";
import { Button } from "@/components/ui/button";
import { WEEK_DAYS, type WeekDay } from "@/lib/timetable";

export const dynamic = "force-dynamic";

type AdminSearchParams = {
  menu?: "teachers" | "classes" | "subjects" | "timetable";
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
  if (status === "cancelled") return "Class marked as cancelled.";
  if (status === "resumed") return "Cancelled class resumed successfully.";
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

export default async function AdminManagePage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const params = await searchParams;
  const menu = params.menu ?? "teachers";
  const selectedClassId = params.classFilter ?? "";
  const selectedDayFilter = toValidDay(params.dayFilter);
  const selectedTeacherFilter = params.teacherFilter ?? "";

  const teachers = await getAllTeachers();
  const classes = await getAllClasses();
  const subjects = await getAllSubjects();

  // View: fetch when any filter is set; no filter → show no entries until user searches
  const hasViewFilter = !!(selectedClassId || selectedDayFilter || selectedTeacherFilter);
  const viewClassIds = selectedClassId ? [selectedClassId] : classes.map((c) => c.id);
  const rawTimetable = hasViewFilter ? await getWeeklySchedule(viewClassIds, selectedDayFilter) : [];
  const timetable = selectedTeacherFilter
    ? rawTimetable.filter((e) => e.teacher_id === selectedTeacherFilter)
    : rawTimetable;

  const teacherMsg = statusMessage(params.teacherStatus, params.teacherReason, "Teacher");
  const classMsg = statusMessage(params.classStatus, params.classReason, "Class");
  const subjectMsg = statusMessage(params.subjectStatus, params.subjectReason, "Subject");
  const scheduleMsg = statusMessage(params.scheduleStatus, params.scheduleReason, "Timetable entry");
  const cancelMsg = statusMessage(params.cancelStatus, params.cancelReason, "Timetable status");

  function formatTimeRange(start: string, end: string | null) {
    const startTime = start.slice(0, 5);
    const endTime = end?.slice(0, 5);
    return endTime ? `${startTime} - ${endTime}` : startTime;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0f9ff_0%,#ffffff_42%,#fff7ed_100%)]">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <section className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Admin Workspace</p>
              <h1 className="text-3xl font-heading font-black text-slate-900">Management Panel</h1>
              <p className="mt-1 text-sm text-slate-600">Switch between Teachers, Classes, and Timetable menus.</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link href="/admin">Dashboard</Link></Button>
              <Button asChild variant="outline"><Link href="/teacher">Teacher View</Link></Button>
              <Button asChild variant="outline"><Link href="/">Student View</Link></Button>
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant={menu === "teachers" ? "default" : "outline"}><Link href="/admin/manage?menu=teachers">Teachers</Link></Button>
            <Button asChild variant={menu === "classes" ? "default" : "outline"}><Link href="/admin/manage?menu=classes">Classes</Link></Button>
            <Button asChild variant={menu === "subjects" ? "default" : "outline"}><Link href="/admin/manage?menu=subjects">Subjects</Link></Button>
            <Button asChild variant={menu === "timetable" ? "default" : "outline"}><Link href="/admin/manage?menu=timetable">Timetable</Link></Button>
          </nav>
        </section>

        {menu === "teachers" ? (
          <section className="space-y-4">
            {teacherMsg ? <p className={`rounded-lg border px-3 py-2 text-sm ${statusTone(params.teacherStatus)}`}>{teacherMsg}</p> : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Add Teacher</h2>
                <form action={createTeacher} className="mt-4 space-y-3">
                  <input name="name" required placeholder="Teacher name" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                  <input name="email" type="email" placeholder="Teacher email" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                  <Button type="submit">Save Teacher</Button>
                </form>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Teacher List</h2>
                <div className="mt-4 space-y-3">
                  {teachers.map((teacher) => (
                    <div key={teacher.id} className="rounded-xl border border-slate-200 p-3">
                      <form action={updateTeacher} className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
                        <input type="hidden" name="id" value={teacher.id} />
                        <input name="name" defaultValue={teacher.name} className="rounded-md border border-slate-300 px-2 py-1.5" />
                        <input name="email" defaultValue={teacher.email ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5" />
                        <Button type="submit" size="sm">Update</Button>
                      </form>
                      <form action={deleteTeacher} className="mt-2">
                        <input type="hidden" name="id" value={teacher.id} />
                        <Button type="submit" size="sm" variant="outline">Delete</Button>
                      </form>
                    </div>
                  ))}
                  {teachers.length === 0 ? <p className="text-sm text-slate-500">No teachers yet.</p> : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {menu === "classes" ? (
          <section className="space-y-4">
            {classMsg ? <p className={`rounded-lg border px-3 py-2 text-sm ${statusTone(params.classStatus)}`}>{classMsg}</p> : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Add Class</h2>
                <p className="mt-1 text-sm text-slate-600">Class is created independently and does not attach a teacher.</p>
                <form action={createClass} className="mt-4 space-y-3">
                  <input name="name" required placeholder="Class name" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                  <Button type="submit">Save Class</Button>
                </form>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Class List</h2>
                <div className="mt-4 space-y-3">
                  {classes.map((cls) => (
                    <div key={cls.id} className="rounded-xl border border-slate-200 p-3">
                      <form action={updateClass} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                        <input type="hidden" name="id" value={cls.id} />
                        <input name="name" defaultValue={cls.name} className="rounded-md border border-slate-300 px-2 py-1.5" />
                        <Button type="submit" size="sm">Update</Button>
                      </form>
                      <form action={deleteClass} className="mt-2">
                        <input type="hidden" name="id" value={cls.id} />
                        <Button type="submit" size="sm" variant="outline">Delete</Button>
                      </form>
                    </div>
                  ))}
                  {classes.length === 0 ? <p className="text-sm text-slate-500">No classes yet.</p> : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {menu === "subjects" ? (
          <section className="space-y-4">
            {subjectMsg ? <p className={`rounded-lg border px-3 py-2 text-sm ${statusTone(params.subjectStatus)}`}>{subjectMsg}</p> : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Add Subject</h2>
                <form action={createSubject} className="mt-4 space-y-3">
                  <input name="name" required placeholder="Subject name" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                  <Button type="submit">Save Subject</Button>
                </form>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Subject List</h2>
                <div className="mt-4 space-y-3">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="rounded-xl border border-slate-200 p-3">
                      <form action={updateSubject} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                        <input type="hidden" name="id" value={subject.id} />
                        <input name="name" defaultValue={subject.name} className="rounded-md border border-slate-300 px-2 py-1.5" />
                        <Button type="submit" size="sm">Update</Button>
                      </form>
                      <form action={deleteSubject} className="mt-2">
                        <input type="hidden" name="id" value={subject.id} />
                        <Button type="submit" size="sm" variant="outline">Delete</Button>
                      </form>
                    </div>
                  ))}
                  {subjects.length === 0 ? <p className="text-sm text-slate-500">No subjects yet.</p> : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {menu === "timetable" ? (
          <section className="space-y-4">
            {scheduleMsg ? <p className={`rounded-lg border px-3 py-2 text-sm ${statusTone(params.scheduleStatus)}`}>{scheduleMsg}</p> : null}
            {cancelMsg ? <p className={`rounded-lg border px-3 py-2 text-sm ${statusTone(params.cancelStatus)}`}>{cancelMsg}</p> : null}

            {/* Search / Filter bar */}
            <article className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Search Timetable</h2>
              <p className="mt-1 text-sm text-slate-500">Filter by any combination of class, day, or teacher. Leave all blank to add entries.</p>
              <form className="mt-4 grid gap-3 md:grid-cols-4 items-end">
                <input type="hidden" name="menu" value="timetable" />
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Class</label>
                  <select name="classFilter" defaultValue={selectedClassId} className="h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">All classes</option>
                    {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Day</label>
                  <select name="dayFilter" defaultValue={selectedDayFilter} className="h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">All days</option>
                    {WEEK_DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Teacher</label>
                  <select name="teacherFilter" defaultValue={selectedTeacherFilter} className="h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">All teachers</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">Search</Button>
                  <Button asChild variant="outline"><a href="/admin/manage?menu=timetable">Clear</a></Button>
                </div>
              </form>

              {hasViewFilter && (
                <p className="mt-3 text-xs text-slate-500">
                  Showing <strong>{timetable.length}</strong> entr{timetable.length === 1 ? "y" : "ies"}
                  {selectedClassId ? ` · Class: ${classes.find(c => c.id === selectedClassId)?.name ?? selectedClassId}` : ""}
                  {selectedDayFilter ? ` · Day: ${selectedDayFilter}` : ""}
                  {selectedTeacherFilter ? ` · Teacher: ${teachers.find(t => t.id === selectedTeacherFilter)?.name ?? selectedTeacherFilter}` : ""}
                </p>
              )}
            </article>

            {/* Add Entry form — only shown when a class is chosen (class_id required for insert) */}
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Add Timetable Entry</h2>
              {!selectedClassId ? (
                <p className="mt-3 text-sm text-slate-500">Select a specific <strong>class</strong> in the search above to enable adding entries.</p>
              ) : (
                <form action={createTimetableEntry} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <input type="hidden" name="class_id" value={selectedClassId} />
                  <input type="hidden" name="classFilter" value={selectedClassId} />
                  <input type="hidden" name="dayFilter" value={selectedDayFilter} />
                  <input type="hidden" name="teacherFilter" value={selectedTeacherFilter} />
                  <div className="md:col-span-2 lg:col-span-3 rounded-lg bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800">
                    Adding entry for: <strong>{classes.find((item) => item.id === selectedClassId)?.name ?? "Selected class"}</strong>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Teacher *</label>
                    <select name="teacher_id" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                      <option value="">Select teacher</option>
                      {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Subject *</label>
                    <select name="subject" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                      <option value="">Select subject</option>
                      {subjects.map((subject) => <option key={subject.id} value={subject.name}>{subject.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Day *</label>
                    <select name="day" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                      {WEEK_DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
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

                  <div className="flex items-end md:col-span-2 lg:col-span-3">
                    <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Add Entry</Button>
                  </div>
                </form>
              )}
            </article>

            {/* Results table */}
            {hasViewFilter ? (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Timetable Entries</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <th className="px-3 py-3">Class</th>
                        <th className="px-3 py-3">Day</th>
                        <th className="px-3 py-3">Time</th>
                        <th className="px-3 py-3">Subject</th>
                        <th className="px-3 py-3">Teacher</th>
                        <th className="px-3 py-3">Zoom</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Edit</th>
                        <th className="px-3 py-3">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timetable.map((entry) => (
                        <tr key={entry.id} className="border-b border-slate-100 align-top hover:bg-slate-50/60">
                          <td className="px-3 py-2 font-medium text-slate-800">{entry.class_name ?? "-"}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">{entry.day}</span>
                          </td>
                          <td className="px-3 py-2 tabular-nums">{formatTimeRange(entry.start_time, entry.end_time)}</td>
                          <td className="px-3 py-2">{entry.subject}</td>
                          <td className="px-3 py-2">{entry.teacher_name ?? <span className="text-slate-400">—</span>}</td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {entry.zoom_id ? <div>ID: {entry.zoom_id}</div> : null}
                            {entry.password ? <div>Pass: {entry.password}</div> : null}
                            {entry.link ? <a className="text-sky-600 hover:underline" href={entry.link} target="_blank" rel="noreferrer">Open</a> : null}
                          </td>
                          <td className="px-3 py-2">
                            {entry.is_cancelled ? (
                              <div className="space-y-1">
                                <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Cancelled</span>
                                {entry.cancel_reason ? <p className="text-xs text-rose-600">{entry.cancel_reason}</p> : null}
                                <form action={resumeTimetableEntry}>
                                  <input type="hidden" name="entry_id" value={entry.id} />
                                  <input type="hidden" name="classFilter" value={selectedClassId} />
                                  <input type="hidden" name="dayFilter" value={selectedDayFilter} />
                                  <input type="hidden" name="teacherFilter" value={selectedTeacherFilter} />
                                  <Button type="submit" size="sm" variant="outline">Resume</Button>
                                </form>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>
                                <form action={cancelTimetableEntry} className="flex gap-1">
                                  <input type="hidden" name="entry_id" value={entry.id} />
                                  <input type="hidden" name="classFilter" value={selectedClassId} />
                                  <input type="hidden" name="dayFilter" value={selectedDayFilter} />
                                  <input type="hidden" name="teacherFilter" value={selectedTeacherFilter} />
                                  <input name="cancel_reason" placeholder="Reason" className="h-7 w-24 rounded-md border border-slate-300 px-2 text-xs" />
                                  <Button type="submit" size="sm" className="h-7 bg-rose-600 hover:bg-rose-700">Cancel</Button>
                                </form>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <form action={updateTimetableEntry} className="grid gap-1 min-w-[160px]">
                              <input type="hidden" name="id" value={entry.id} />
                              <input type="hidden" name="class_id" value={entry.class_id} />
                              <input type="hidden" name="classFilter" value={selectedClassId} />
                              <input type="hidden" name="dayFilter" value={selectedDayFilter} />
                              <input type="hidden" name="teacherFilter" value={selectedTeacherFilter} />
                              <select name="teacher_id" defaultValue={entry.teacher_id ?? ""} className="h-7 rounded-md border border-slate-300 px-2 text-xs" required>
                                <option value="">Teacher</option>
                                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                              </select>
                              <select name="day" defaultValue={entry.day} className="h-7 rounded-md border border-slate-300 px-2 text-xs" required>
                                {WEEK_DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                              </select>
                              <input name="start_time" defaultValue={entry.start_time.slice(0, 5)} className="h-7 rounded-md border border-slate-300 px-2 text-xs" required />
                              <input name="end_time" defaultValue={entry.end_time?.slice(0, 5) ?? ""} className="h-7 rounded-md border border-slate-300 px-2 text-xs" required />
                              <select name="subject" defaultValue={entry.subject} className="h-7 rounded-md border border-slate-300 px-2 text-xs" required>
                                {subjects.map((subject) => <option key={subject.id} value={subject.name}>{subject.name}</option>)}
                              </select>
                              <input name="zoom_id" defaultValue={entry.zoom_id ?? ""} placeholder="Zoom ID" className="h-7 rounded-md border border-slate-300 px-2 text-xs" />
                              <input name="password" defaultValue={entry.password ?? ""} placeholder="Passcode" className="h-7 rounded-md border border-slate-300 px-2 text-xs" />
                              <input name="link" defaultValue={entry.link ?? ""} placeholder="Zoom link" className="h-7 rounded-md border border-slate-300 px-2 text-xs" />
                              <Button type="submit" size="sm" variant="outline">Update</Button>
                            </form>
                          </td>
                          <td className="px-3 py-2">
                            <form action={deleteTimetableEntry}>
                              <input type="hidden" name="id" value={entry.id} />
                              <input type="hidden" name="classFilter" value={selectedClassId} />
                              <input type="hidden" name="dayFilter" value={selectedDayFilter} />
                              <input type="hidden" name="teacherFilter" value={selectedTeacherFilter} />
                              <Button type="submit" size="sm" variant="outline" className="text-rose-600 hover:border-rose-300 hover:bg-rose-50">Delete</Button>
                            </form>
                          </td>
                        </tr>
                      ))}
                      {timetable.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500">No entries match the selected filters.</td>
                        </tr>
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
