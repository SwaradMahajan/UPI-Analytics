import { AlertTriangle, CircleDot, Search, Sparkles } from "lucide-react";
import { Card, SectionHeading } from "./primitives";
import { useSimulation } from "../SimulationContext";

export function FindingsTable() {
  const { derivedData } = useSimulation();

  return (
    <Card className="p-6" elevated>
      <SectionHeading title="Key Findings" subtitle="Prioritized signals for the Product & Data teams" />
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-muted text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
              <th className="px-4 py-3 font-medium">Insight</th>
              <th className="px-4 py-3 font-medium">Metric</th>
              <th className="px-4 py-3 font-medium">Impact</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {derivedData.keyFindings.map((f: any, i: number) => {
              const map = {
                warning: { cls: "bg-warning/12 text-warning", Icon: AlertTriangle, label: f.status },
                danger: { cls: "bg-danger/12 text-danger", Icon: CircleDot, label: f.status },
                opportunity: { cls: "bg-success/12 text-success", Icon: Sparkles, label: f.status },
              } as const;
              const investigate = f.status === "Investigate";
              const cfg = map[f.tone as keyof typeof map];
              const Icon = investigate ? Search : cfg.Icon;

              return (
                <tr
                  key={f.insight}
                  className={`text-[0.875rem] transition-colors hover:bg-black/[0.02] ${
                    i !== derivedData.keyFindings.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <td className="px-4 py-3.5 font-medium text-foreground">{f.insight}</td>
                  <td className="px-4 py-3.5 text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {f.metric}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{f.impact}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] ${cfg.cls}`}>
                      <Icon className="size-3.5" />
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
