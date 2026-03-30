export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

export type Teacher = {
  id: string;
  name: string;
  email: string | null;
};

export type SchoolClass = {
  id: string;
  name: string;
};

export type Subject = {
  id: string;
  name: string;
};

export type TimetableEntry = {
  id: string;
  class_id: string;
  teacher_id: string | null;
  day: WeekDay;
  start_time: string;
  end_time: string | null;
  subject: string;
  zoom_id: string | null;
  password: string | null;
  link: string | null;
  is_cancelled: boolean;
  cancel_reason: string | null;
  class_name: string | null;
  teacher_name: string | null;
};
