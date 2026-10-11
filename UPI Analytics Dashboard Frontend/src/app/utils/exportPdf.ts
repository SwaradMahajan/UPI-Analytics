import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { SimulationState } from "../SimulationContext";

export type ExportPdfOptions = {
  state: SimulationState;
  derivedData: {
    statusDistribution: any[];
    churnByFailure: any[];
    postRejection: any[];
    keyFindings: any[];
    kpis: any[];
  };
};

export async function exportDashboardToPdf({ state, derivedData }: ExportPdfOptions): Promise<void> {
  const mainElement = document.querySelector("main") as HTMLElement | null;
  if (!mainElement) {
    throw new Error("Dashboard content element not found");
  }

  // Create jsPDF instance in A4 portrait format (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // --- PAGE 1: EXECUTIVE INSIGHTS REPORT ---
  // Header background
  pdf.setFillColor(243, 240, 234); // #f3f0ea ground
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // Top Accent Bar
  pdf.setFillColor(179, 96, 122); // #b3607a primary
  pdf.rect(margin, margin, contentWidth, 3, "F");

  let y = margin + 12;

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(58, 53, 50); // #3a3532
  pdf.text("UPI Payment Failure & Recovery Analytics", margin, y);
  y += 7;

  // Subtitle
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(133, 125, 118); // #857d76
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  pdf.text(`Executive Insights & Performance Audit  |  Generated: ${dateStr}`, margin, y);
  y += 12;

  // Executive Overview Card
  pdf.setFillColor(251, 249, 245); // #fbf9f5 card
  pdf.setDrawColor(220, 214, 206);
  pdf.roundedRect(margin, y, contentWidth, 32, 2, 2, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(179, 96, 122);
  pdf.text("EXECUTIVE SUMMARY", margin + 6, y + 8);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(58, 53, 50);
  const summaryText =
    `This report analyzes UPI payment conversion, friction points, and merchant card credit rejections. ` +
    `Across ${state.totalTransactions.toLocaleString()} simulated transactions, merchant CC rejections account for ${state.mdrRate.toFixed(2)}% ` +
    `of total attempts and exhibit a steep ${state.mdrChurn.toFixed(1)}% 5-minute abandonment rate. ` +
    `Implementing intelligent fallback routing and real-time guidance can recover substantial lost transaction volume.`;
  
  const splitSummary = pdf.splitTextToSize(summaryText, contentWidth - 12);
  pdf.text(splitSummary, margin + 6, y + 16);
  y += 38;

  // KPI Grid (4 Cards)
  const cardWidth = (contentWidth - 9) / 4;
  const kpiData = [
    {
      label: "TOTAL VOLUME",
      val: state.totalTransactions.toLocaleString(),
      sub: "Transactions analyzed",
      color: [106, 165, 136],
    },
    {
      label: "SUCCESS RATE",
      val: `${state.successRate.toFixed(2)}%`,
      sub: "Completion benchmark",
      color: [106, 165, 136],
    },
    {
      label: "MDR REJECTIONS",
      val: `${state.mdrRate.toFixed(2)}%`,
      sub: `${Math.round(state.totalTransactions * (state.mdrRate / 100)).toLocaleString()} attempts blocked`,
      color: [217, 154, 91],
    },
    {
      label: "MDR CHURN RATE",
      val: `${state.mdrChurn.toFixed(1)}%`,
      sub: `${Math.round(state.totalTransactions * (state.mdrRate / 100) * (state.mdrChurn / 100)).toLocaleString()} users abandoned`,
      color: [212, 114, 110],
    },
  ];

  kpiData.forEach((kpi, idx) => {
    const kpiX = margin + idx * (cardWidth + 3);
    pdf.setFillColor(251, 249, 245);
    pdf.setDrawColor(220, 214, 206);
    pdf.roundedRect(kpiX, y, cardWidth, 24, 2, 2, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(133, 125, 118);
    pdf.text(kpi.label, kpiX + 4, y + 6);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    pdf.text(kpi.val, kpiX + 4, y + 14);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(133, 125, 118);
    pdf.text(kpi.sub, kpiX + 4, y + 20);
  });
  y += 30;

  // Key Strategic Findings
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(58, 53, 50);
  pdf.text("Key Analytical Findings", margin, y);
  y += 5;

  derivedData.keyFindings.forEach((finding) => {
    pdf.setFillColor(251, 249, 245);
    pdf.setDrawColor(220, 214, 206);
    pdf.roundedRect(margin, y, contentWidth, 14, 2, 2, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(58, 53, 50);
    pdf.text(finding.insight, margin + 5, y + 6);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(179, 96, 122);
    pdf.text(finding.metric, margin + 55, y + 6);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(133, 125, 118);
    pdf.text(finding.impact, margin + 5, y + 11);

    // Status pill
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(finding.tone === "danger" ? 212 : 217, finding.tone === "danger" ? 114 : 154, 91);
    pdf.text(finding.status.toUpperCase(), margin + contentWidth - 25, y + 8);

    y += 16;
  });
  y += 4;

  // Strategic Action Plan / Recommendations Card
  pdf.setFillColor(251, 249, 245);
  pdf.setDrawColor(220, 214, 206);
  pdf.roundedRect(margin, y, contentWidth, 42, 2, 2, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(179, 96, 122);
  pdf.text("RECOMMENDED PRODUCT ACTIONS", margin + 6, y + 7);

  const recommendations = [
    "1. In-App Fallback Prompt: Immediately prompt alternative UPI payment method or bank account upon CC rejection.",
    "2. Merchant Category Whitelisting: Provide merchants with real-time MDR tier guidance to prevent credit decline.",
    "3. Reduced Friction Routing: Save secondary backup VPA handles to auto-switch with single-tap biometric confirmation.",
    "4. Retargeting & Push Messaging: Nudge users who abandoned within 3 minutes with seamless 1-click cart reactivation.",
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(58, 53, 50);
  recommendations.forEach((rec, i) => {
    pdf.text(rec, margin + 6, y + 15 + i * 6.5);
  });

  // Footer of Page 1
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(133, 125, 118);
  pdf.text("UPI Analytics Dashboard  |  Confidential & Proprietary", margin, pageHeight - 10);
  pdf.text("Page 1 of 2", pageWidth - margin - 15, pageHeight - 10);

  // --- PAGE 2: VISUAL DASHBOARD SNAPSHOT ---
  try {
    const canvas = await html2canvas(mainElement, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: "#f3f0ea",
      windowWidth: 1440,
    });

    if (canvas && canvas.width > 0 && canvas.height > 0) {
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add visual snapshot page(s)
      pdf.addPage();
      pdf.setFillColor(243, 240, 234);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(58, 53, 50);
      pdf.text("Full Dashboard Visual Snapshot", margin, margin + 6);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(133, 125, 118);
      pdf.text("Live layout including charts, funnels, and target metrics", margin, margin + 11);

      const visualStartY = margin + 16;
      const availableHeight = pageHeight - visualStartY - margin;

      if (imgHeight <= availableHeight) {
        pdf.addImage(imgData, "PNG", margin, visualStartY, imgWidth, imgHeight, undefined, "FAST");
      } else {
        // Multi-page image slicing if full page is long
        let remainingHeight = imgHeight;
        let sY = 0;
        let currentPage = 2;

        while (remainingHeight > 0) {
          if (currentPage > 2) {
            pdf.addPage();
            pdf.setFillColor(243, 240, 234);
            pdf.rect(0, 0, pageWidth, pageHeight, "F");
          }

          const sliceH = Math.min(remainingHeight, availableHeight);
          // Scale source coordinates
          const sourceY = (sY / imgHeight) * canvas.height;
          const sourceH = (sliceH / imgHeight) * canvas.height;

          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = Math.round(sourceH);
          const ctx = sliceCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(
              canvas,
              0,
              sourceY,
              canvas.width,
              sourceH,
              0,
              0,
              sliceCanvas.width,
              sliceCanvas.height
            );
            const sliceData = sliceCanvas.toDataURL("image/png");
            pdf.addImage(sliceData, "PNG", margin, visualStartY, imgWidth, sliceH, undefined, "FAST");
          }

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(133, 125, 118);
          pdf.text("UPI Analytics Dashboard  |  Visual Section", margin, pageHeight - 8);
          pdf.text(`Page ${currentPage}`, pageWidth - margin - 15, pageHeight - 8);

          sY += sliceH;
          remainingHeight -= sliceH;
          currentPage++;
        }
      }
    }
  } catch (err) {
    console.warn("Could not capture visual canvas snapshot, saving insights summary PDF:", err);
  }

  // Trigger download
  const dateFormatted = new Date().toISOString().slice(0, 10);
  pdf.save(`UPI_Analytics_Insights_Report_${dateFormatted}.pdf`);
}
