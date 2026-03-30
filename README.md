# School Timetable (Zoom)

Simple timetable app built with Next.js + Supabase.

- Admin can add teachers, classes, day-wise timetable entries, and cancel or resume classes.
- Class is independent (no teacher attached at class creation time).
- Teacher is selected per timetable entry.
- Students select class only and view full weekly timetable.

## 1. Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 2. Supabase Tables

Run this SQL in Supabase SQL Editor:

```sql
create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  created_at timestamp with time zone default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default now()
);

create table if not exists timetable (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid references teachers(id) on delete set null,
  day text not null check (day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  start_time time not null,
  subject text not null,
  zoom_id text,
  password text,
  link text,
  is_cancelled boolean not null default false,
  cancel_reason text,
  created_at timestamp with time zone default now()
);
```

If you already created old tables, run these updates too:

```sql
alter table classes drop column if exists teacher_id;

alter table timetable add column if not exists is_cancelled boolean not null default false;
alter table timetable add column if not exists cancel_reason text;
alter table timetable add column if not exists teacher_id uuid;
alter table timetable add constraint timetable_teacher_fk foreign key (teacher_id) references teachers(id) on delete set null;

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default now()
);
```

## 3. Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

- Student timetable: `/`
- Admin dashboard: `/admin`
- Admin management panel: `/admin/manage`
- Teacher dashboard: `/teacher`
