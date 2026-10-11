import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { COLORS } from "./components/data";

export type SimulationState = {
  totalTransactions: number;
  successRate: number; // 0-100
  mdrRate: number; // 0-100
  mdrChurn: number; // 0-100
};

export type SimulationContextType = {
  state: SimulationState;
  setState: React.Dispatch<React.SetStateAction<SimulationState>>;
  derivedData: {
    statusDistribution: any[];
    churnByFailure: any[];
    postRejection: any[];
    spark: any;
    keyFindings: any[];
    kpis: any[];
  };
};

const defaultState: SimulationState = {
  totalTransactions: 10000,
  successRate: 83.73,
  mdrRate: 2.07,
  mdrChurn: 62.8,
};

const SimulationContext = createContext<SimulationContextType | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimulationState>(defaultState);

  const derivedData = useMemo(() => {
    const { totalTransactions, successRate, mdrRate, mdrChurn } = state;
    
    const successCount = Math.round(totalTransactions * (successRate / 100));
    const mdrCount = Math.round(totalTransactions * (mdrRate / 100));
    
    const remainingCount = totalTransactions - successCount - mdrCount;
    const insufficientCount = Math.round(remainingCount * (5.02 / 14.2));
    const timeoutCount = Math.round(remainingCount * (4.65 / 14.2));
    const networkCount = remainingCount - insufficientCount - timeoutCount;

    const statusDistribution = [
      { key: "success", label: "SUCCESS", count: successCount, pct: successRate, color: COLORS.success },
      { key: "insufficient", label: "INSUFFICIENT_BALANCE", count: insufficientCount, pct: (insufficientCount/totalTransactions)*100, color: COLORS.blue },
      { key: "timeout", label: "TIMEOUT", count: timeoutCount, pct: (timeoutCount/totalTransactions)*100, color: COLORS.warning },
      { key: "network", label: "NETWORK_ERROR", count: networkCount, pct: (networkCount/totalTransactions)*100, color: "#b0a69c" },
      { key: "mdr", label: "MERCHANT_CC_REJECTED", count: mdrCount, pct: mdrRate, color: COLORS.magenta, highlight: true },
    ];

    const churnByFailure = [
      { label: "Merchant CC Rejected", churn: mdrChurn, level: "highest" },
      { label: "Timeout", churn: 24.1, level: "medium" },
      { label: "Network Error", churn: 21.6, level: "medium" },
      { label: "Insufficient Balance", churn: 11.4, level: "lower" },
    ];

    const postRejection = [
      { name: "Churned", value: mdrChurn, users: Math.round(mdrCount * (mdrChurn/100)), color: COLORS.danger },
      { name: "Retained", value: 100 - mdrChurn, users: Math.round(mdrCount * ((100-mdrChurn)/100)), color: COLORS.success },
    ];

    const spark = {
      transactions: [7100, 7480, 7220, 8010, 8640, 9210, 9560, totalTransactions],
      success: [79.1, 80.4, 81.2, 82.0, 82.6, 83.1, 83.5, successRate],
      mdr: [140, 156, 168, 172, 185, 191, 199, mdrCount],
      churn: [58.2, 59.4, 60.1, 60.9, 61.6, 62.0, 62.4, mdrChurn],
    };

    const keyFindings = [
      {
        insight: "MDR Rejections",
        metric: `${mdrRate.toFixed(2)}% of all transactions`,
        impact: "High downstream impact",
        status: "Needs attention",
        tone: "warning",
      },
      {
        insight: "Failure Contribution",
        metric: `${((mdrCount / (totalTransactions - successCount)) * 100).toFixed(1)}% of failed transactions`,
        impact: "Major non-technical failure source",
        status: "Investigate",
        tone: "warning",
      },
      {
        insight: "Post-Rejection Churn",
        metric: `${mdrChurn.toFixed(1)}%`,
        impact: "Primary product opportunity",
        status: "Critical",
        tone: "danger",
      },
      {
        insight: "Organic Fallback",
        metric: `${(100 - mdrChurn).toFixed(1)}%`,
        impact: "Users discover workaround without guidance",
        status: "Opportunity",
        tone: "opportunity",
      },
    ];

    const kpis = [
      {
        label: "Total Transactions",
        value: totalTransactions.toLocaleString(),
        sub: "8.4% vs previous period",
        subTone: "up",
        icon: "Activity",
        accent: COLORS.blue,
        spark: spark.transactions,
      },
      {
        label: "Successful Payments",
        value: successCount.toLocaleString(),
        sub: `${successRate.toFixed(2)}% success rate`,
        subTone: "up",
        icon: "CheckCircle2",
        accent: COLORS.success,
        spark: spark.success,
      },
      {
        label: "MDR Rejections",
        value: mdrCount.toLocaleString(),
        sub: `${mdrRate.toFixed(2)}% of total transactions`,
        subTone: "neutral",
        icon: "AlertOctagon",
        accent: COLORS.warning,
        spark: spark.mdr,
      },
      {
        label: "5-Minute Churn",
        value: `${mdrChurn.toFixed(1)}%`,
        sub: `${Math.round(mdrCount * (mdrChurn/100))} users abandoned`,
        subTone: "down",
        icon: "TrendingDown",
        accent: COLORS.danger,
        spark: spark.churn,
        border: "border-danger/40",
      },
    ];

    return { statusDistribution, churnByFailure, postRejection, spark, keyFindings, kpis };
  }, [state]);

  return (
    <SimulationContext.Provider value={{ state, setState, derivedData }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used inside SimulationProvider");
  return ctx;
}
