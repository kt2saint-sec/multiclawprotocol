import { useState } from "react";
import { HELP_SECTIONS, QUICK_START } from "./helpContent";

export function HelpPage() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const current = HELP_SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="h-full flex bg-[#0F1117]">
      {/* Sidebar — section navigation */}
      <div className="w-[200px] flex-none border-r border-gray-800/50 overflow-y-auto py-4 px-2">
        <h3 className="text-caption font-bold text-gray-400 tracking-widest px-2 mb-3">
          HELP
        </h3>

        {/* Quick start link */}
        <button
          onClick={() => setActiveSection("quick-start")}
          className={`w-full text-left px-3 py-2 text-caption rounded-node mb-1 transition-colors ${
            activeSection === "quick-start"
              ? "bg-red-600 text-white font-semibold"
              : "text-gray-400 hover:text-white hover:bg-gray-800/50"
          }`}
        >
          Quick Start
        </button>

        <div className="h-px bg-gray-800/50 my-2" />

        {/* Section links */}
        {HELP_SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full text-left px-3 py-1.5 text-caption rounded-node mb-0.5 transition-colors ${
              activeSection === section.id
                ? "bg-red-600 text-white font-semibold"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            {section.title}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto py-6 px-8">
        {activeSection === "quick-start" ? (
          <div>
            <img
              src="/logos/logo-portal.png"
              alt="MultiClawProtocol"
              className="h-10 mb-4"
            />
            <p className="text-body-sm text-gray-500 mb-6">Quick Start Guide</p>

            <div className="space-y-4">
              {QUICK_START.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 bg-[#1A1C24] border border-gray-700/50 rounded-node p-4"
                >
                  <span className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-body-sm flex-none">
                    {i + 1}
                  </span>
                  <p className="text-body-sm text-gray-300 pt-1">
                    {step.replace(/^\d+\.\s*/, "")}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-[#1A1C24] border border-gray-700/50 rounded-node p-4">
              <p className="text-caption text-gray-500">
                Type <span className="font-mono text-red-400">help</span> in the
                Terminal tab for command reference, or{" "}
                <span className="font-mono text-red-400">help tutorial</span>{" "}
                for this guide in the terminal.
              </p>
            </div>
          </div>
        ) : current ? (
          <div>
            <h1 className="text-display-sm font-bold text-white tracking-tight mb-4">
              {current.title}
            </h1>
            <div className="space-y-1">
              {current.content.map((line, i) =>
                line === "" ? (
                  <div key={i} className="h-3" />
                ) : line.startsWith("  ") ? (
                  <p
                    key={i}
                    className="font-mono text-caption text-[#7dd3fc] bg-[#1A1C24] px-3 py-1 rounded"
                  >
                    {line}
                  </p>
                ) : line.startsWith("•") ? (
                  <p key={i} className="text-body-sm text-gray-300 pl-2">
                    {line}
                  </p>
                ) : (
                  <p key={i} className="text-body-sm text-gray-300">
                    {line}
                  </p>
                ),
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
