import { Activity, AlertOctagon, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { Card, Sparkline } from "./primitives";
import { COLORS } from "./data";
import { useSimulation } from "../SimulationContext";

const ICONS = {
  Activity,
  CheckCircle2,
  AlertOctagon,
  TrendingDown,
};

export function KpiCards() {
  const { derivedData } = useSimulation();

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {derivedData.kpis.map((k: any) => {
        const IconComponent = ICONS[k.icon as keyof typeof ICONS];
        return (
          <Card key={k.label} className={`p-5 ${k.border ?? ""}`} elevated>
            <div className="flex items-start justify-between">
              <div
                className="grid size-9 place-items-center rounded-lg"
                style={{ backgroundColor: `${k.accent}1f`, color: k.accent }}
              >
                <IconComponent className="size-4.5" />
              </div>
              <Sparkline data={k.spark} color={k.accent} />
            </div>
            <div className="mt-4 text-[0.75rem] uppercase tracking-[0.1em] text-muted-foreground">
              {k.label}
            </div>
            <div
              className="mt-1.5 text-[2rem] font-bold leading-none tracking-tight text-foreground"
              style={{ fontSize: "2rem", fontVariantNumeric: "tabular-nums" }}
            >
              {k.value}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[0.75rem]">
              {k.subTone === "up" && <TrendingUp className="size-3.5 text-success" />}
              {k.subTone === "down" && <TrendingDown className="size-3.5 text-danger" />}
              <span
                className={
                  k.subTone === "up"
                    ? "text-success"
                    : k.subTone === "down"
                    ? "text-danger"
                    : "text-muted-foreground"
                }
              >
                {k.sub}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
