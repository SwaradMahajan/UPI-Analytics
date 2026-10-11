import { ArrowRight, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { Card, SectionHeading } from "./primitives";
import { useSimulation } from "../SimulationContext";

export function Funnel() {
  const { derivedData, state } = useSimulation();
  
  // Find MDR count
  const mdrStatus = derivedData.statusDistribution.find((s: any) => s.key === "mdr");
  const totalMDR = mdrStatus?.count || 0;
  
  // Find churned/retained
  const churned = derivedData.postRejection.find((p: any) => p.name === "Churned");
  const retained = derivedData.postRejection.find((p: any) => p.name === "Retained");

  return (
    <Card className="p-6" elevated>
      <SectionHeading
        title="MDR Rejection → User Outcome Funnel"
        subtitle="What happens to users after a merchant rejects their primary Credit Card"
      />

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[220px_48px_1fr]">
        {/* Step 1 */}
        <div className="flex flex-col justify-center rounded-xl border border-border bg-card-elevated p-6 text-center">
          <div className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">
            Entry Point
          </div>
          <div className="mt-2 text-[3rem] font-bold leading-none tracking-tight text-foreground" style={{ fontSize: "3rem", fontVariantNumeric: "tabular-nums" }}>
            {totalMDR.toLocaleString()}
          </div>
          <div className="mt-2 text-[0.8125rem] text-muted-foreground">MDR Rejections</div>
        </div>

        {/* Connector */}
        <div className="hidden items-center justify-center lg:flex">
          <div className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground">
            <ArrowRight className="size-4" />
          </div>
        </div>

        {/* Split paths */}
        <div className="flex flex-col gap-4">
          {/* Churned — larger, prominent */}
          <div className="rounded-xl border border-danger/35 bg-danger/[0.08] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-danger">
                  <TrendingDown className="size-4" />
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]">
                    Churned Path
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-[2.75rem] font-bold leading-none tracking-tight text-foreground" style={{ fontSize: "2.75rem", fontVariantNumeric: "tabular-nums" }}>
                    {churned?.users.toLocaleString()}
                  </span>
                  <span className="text-[1.5rem] font-semibold text-danger" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {churned?.value.toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1.5 text-[0.8125rem] text-foreground/80">
                  Abandoned the app within 5 minutes
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
              <div className="h-full rounded-full bg-danger" style={{ width: `${churned?.value}%` }} />
            </div>
          </div>

          {/* Retained — smaller */}
          <div className="rounded-xl border border-success/30 bg-success/[0.07] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-success">
                  <TrendingUp className="size-4" />
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]">
                    Retained Path
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-[1.75rem] font-bold leading-none tracking-tight text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {retained?.users.toLocaleString()}
                  </span>
                  <span className="text-[1.125rem] font-semibold text-success" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {retained?.value.toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1 text-[0.8125rem] text-muted-foreground">
                  Retried successfully using In-App Wallet
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
              <div className="h-full rounded-full bg-success" style={{ width: `${retained?.value}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Insight banner */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-muted p-4">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-black/[0.05] text-muted-foreground">
          <Lightbulb className="size-4" />
        </div>
        <p className="text-[0.875rem] leading-relaxed text-foreground/90">
          The biggest opportunity is immediately after a merchant rejects a CC.
          Only <span className="font-semibold text-foreground">{retained?.value.toFixed(1)}%</span> of users
          discover the Wallet Fallback workaround organically.
        </p>
      </div>
    </Card>
  );
}
