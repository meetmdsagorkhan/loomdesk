import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_rgba(14,165,233,0.15),_rgba(15,23,42,0.12)),radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(226,232,240,0.9))] px-4 py-12">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:42px_42px]" />
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
