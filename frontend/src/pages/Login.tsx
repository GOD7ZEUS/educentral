import { type FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PhoenixLogo } from "../components/PhoenixLogo";

interface SchoolBranding {
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
}

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolCode = searchParams.get("school");

  const [branding, setBranding] = useState<SchoolBranding | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!schoolCode) return;
    api.get(`/schools/public/${schoolCode}`)
      .then((res) => setBranding(res.data))
      .catch(() => setBranding(null));
  }, [schoolCode]);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        {branding ? (
          <div className="mb-6 flex flex-col items-center text-center">
            {branding.websiteUrl ? (
              <a href={branding.websiteUrl} target="_blank" rel="noreferrer" title="Visit school website">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt={branding.name} className="mb-3 h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-indigo-100 text-2xl font-semibold text-indigo-600">
                    {branding.name.charAt(0)}
                  </div>
                )}
              </a>
            ) : branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.name} className="mb-3 h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-indigo-100 text-2xl font-semibold text-indigo-600">
                {branding.name.charAt(0)}
              </div>
            )}
            <h1 className="text-xl font-semibold text-slate-800">{branding.name}</h1>
            <p className="text-sm text-slate-500">Sign in to your account</p>
          </div>
        ) : (
          <div className="mb-6 flex flex-col items-center text-center">
            <PhoenixLogo className="mb-3 h-16 w-16" />
            <h1 className="text-xl font-semibold text-slate-800">EduCentral</h1>
            <p className="text-sm text-slate-500">Sign in to your account</p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
