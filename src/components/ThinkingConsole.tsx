import { useRef, useEffect } from "react";

export type LoadingStage = "routing" | "calling" | "parsing" | "done";

interface ThinkingConsoleProps {
  stage: LoadingStage;
}

const STAGE_CONFIG: Record<LoadingStage, { icon: string; text: string }> = {
  routing: { icon: "🧠", text: "Understanding transaction intent..." },
  calling: { icon: "📡", text: "Consulting Claude (Claude-Opus-4.7)..." },
  parsing: { icon: "⚙️", text: "Structuring & validating financial data..." },
  done: { icon: "✅", text: "Entry ready" },
};

export function ThinkingConsole({ stage }: ThinkingConsoleProps) {
  const timestamps = useRef<Record<string, string>>({});
  
  useEffect(() => {
    if (stage !== "done" && !timestamps.current[stage]) {
      timestamps.current[stage] = new Date().toLocaleTimeString();
    }
    if (!timestamps.current.init) {
      timestamps.current.init = new Date().toLocaleTimeString();
    }
  }, [stage]);

  if (stage === "done") return null;

  const current = STAGE_CONFIG[stage];

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 shadow-sm animate-slide-up">
      <div className="flex items-center gap-3">
        <span className="text-2xl animate-thinking">{current.icon}</span>
        <div className="flex-1">
          <p className="text-sm font-body font-medium text-primary animate-thinking">
            {current.text}
          </p>
          <div className="mt-2 flex gap-1">
            {(["routing", "calling", "parsing"] as const).map((s) => {
              const isActive = s === stage;
              // Simple way to show progress: if we are at or past this stage
              const stages: LoadingStage[] = ["routing", "calling", "parsing", "done"];
              const isPassed = stages.indexOf(s) < stages.indexOf(stage);
              
              return (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                    isActive
                      ? "bg-accent animate-pulse"
                      : isPassed
                      ? "bg-primary/40"
                      : "bg-primary/10"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Visual terminal-style logs (Subtle) */}
      <div className="mt-4 font-mono text-[10px] text-primary/40 space-y-1">
        <div className="flex gap-2">
          <span className="text-accent/40">[{timestamps.current.init}]</span>
          <span>Pipeline initialized</span>
        </div>
        {["routing", "calling", "parsing"].map((s) => {
          const stages: LoadingStage[] = ["routing", "calling", "parsing", "done"];
          const isAtOrPassed = stages.indexOf(s as LoadingStage) <= stages.indexOf(stage);
          if (!isAtOrPassed || !timestamps.current[s]) return null;
          
          return (
            <div key={s} className="flex gap-2">
              <span className="text-accent/40">[{timestamps.current[s]}]</span>
              <span>
                {s === "routing" && "> detect_intent(input)"}
                {s === "calling" && "> anthropic.messages.create(model='claude-opus-4-7')"}
                {s === "parsing" && "> zod.parse(response) && bigInt_precision_check()"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
