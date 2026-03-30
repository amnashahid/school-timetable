import Link from "next/link";
import { loginAdmin } from "../../action";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type LoginParams = {
  error?: string;
};

function errorMessage(error: string | undefined) {
  if (error === "invalid") return "Invalid email or password.";
  if (error === "missing") return "Please enter both email and password.";
  if (error === "config") return "Admin login is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local.";
  return null;
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<LoginParams> }) {
  const params = await searchParams;
  const msg = errorMessage(params.error);

  return (
    <main className="min-h-screen bg-[linear-gradient(130deg,#f0f9ff_0%,#fff7ed_55%,#ecfeff_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
        <section className="w-full rounded-3xl border border-cyan-200 bg-white p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Secure Access</p>
          <h1 className="mt-1 text-3xl font-heading font-black text-slate-900">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in with your admin email and password.</p>

          {msg ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</p>
          ) : null}

          <form action={loginAdmin} className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
              <input
                type="email"
                name="email"
                required
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                placeholder="admin@school.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Password</label>
              <input
                type="password"
                name="password"
                required
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                placeholder="Enter password"
              />
            </div>

            <Button type="submit" className="mt-2 w-full bg-cyan-600 hover:bg-cyan-700">Login to Admin</Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-cyan-700 hover:underline">Back to Student View</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
