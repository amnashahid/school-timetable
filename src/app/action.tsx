"use server"
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { WEEK_DAYS, type SchoolClass, type Subject, type Teacher, type TimetableEntry, type WeekDay } from "@/lib/timetable";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL// || 'https://joomgmcwaymsnhfzhuuo.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY //|| 'sb_publishable_wGvSSHyQzZVbkunj9P9gRw_PJQnzMGq';

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

function teacherNameFromRelation(value: unknown) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined;
    return first?.name ?? null;
  }
  const row = value as { name?: string };
  return row.name ?? null;
}

function classNameFromRelation(value: unknown) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined;
    return first?.name ?? null;
  }
  const row = value as { name?: string };
  return row.name ?? null;
}

function adminPath(
  menu: "teachers" | "classes" | "subjects" | "timetable",
  statusKey: string,
  statusValue: string,
  reasonKey?: string,
  reasonValue?: string,
  extraParams?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams({ menu, [statusKey]: statusValue });
  if (reasonKey && reasonValue) {
    params.set(reasonKey, encodeURIComponent(reasonValue));
  }
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }
  }
  return `/admin?${params.toString()}`;
}

function getTimetableFilterParams(formData: FormData) {
  const classFilter = String(formData.get('classFilter') ?? '').trim();
  const dayFilter = String(formData.get('dayFilter') ?? '').trim();
  const teacherFilter = String(formData.get('teacherFilter') ?? '').trim();

  return {
    classFilter: classFilter || undefined,
    dayFilter: dayFilter || undefined,
    teacherFilter: teacherFilter || undefined,
  };
}

export async function getAllTeachers() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [] as Teacher[];
  }

  const { data, error } = await supabase.from('teachers').select('id, name, email').order('name');
  if (error) {
    console.error("getAllTeachers failed", error.message);
    return [] as Teacher[];
  }

  return (data ?? []) as Teacher[];
}

export async function getAllClasses() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [] as SchoolClass[];
  }

  const { data, error } = await supabase.from('classes').select('id, name').order('name');

  if (error) {
    console.error("getAllClasses failed", error.message);
    const fallback = await supabase.from('classes').select('id, name').order('name');
    if (fallback.error) {
      return [] as SchoolClass[];
    }
    return (fallback.data ?? []) as SchoolClass[];
  }

  return (data ?? []) as SchoolClass[];
}

export async function getAllSubjects() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [] as Subject[];
  }

  const { data, error } = await supabase.from('subjects').select('id, name').order('name');
  if (error) {
    console.error("getAllSubjects failed", error.message);
    return [] as Subject[];
  }

  return (data ?? []) as Subject[];
}

export async function getWeeklySchedule(classIds: string[], day?: WeekDay | "") {
  const supabase = getSupabaseClient();
  if (!supabase || classIds.length === 0) {
    return [] as TimetableEntry[];
  }

  let query = supabase
    .from('timetable')
    .select('id, class_id, teacher_id, day, start_time, end_time, subject, zoom_id, password, link, is_cancelled, cancel_reason, classes:class_id ( name ), teachers:teacher_id ( name )')
    .in('class_id', classIds)
    .order('day')
    .order('start_time');

  if (day && WEEK_DAYS.includes(day)) {
    query = query.eq('day', day);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getWeeklySchedule failed", error.message);
    const fallback = await supabase
      .from('timetable')
      .select('id, class_id, day, start_time, subject, zoom_id, password, link')
      .in('class_id', classIds)
      .order('day')
      .order('start_time');

    if (fallback.error) {
      return [] as TimetableEntry[];
    }

    const fallbackRows = (fallback.data ?? []) as Array<{ id: string; class_id: string; day: WeekDay; start_time: string; subject: string; zoom_id: string | null; password: string | null; link: string | null }>;
    return fallbackRows
      .filter((row) => !day || row.day === day)
      .map((row) => ({
        ...row,
        end_time: null,
        teacher_id: null,
        is_cancelled: false,
        cancel_reason: null,
        class_name: null,
        teacher_name: null,
      }));
  }

  return (data ?? []).map((row: { id: string; class_id: string; teacher_id?: string | null; day: WeekDay; start_time: string; end_time?: string | null; subject: string; zoom_id: string | null; password: string | null; link: string | null; is_cancelled?: boolean | null; cancel_reason?: string | null; classes?: unknown; teachers?: unknown }) => {
    return {
      id: row.id,
      class_id: row.class_id,
      teacher_id: row.teacher_id ?? null,
      day: row.day,
      start_time: row.start_time,
      end_time: row.end_time ?? null,
      subject: row.subject,
      zoom_id: row.zoom_id ?? null,
      password: row.password ?? null,
      link: row.link ?? null,
      is_cancelled: Boolean(row.is_cancelled),
      cancel_reason: row.cancel_reason ?? null,
      class_name: classNameFromRelation(row.classes),
      teacher_name: teacherNameFromRelation(row.teachers),
    };
  });
}

export async function updateTeacher(formData: FormData) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    redirect(adminPath("teachers", "teacherStatus", "missing-config"));
  }

  const id = String(formData.get('id') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (!id || !name) {
    redirect(adminPath("teachers", "teacherStatus", "missing-fields"));
  }

  const { error } = await supabase.from('teachers').update({ name, email: email || null }).eq('id', id);
  if (error) {
    redirect(adminPath("teachers", "teacherStatus", "error", "teacherReason", error.message));
  }

  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  revalidatePath('/teacher');
  redirect(adminPath("teachers", "teacherStatus", "updated"));
}

export async function deleteTeacher(formData: FormData) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    redirect(adminPath("teachers", "teacherStatus", "missing-config"));
  }

  const id = String(formData.get('id') ?? '').trim();
  if (!id) {
    redirect(adminPath("teachers", "teacherStatus", "missing-fields"));
  }

  const { error } = await supabase.from('teachers').delete().eq('id', id);
  if (error) {
    redirect(adminPath("teachers", "teacherStatus", "error", "teacherReason", error.message));
  }

  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  revalidatePath('/teacher');
  redirect(adminPath("teachers", "teacherStatus", "deleted"));
}

export async function createTeacher(formData: FormData) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    redirect(adminPath("teachers", "teacherStatus", "missing-config"));
  }

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (!name) {
    redirect(adminPath("teachers", "teacherStatus", "missing-name"));
  }

  const { error } = await supabase.from('teachers').insert([{ name, email: email || null }]);
  if (error) {
    redirect(adminPath("teachers", "teacherStatus", "error", "teacherReason", error.message));
  }

  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  revalidatePath('/teacher');
  redirect(adminPath("teachers", "teacherStatus", "saved"));
}

export async function updateClass(formData: FormData) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    redirect(adminPath("classes", "classStatus", "missing-config"));
  }

  const id = String(formData.get('id') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) {
    redirect(adminPath("classes", "classStatus", "missing-fields"));
  }

  const { error } = await supabase.from('classes').update({ name }).eq('id', id);
  if (error) {
    redirect(adminPath("classes", "classStatus", "error", "classReason", error.message));
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  revalidatePath('/teacher');
  redirect(adminPath("classes", "classStatus", "updated"));
}

export async function deleteClass(formData: FormData) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    redirect(adminPath("classes", "classStatus", "missing-config"));
  }

  const id = String(formData.get('id') ?? '').trim();
  if (!id) {
    redirect(adminPath("classes", "classStatus", "missing-fields"));
  }

  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) {
    redirect(adminPath("classes", "classStatus", "error", "classReason", error.message));
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  revalidatePath('/teacher');
  redirect(adminPath("classes", "classStatus", "deleted"));
}

export async function createClass(formData: FormData) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    redirect(adminPath("classes", "classStatus", "missing-config"));
  }

  const name = String(formData.get('name') ?? '').trim();

  if (!name) {
    redirect(adminPath("classes", "classStatus", "missing-fields"));
  }

  const { error } = await supabase.from('classes').insert([{ name }]);
  if (error) {
    redirect(adminPath("classes", "classStatus", "error", "classReason", error.message));
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  revalidatePath('/teacher');
  redirect(adminPath("classes", "classStatus", "saved"));
}

export async function createSubject(formData: FormData) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    redirect(adminPath("subjects", "subjectStatus", "missing-config"));
  }

  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    redirect(adminPath("subjects", "subjectStatus", "missing-fields"));
  }

  const { error } = await supabase.from('subjects').insert([{ name }]);
  if (error) {
    redirect(adminPath("subjects", "subjectStatus", "error", "subjectReason", error.message));
  }

  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  redirect(adminPath("subjects", "subjectStatus", "saved"));
}

export async function updateSubject(formData: FormData) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    redirect(adminPath("subjects", "subjectStatus", "missing-config"));
  }

  const id = String(formData.get('id') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) {
    redirect(adminPath("subjects", "subjectStatus", "missing-fields"));
  }

  const { error } = await supabase.from('subjects').update({ name }).eq('id', id);
  if (error) {
    redirect(adminPath("subjects", "subjectStatus", "error", "subjectReason", error.message));
  }

  revalidatePath('/admin/manage');
  redirect(adminPath("subjects", "subjectStatus", "updated"));
}

export async function deleteSubject(formData: FormData) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    redirect(adminPath("subjects", "subjectStatus", "missing-config"));
  }

  const id = String(formData.get('id') ?? '').trim();
  if (!id) {
    redirect(adminPath("subjects", "subjectStatus", "missing-fields"));
  }

  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) {
    redirect(adminPath("subjects", "subjectStatus", "error", "subjectReason", error.message));
  }

  revalidatePath('/admin/manage');
  redirect(adminPath("subjects", "subjectStatus", "deleted"));
}

export async function updateTimetableEntry(formData: FormData) {
  const supabase = getSupabaseClient();
  const filterParams = getTimetableFilterParams(formData);
  if (!supabase) {
    redirect(adminPath("timetable", "scheduleStatus", "missing-config", undefined, undefined, filterParams));
  }

  const id = String(formData.get('id') ?? '').trim();
  const classId = String(formData.get('class_id') ?? '').trim();
  const teacherId = String(formData.get('teacher_id') ?? '').trim();
  const day = String(formData.get('day') ?? '').trim() as WeekDay;
  const subject = String(formData.get('subject') ?? '').trim();
  const startTime = String(formData.get('start_time') ?? '').trim();
  const endTime = String(formData.get('end_time') ?? '').trim();
  const link = String(formData.get('link') ?? '').trim();
  const zoomId = String(formData.get('zoom_id') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();

  if (!id || !classId || !subject || !startTime || !endTime || !WEEK_DAYS.includes(day)) {
    redirect(adminPath("timetable", "scheduleStatus", "missing-fields", undefined, undefined, filterParams));
  }

  const { error } = await supabase
    .from('timetable')
    .update({
      class_id: classId,
      teacher_id: teacherId || null,
      day,
      subject,
      start_time: startTime,
      end_time: endTime,
      link: link || null,
      zoom_id: zoomId || null,
      password: password || null,
    })
    .eq('id', id);

  if (error) {
    redirect(adminPath("timetable", "scheduleStatus", "error", "scheduleReason", error.message, filterParams));
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  revalidatePath('/teacher');
  redirect(adminPath("timetable", "scheduleStatus", "updated", undefined, undefined, filterParams));
}

export async function deleteTimetableEntry(formData: FormData) {
  const supabase = getSupabaseClient();
  const filterParams = getTimetableFilterParams(formData);
  if (!supabase) {
    redirect(adminPath("timetable", "scheduleStatus", "missing-config", undefined, undefined, filterParams));
  }

  const id = String(formData.get('id') ?? '').trim();
  if (!id) {
    redirect(adminPath("timetable", "scheduleStatus", "missing-fields", undefined, undefined, filterParams));
  }

  const { error } = await supabase.from('timetable').delete().eq('id', id);
  if (error) {
    redirect(adminPath("timetable", "scheduleStatus", "error", "scheduleReason", error.message, filterParams));
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  revalidatePath('/teacher');
  redirect(adminPath("timetable", "scheduleStatus", "deleted", undefined, undefined, filterParams));
}

export async function createTimetableEntry(formData: FormData) {
  const supabase = getSupabaseClient();
  const filterParams = getTimetableFilterParams(formData);
  if (!supabase) {
    redirect(adminPath("timetable", "scheduleStatus", "missing-config", undefined, undefined, filterParams));
  }

  const classId = String(formData.get('class_id') ?? '').trim();
  const teacherId = String(formData.get('teacher_id') ?? '').trim();
  const day = String(formData.get('day') ?? '').trim() as WeekDay;
  const subject = String(formData.get('subject') ?? '').trim();
  const startTime = String(formData.get('start_time') ?? '').trim();
  const endTime = String(formData.get('end_time') ?? '').trim();
  const link = String(formData.get('link') ?? '').trim();
  const zoomId = String(formData.get('zoom_id') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();

  if (!classId || !subject || !startTime || !endTime || !WEEK_DAYS.includes(day)) {
    redirect(adminPath("timetable", "scheduleStatus", "missing-fields", undefined, undefined, filterParams));
  }

  const { error } = await supabase.from('timetable').insert([
    {
      class_id: classId,
      teacher_id: teacherId || null,
      day,
      subject,
      start_time: startTime,
      end_time: endTime,
      link: link || null,
      zoom_id: zoomId || null,
      password: password || null,
    },
  ]);

  if (error) {
    redirect(adminPath("timetable", "scheduleStatus", "error", "scheduleReason", error.message, filterParams));
  }

  revalidatePath("/");
  revalidatePath('/teacher');
  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  redirect(adminPath("timetable", "scheduleStatus", "saved", undefined, undefined, filterParams));
}

export async function cancelTimetableEntry(formData: FormData) {
  const supabase = getSupabaseClient();
  const filterParams = getTimetableFilterParams(formData);
  if (!supabase) {
    redirect(adminPath("timetable", "cancelStatus", "missing-config", undefined, undefined, filterParams));
  }

  const entryId = String(formData.get('entry_id') ?? '').trim();
  const cancelReason = String(formData.get('cancel_reason') ?? '').trim();

  if (!entryId) {
    redirect(adminPath("timetable", "cancelStatus", "missing-fields", undefined, undefined, filterParams));
  }

  const { error } = await supabase
    .from('timetable')
    .update({ is_cancelled: true, cancel_reason: cancelReason || 'Cancelled by admin' })
    .eq('id', entryId);

  if (error) {
    redirect(adminPath("timetable", "cancelStatus", "error", "cancelReason", error.message, filterParams));
  }

  revalidatePath('/');
  revalidatePath('/teacher');
  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  redirect(adminPath("timetable", "cancelStatus", "cancelled", undefined, undefined, filterParams));
}

export async function resumeTimetableEntry(formData: FormData) {
  const supabase = getSupabaseClient();
  const filterParams = getTimetableFilterParams(formData);
  if (!supabase) {
    redirect(adminPath("timetable", "cancelStatus", "missing-config", undefined, undefined, filterParams));
  }

  const entryId = String(formData.get('entry_id') ?? '').trim();
  if (!entryId) {
    redirect(adminPath("timetable", "cancelStatus", "missing-fields", undefined, undefined, filterParams));
  }

  const { error } = await supabase
    .from('timetable')
    .update({ is_cancelled: false, cancel_reason: null })
    .eq('id', entryId);

  if (error) {
    redirect(adminPath("timetable", "cancelStatus", "error", "cancelReason", error.message, filterParams));
  }

  revalidatePath('/');
  revalidatePath('/teacher');
  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  redirect(adminPath("timetable", "cancelStatus", "resumed", undefined, undefined, filterParams));
}

export async function addTeacherTimetableEntry(formData: FormData) {
  const supabase = getSupabaseClient();
  const teacherId = String(formData.get('teacher_id') ?? '').trim();

  function teacherRedirect(status: string, reason?: string) {
    const p = new URLSearchParams({ teacherId, addStatus: status });
    if (reason) p.set('addReason', encodeURIComponent(reason));
    redirect(`/teacher?${p.toString()}`);
  }

  if (!supabase) teacherRedirect('missing-config');

  const classId = String(formData.get('class_id') ?? '').trim();
  const day = String(formData.get('day') ?? '').trim() as WeekDay;
  const subject = String(formData.get('subject') ?? '').trim();
  const startTime = String(formData.get('start_time') ?? '').trim();
  const endTime = String(formData.get('end_time') ?? '').trim();
  const link = String(formData.get('link') ?? '').trim();
  const zoomId = String(formData.get('zoom_id') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();

  if (!classId || !teacherId || !subject || !startTime || !endTime || !WEEK_DAYS.includes(day)) {
    teacherRedirect('missing-fields');
  }

  const { error } = await supabase!.from('timetable').insert([{
    class_id: classId,
    teacher_id: teacherId,
    day,
    subject,
    start_time: startTime,
    end_time: endTime,
    link: link || null,
    zoom_id: zoomId || null,
    password: password || null,
  }]);

  if (error) teacherRedirect('error', error.message);

  revalidatePath('/');
  revalidatePath('/teacher');
  revalidatePath('/admin');
  revalidatePath('/admin/manage');
  teacherRedirect('saved');
}
