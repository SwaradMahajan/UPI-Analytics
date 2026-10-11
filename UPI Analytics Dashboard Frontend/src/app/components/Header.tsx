import { useState } from "react";
import { Download, SlidersHorizontal, Zap } from "lucide-react";
import { navItems } from "./data";
import { useSimulation } from "../SimulationContext";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";

export function Header() {
  const [active, setActive] = useState("Dashboard");
  const { state, setState } = useSimulation();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-primary">
            <Zap className="size-4.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <div className="text-[0.9375rem] font-semibold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              FINTECH ANALYTICS
            </div>
            <div className="mt-1 text-[0.625rem] tracking-[0.18em] text-muted-foreground">
              UPI PAYMENT INSIGHTS
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => {
                setActive(item);
                document.getElementById(item)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`relative rounded-lg px-3 py-2 text-[0.8125rem] transition-colors ${
                active === item
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item}
              {active === item && (
                <span className="absolute inset-x-3 -bottom-[21px] h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="grid size-9 place-items-center rounded-lg border border-border bg-input text-muted-foreground transition-colors hover:text-foreground">
                <SlidersHorizontal className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-5" align="end">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold leading-none text-foreground">Simulation Settings</h4>
                  <p className="mt-1 text-[0.8125rem] text-muted-foreground">Adjust data parameters for the dashboard.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="txns">Total Transactions</Label>
                      <span className="text-[0.8125rem] text-muted-foreground">{state.totalTransactions.toLocaleString()}</span>
                    </div>
                    <Slider id="txns" min={5000} max={50000} step={1000} value={[state.totalTransactions]} onValueChange={([v]) => setState(s => ({...s, totalTransactions: v}))} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="success">Success Rate (%)</Label>
                      <span className="text-[0.8125rem] text-muted-foreground">{state.successRate.toFixed(2)}%</span>
                    </div>
                    <Slider id="success" min={50} max={99} step={0.1} value={[state.successRate]} onValueChange={([v]) => setState(s => ({...s, successRate: v}))} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="mdr">MDR Rejections (%)</Label>
                      <span className="text-[0.8125rem] text-muted-foreground">{state.mdrRate.toFixed(2)}%</span>
                    </div>
                    <Slider id="mdr" min={0.5} max={15} step={0.1} value={[state.mdrRate]} onValueChange={([v]) => setState(s => ({...s, mdrRate: v}))} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="churn">MDR Churn (%)</Label>
                      <span className="text-[0.8125rem] text-muted-foreground">{state.mdrChurn.toFixed(1)}%</span>
                    </div>
                    <Slider id="churn" min={10} max={95} step={0.1} value={[state.mdrChurn]} onValueChange={([v]) => setState(s => ({...s, mdrChurn: v}))} />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <button className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-[0.8125rem] font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Download className="size-3.5" />
            Export
          </button>
        </div>
      </div>
    </header>
  );
}
