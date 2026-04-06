import type { AgentManifest } from "../../types/agent";

// ── Team color map ────────────────────────────────────────────────────────────
// Maps color_class → { hex, dim (muted bg for card face), glow } tokens.
// dim is used as the card body background tint in both modes.
const TEAM_PALETTE: Record<string, { hex: string; dim: string; glow: string }> =
  {
    blue: {
      hex: "#1B3A6B",
      dim: "rgba(27,58,107,0.18)",
      glow: "rgba(27,58,107,0.40)",
    },
    green: {
      hex: "#1A5632",
      dim: "rgba(26,86,50,0.18)",
      glow: "rgba(26,86,50,0.40)",
    },
    amber: {
      hex: "#FFB347",
      dim: "rgba(255,179,71,0.14)",
      glow: "rgba(255,179,71,0.35)",
    },
    purple: {
      hex: "#6B21A8",
      dim: "rgba(107,33,168,0.18)",
      glow: "rgba(107,33,168,0.40)",
    },
    red: {
      hex: "#DC2626",
      dim: "rgba(220,38,38,0.14)",
      glow: "rgba(220,38,38,0.35)",
    },
    gray: {
      hex: "#4B5563",
      dim: "rgba(75,85,99,0.14)",
      glow: "rgba(75,85,99,0.35)",
    },
  };

// ── Model short label ─────────────────────────────────────────────────────────
// "google/gemma-4-26b-a4b-it" → "gemma-4-26b"
// "deepseek/deepseek-v3.2"   → "deepseek-v3.2"
// "qwen/qwen3-32b"            → "qwen3-32b"
function shortModelId(modelId: string): string {
  const slug = modelId.split("/").pop() ?? modelId;
  // Strip provider prefix repetition (deepseek/deepseek-v3.2 → deepseek-v3.2 already)
  // Trim suffixes like ":free" or "-it" that add noise
  return slug.replace(/:free$/, "").replace(/-it$/, "");
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DraggableAgentCardProps {
  manifest: AgentManifest;
}

export function DraggableAgentCard({ manifest }: DraggableAgentCardProps) {
  const { display, soul, model } = manifest;
  const palette = TEAM_PALETTE[display.color_class] ?? TEAM_PALETTE.gray;
  const modelTag = shortModelId(model.preferred.model_id);

  // ── Drag handler ─────────────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(
      "application/anvilbus-agent",
      JSON.stringify(manifest),
    );
    e.dataTransfer.effectAllowed = "move";
  }

  // ── Dynamic inline styles (only for runtime color values) ────────────────
  // All structural layout is Tailwind. Color tokens that vary per agent use
  // CSS custom properties injected here so Tailwind JIT never needs to purge
  // thousands of arbitrary color permutations.
  const cardVars = {
    "--team-hex": palette.hex,
    "--team-dim": palette.dim,
    "--team-glow": palette.glow,
  } as React.CSSProperties;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={cardVars}
      className={[
        // ── Card shell ──────────────────────────────────────────────────────
        // Compact card for horizontal bottom strip layout.
        "relative flex flex-col w-[140px] flex-none min-h-[90px]",
        "rounded-node overflow-hidden",
        "cursor-grab active:cursor-grabbing select-none",

        // ── Border: thin outer frame + inner team-color top bar ─────────────
        "border border-gray-200/70 dark:border-gray-700/60",

        // ── Elevation ───────────────────────────────────────────────────────
        "shadow-node",

        // ── Hover / drag transitions ─────────────────────────────────────────
        // On hover: lift shadow and emit a soft team-color glow on the border.
        // "card-hover" is handled below via group-based CSS trick.
        "transition-all duration-150 ease-out",
        "hover:shadow-node-hover",
        "hover:-translate-y-px",
        "active:translate-y-0 active:shadow-node",

        // ── Background ──────────────────────────────────────────────────────
        "bg-surface-primary dark:bg-dark-surface-secondary",
      ].join(" ")}
    >
      {/* ── Top color bar (holographic foil substitute) ──────────────────── */}
      {/* Height 3px, full-width gradient from team hex to transparent.        */}
      {/* In dark mode we make it slightly taller (4px) for better contrast.   */}
      <div
        className="h-[3px] dark:h-[4px] w-full flex-none"
        style={{
          background: `linear-gradient(90deg, ${palette.hex} 0%, ${palette.hex}88 60%, transparent 100%)`,
        }}
      />

      {/* ── Card face ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-2 gap-1">
        {/* Name — prominent, no icon */}
        <p className="text-body-sm font-bold leading-tight truncate text-surface-accent dark:text-white tracking-tight">
          {display.name}
        </p>
        <p className="text-[0.6rem] text-gray-500 dark:text-gray-400 truncate">
          {soul.role}
        </p>

        {/* Footer — model badge left, tags right */}
        <div className="flex items-center justify-between mt-auto gap-1.5">
          {/* Model badge — charcoal pill, monospace */}
          <span
            className={[
              "inline-flex items-center gap-1",
              "px-2 py-0.5 rounded-pill",
              "text-[0.65rem] font-mono leading-none",
              "bg-pill-charcoal text-white dark:bg-dark-surface-secondary dark:text-gray-300",
              "border border-transparent dark:border-gray-600",
              "max-w-[120px] truncate",
            ].join(" ")}
            title={model.preferred.model_id}
          >
            {/* Dot colored with team hex */}
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-none"
              style={{ background: palette.hex }}
              aria-hidden="true"
            />
            {modelTag}
          </span>

          {/* Up to 2 tags — pill-shaped, team color tinted */}
          <div className="flex items-center gap-1 overflow-hidden">
            {display.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-pill text-[0.6rem] font-medium leading-none truncate max-w-[56px]"
                style={{
                  background: palette.dim,
                  color: palette.hex,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Drag ghost: subtle team-color overlay on active ─────────────────── */}
      {/* pointer-events:none so it never blocks mouse events.                  */}
      {/* The :active state lifts translate-y so this overlay becomes visible   */}
      {/* only during the drag press via CSS opacity transition.                */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 active:opacity-100 transition-opacity"
        style={{ background: `${palette.hex}0A` }}
        aria-hidden="true"
      />
    </div>
  );
}
