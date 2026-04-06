import { useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

interface SignupPortalProps {
  onAuthenticated: () => void;
}

export function SignupPortal({ onAuthenticated }: SignupPortalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    if (mode === "signup" && !name) {
      setError("Name is required");
      setLoading(false);
      return;
    }

    if (mode === "signup" && !agreedToTerms) {
      setError("You must agree to the Terms & Conditions");
      setLoading(false);
      return;
    }

    // Use Supabase if configured, otherwise fall back to localStorage
    if (isSupabaseConfigured()) {
      try {
        if (!supabase) throw new Error("Supabase not configured");
        if (mode === "signup") {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } },
          });
          if (signUpError) throw signUpError;
        } else {
          const { error: signInError } = await supabase.auth.signInWithPassword(
            { email, password },
          );
          if (signInError) throw signInError;
        }
        localStorage.setItem(
          "mcp-auth",
          JSON.stringify({
            email,
            name: name || email.split("@")[0],
            provider: "supabase",
          }),
        );
        onAuthenticated();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
        setLoading(false);
      }
    } else {
      // Local-only mode (no Supabase configured)
      await new Promise((r) => setTimeout(r, 400));
      localStorage.setItem(
        "mcp-auth",
        JSON.stringify({
          email,
          name: name || email.split("@")[0],
          provider: "local",
        }),
      );
      setLoading(false);
      onAuthenticated();
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0F1117]">
      {/* Background grid effect */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #7dd3fc 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <img
            src="/logos/logo-portal.png"
            alt="MultiClawProtocol"
            className="h-12 mx-auto mb-4"
          />
          <p className="text-body-sm text-gray-500">
            Visual Agent Orchestration Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1A1C24] rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
          {/* Mode toggle */}
          <div className="flex bg-[#0F1117] rounded-pill p-1 mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-caption font-semibold rounded-pill transition-all ${
                mode === "login"
                  ? "bg-[#1B3A6B] text-white shadow-md"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-caption font-semibold rounded-pill transition-all ${
                mode === "signup"
                  ? "bg-[#1B3A6B] text-white shadow-md"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (signup only) */}
            {mode === "signup" && (
              <div>
                <label className="block text-caption font-medium text-gray-400 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-node bg-[#0F1117] border border-gray-700/50 text-body-sm text-white placeholder-gray-600 focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] outline-none transition-colors"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-caption font-medium text-gray-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-node bg-[#0F1117] border border-gray-700/50 text-body-sm text-white placeholder-gray-600 focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] outline-none transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-caption font-medium text-gray-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-node bg-[#0F1117] border border-gray-700/50 text-body-sm text-white placeholder-gray-600 focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] outline-none transition-colors"
              />
            </div>

            {/* T&C checkbox (signup only) */}
            {mode === "signup" && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="rounded accent-[#1B3A6B] mt-0.5"
                />
                <span className="text-[0.7rem] text-gray-400 leading-relaxed">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-[#7dd3fc] hover:underline"
                  >
                    Terms & Conditions
                  </button>
                  , including anonymized usage data collection.
                </span>
              </label>
            )}

            {/* Error */}
            {error && (
              <p className="text-caption text-red-400 bg-red-400/10 rounded-node px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-pill font-semibold text-body-sm text-white transition-all disabled:opacity-50
                bg-gradient-to-r from-[#DC2626] to-[#991b1b] hover:from-[#991b1b] hover:to-[#DC2626]
                shadow-lg shadow-red-600/25 hover:shadow-red-600/40"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-700/50" />
            <span className="text-caption text-gray-600">or continue with</span>
            <div className="flex-1 h-px bg-gray-700/50" />
          </div>

          {/* Social logins */}
          <div className="flex gap-3">
            <button
              onClick={async () => {
                if (!isSupabaseConfigured() || !supabase) return;
                const { error: e } = await supabase.auth.signInWithOAuth({
                  provider: "github",
                  options: { redirectTo: window.location.origin },
                });
                if (e) setError(e.message);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-node bg-[#0F1117] border border-gray-700/50 text-caption text-gray-300 hover:bg-[#24292e] hover:border-gray-500 hover:text-white transition-colors"
            >
              GitHub
            </button>
            <button
              onClick={async () => {
                if (!isSupabaseConfigured() || !supabase) return;
                const { error: e } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: window.location.origin },
                });
                if (e) setError(e.message);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-node bg-[#0F1117] border border-gray-700/50 text-caption text-gray-300 hover:bg-[#4285F4]/20 hover:border-[#4285F4]/50 hover:text-white transition-colors"
            >
              Google
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-caption text-gray-600 mt-6">
          By continuing, you agree to the{" "}
          <button
            onClick={() => setShowTerms(true)}
            className="text-[#7dd3fc] hover:underline"
          >
            Terms & Conditions
          </button>
        </p>
      </div>

      {/* T&C popup */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A1C24] border border-gray-700/50 rounded-node p-6 w-[500px] max-h-[70vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-body-sm font-bold text-white">
                Terms & Conditions
              </h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-gray-500 hover:text-white text-caption"
              >
                x
              </button>
            </div>
            <div className="text-[0.7rem] text-gray-300 leading-relaxed space-y-3">
              <p className="font-semibold text-white">
                MultiClawProtocol — Terms of Service
              </p>
              <p>By creating an account you agree to the following:</p>
              <p className="font-semibold text-gray-200 mt-3">
                1. Anonymized Data Collection
              </p>
              <p>
                We collect anonymized, non-personally-identifiable usage data
                including: model selection frequencies, pipeline configurations,
                feature engagement, session durations, token usage volumes, and
                error rates. We do NOT collect API keys, message content,
                prompts, file contents, system paths, or IP addresses.
              </p>
              <p className="font-semibold text-gray-200 mt-3">2. Data Usage</p>
              <p>
                Anonymized aggregate data may be used for product improvement
                and market research, and may be shared with third parties in
                aggregated form only. Individual user data is never sold.
              </p>
              <p className="font-semibold text-gray-200 mt-3">3. Opt-Out</p>
              <p>Disable telemetry at any time in Settings.</p>
              <p className="font-semibold text-gray-200 mt-3">
                4. Account Deletion
              </p>
              <p>
                Delete your account at any time from Settings. All personal data
                removed within 30 days.
              </p>
              <p className="font-semibold text-gray-200 mt-3">
                5. Service As-Is
              </p>
              <p>
                Provided without warranty. Not liable for damages or API costs.
              </p>
              <p className="font-semibold text-gray-200 mt-3">6. Changes</p>
              <p>
                We may update these terms. Continued use constitutes acceptance.
              </p>
              <p className="text-gray-500 mt-4 text-[0.6rem]">
                Last updated: April 2026 — v0.1.0
              </p>
            </div>
            <button
              onClick={() => {
                setAgreedToTerms(true);
                setShowTerms(false);
              }}
              className="w-full mt-4 py-2 text-caption font-semibold rounded-pill bg-[#1B3A6B] text-white hover:bg-[#1E40AF] transition-colors"
            >
              I Agree
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
