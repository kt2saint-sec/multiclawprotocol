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
                bg-gradient-to-r from-[#1B3A6B] to-[#1E40AF] hover:from-[#1E40AF] hover:to-[#1B3A6B]
                shadow-lg shadow-[#1B3A6B]/25 hover:shadow-[#1B3A6B]/40"
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
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-node bg-[#0F1117] border border-gray-700/50 text-caption text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-colors">
              GitHub
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-node bg-[#0F1117] border border-gray-700/50 text-caption text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-colors">
              Google
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-caption text-gray-600 mt-6">
          By continuing, you agree to MultiClawProtocol Terms of Service
        </p>
      </div>
    </div>
  );
}
