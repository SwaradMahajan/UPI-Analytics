import { ArrowRight, CreditCard, Sparkles, Wallet } from "lucide-react";
import { SectionHeading } from "./primitives";
import { useSimulation } from "../SimulationContext";

function FlowStep({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "danger" | "purple" | "success";
}) {
  const tones: Record<string, string> = {
    neutral: "border-border bg-muted text-foreground/85",
    danger: "border-danger/40 bg-danger/[0.1] text-danger",
    purple: "border-primary/40 bg-primary/[0.08] text-primary",
    success: "border-success/40 bg-success/[0.1] text-success",
  };
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 text-center text-[0.8125rem] leading-tight ${tones[tone]}`}>
      {label}
    </div>
  );
}

function Arrow() {
  return <ArrowRight className="mx-auto size-4 shrink-0 rotate-90 text-muted-foreground md:rotate-0" />;
}

export function Opportunity() {
  const { state } = useSimulation();
  
  return (
    <section className="rounded-[1.15rem] border border-white/70 bg-[#fbf9f5]/85 p-6 backdrop-blur-xl shadow-[0_2px_4px_rgba(74,60,55,0.08),0_22px_48px_-26px_rgba(74,60,55,0.28),inset_0_1px_0_rgba(255,255,255,0.7)] md:p-8">
      <div>
        <SectionHeading
          title="Smart Fallback Opportunity"
          subtitle="Turning a dead-end failure screen into a recovered payment"
          right={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[0.6875rem] font-medium text-muted-foreground">
              <Sparkles className="size-3.5" />
              Product Proposal
            </span>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          {/* Flows */}
          <div className="flex flex-col gap-6">
            {/* Current */}
            <div>
              <div className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-danger">
                Current Experience
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-0">
                <div className="flex-1"><FlowStep label="Credit Card Payment" tone="neutral" /></div>
                <div className="md:px-2"><Arrow /></div>
                <div className="flex-1"><FlowStep label="Merchant Rejects" tone="danger" /></div>
                <div className="md:px-2"><Arrow /></div>
                <div className="flex-1"><FlowStep label="Generic Transaction Failed Screen" tone="danger" /></div>
                <div className="md:px-2"><Arrow /></div>
                <div className="flex-1"><FlowStep label={`${state.mdrChurn.toFixed(1)}% User Churn`} tone="danger" /></div>
              </div>
            </div>

            {/* Proposed */}
            <div>
              <div className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-foreground">
                Proposed Experience
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-0">
                <div className="flex-1"><FlowStep label="Credit Card Payment" tone="neutral" /></div>
                <div className="md:px-2"><Arrow /></div>
                <div className="flex-1"><FlowStep label="Merchant Rejects" tone="neutral" /></div>
                <div className="md:px-2"><Arrow /></div>
                <div className="flex-1"><FlowStep label="Smart Fallback Bottom Sheet" tone="purple" /></div>
                <div className="md:px-2"><Arrow /></div>
                <div className="flex-1"><FlowStep label="Pay via In-App Wallet" tone="purple" /></div>
                <div className="md:px-2"><Arrow /></div>
                <div className="flex-1"><FlowStep label="Higher Session Completion" tone="success" /></div>
              </div>
            </div>
          </div>

          {/* Bottom-sheet mockup */}
          <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border border-border bg-card-elevated shadow-2xl">
            <div className="border-b border-border px-5 py-3 text-center">
              <div className="mx-auto h-1 w-10 rounded-full bg-black/15" />
            </div>
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-danger/15 text-danger">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <div className="text-[0.9375rem] font-semibold text-foreground">
                    Credit Card blocked by merchant
                  </div>
                  <p className="mt-1 text-[0.75rem] leading-snug text-muted-foreground">
                    This merchant doesn't accept credit card payments via UPI.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-border bg-muted p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-success/15 text-success">
                    <Wallet className="size-4" />
                  </div>
                  <div>
                    <div className="text-[0.8125rem] text-foreground">In-App Wallet</div>
                    <div className="text-[0.6875rem] text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                      Balance: ₹8,620
                    </div>
                  </div>
                </div>
              </div>

              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[0.875rem] font-semibold text-white transition-colors hover:bg-primary/90">
                Pay ₹2,450 via In-App Wallet
                <ArrowRight className="size-4" />
              </button>
              <div className="mt-3 text-center text-[0.6875rem] text-muted-foreground">
                Instant · No merchant restrictions
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
