import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { KpiCards } from "./components/KpiCards";
import { StatusDistribution } from "./components/StatusDistribution";
import { Funnel } from "./components/Funnel";
import { ChurnAnalysis } from "./components/ChurnAnalysis";
import { Opportunity } from "./components/Opportunity";
import { Targets } from "./components/Targets";
import { FindingsTable } from "./components/FindingsTable";

export default function App() {
  return (
    <div className="relative min-h-screen w-full text-foreground">
      {/* Paper ground with soft warm light so the glass cards catch color (v11 aesthetic) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(60% 42% at 8% -4%, rgba(179,96,122,0.12), transparent 70%),
            radial-gradient(52% 40% at 100% 2%, rgba(196,131,166,0.12), transparent 70%),
            radial-gradient(60% 50% at 96% 100%, rgba(106,165,136,0.10), transparent 72%),
            radial-gradient(48% 40% at 0% 92%, rgba(217,154,91,0.10), transparent 72%),
            #f3f0ea`,
        }}
      />
      <Header />
      <main className="mx-auto max-w-[1440px] px-8 py-8">
        <div className="flex flex-col gap-8">
          <Hero />
          <KpiCards />
          <StatusDistribution />
          <Funnel />
          <ChurnAnalysis />
          <Opportunity />
          <Targets />
          <FindingsTable />
        </div>
        <footer className="mt-10 flex items-center justify-between border-t border-border pt-6 text-[0.75rem] text-muted-foreground">
          <span>Slice Analytics · UPI Payment Insights</span>
          <span>Data window: Jul 23 – Aug 22, 2026 · 10,000 transactions</span>
        </footer>
      </main>
    </div>
  );
}
