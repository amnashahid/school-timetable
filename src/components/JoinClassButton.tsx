"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type JoinClassButtonProps = {
  link: string;
  classLabel: string;
};

type StudentProfile = {
  name: string;
  admissionNo: string;
};

const PROFILE_KEY = "student_profile";

export default function JoinClassButton({ link, classLabel }: JoinClassButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const hasProfile = useMemo(() => Boolean(name && admissionNo), [name, admissionNo]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return;
      const profile = JSON.parse(raw) as StudentProfile;
      if (profile.name && profile.admissionNo) {
        setName(profile.name);
        setAdmissionNo(profile.admissionNo);
      }
    } catch {
      // no-op for invalid local storage data
    }
  }, []);

  function openJoinLink(profile: StudentProfile) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // ignore local storage write errors
    }
    window.open(link, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  function handleJoinClick() {
    if (hasProfile) {
      openJoinLink({ name, admissionNo });
      return;
    }
    setOpen(true);
  }

  function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !admissionNo.trim()) return;
    openJoinLink({ name: name.trim(), admissionNo: admissionNo.trim() });
  }

  return (
    <>
      <Button type="button" size="sm" className="rounded-full bg-orange-500 px-5 hover:bg-orange-600" onClick={handleJoinClick}>
        Join Class
      </Button>
      {hasProfile ? <p className="mt-1 text-[11px] text-slate-500">Joining as {name} ({admissionNo})</p> : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Join {classLabel}</h3>
            <p className="mt-1 text-sm text-slate-600">Enter your details before joining.</p>

            <form onSubmit={handleConfirm} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Student Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Admission No</label>
                <input
                  required
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  placeholder="Enter admission number"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600">
                  Save & Join
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
