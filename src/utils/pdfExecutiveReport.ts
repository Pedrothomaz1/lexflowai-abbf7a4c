import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const BRAND = { r: 16, g: 122, b: 86 }; // LexFlow green
const MUTED = { r: 100, g: 116, b: 139 };

const fmtCurrency = (v: number | null | undefined, moeda = "BRL") =>
  v == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(v);

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";

const riskLabel = (score: number | null | undefined) => {
  if (score == null) return { label: "Não avaliado", color: [148, 163, 184] as [number, number, number] };
  if (score >= 7) return { label: "ALTO", color: [220, 38, 38] as [number, number, number] };
  if (score >= 4) return { label: "MÉDIO", color: [217, 119, 6] as [number, number, number] };
  return { label: "BAIXO", color: [16, 122, 86] as [number, number, number] };
};

const tipoLabel = (tipo: string) => {
  const map: Record<string, string> = {
    prestacao_servicos: "Prestação de Serviços",
    fornecimento: "Fornecimento",
    locacao: "Locação",
    confidencialidade: "Confidencialidade",
    parceria: "Parceria",
    outro: "Outro",
  };
  return map[tipo] || tipo;
};

interface ExecutiveReportInput {
  contrato: any;
  fornecedor?: any | null;
  aprovacoes?: any[];
}

export async function exportContratoExecutivoPDF({
  contrato,
  fornecedor = null,
  aprovacoes = [],
}: ExecutiveReportInput) {
  // Fetch additional context in parallel
  const [analiseRes, complianceRes, versionsRes, workflowStagesRes] = await Promise.all([
    supabase
      .from("contract_analysis")
      .select("score_risco, riscos_identificados, clausulas_importantes, sugestoes_melhoria, skill_aplicada, analisado_em")
      .eq("contrato_id", contrato.id)
      .order("analisado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("contract_compliance_status")
      .select("*")
      .eq("contrato_id", contrato.id)
      .maybeSingle(),
    supabase
      .from("contract_versions")
      .select("versao, motivo, created_at")
      .eq("contrato_id", contrato.id)
      .order("versao", { ascending: false })
      .limit(10),
    supabase
      .from("workflow_run_stages")
      .select("ordem, status, decisao, comentario, executado_em, stage_id, workflow_runs!inner(contrato_id)")
      .eq("workflow_runs.contrato_id", contrato.id)
      .order("ordem", { ascending: true }),
  ]);

  const analise = analiseRes.data as any;
  const compliance = complianceRes.data as any;
  const versions = (versionsRes.data || []) as any[];
  const stages = (workflowStagesRes.data || []) as any[];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 0;

  // ===== Header / Capa =====
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageW, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Relatório Executivo de Contrato", margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("LexFlow • Gestão Preventiva de Contratos", margin, 26);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, 32);

  y = 50;

  // ===== Identificação =====
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(contrato.titulo || "Contrato", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    `Nº ${contrato.numero_contrato || "—"}  •  ${tipoLabel(contrato.tipo)}  •  v${contrato.versao || 1}  •  Status: ${contrato.status}`,
    margin,
    y
  );
  y += 8;

  // ===== Sumário Executivo (KPIs) =====
  doc.setTextColor(0, 0, 0);
  const risk = riskLabel(analise?.score_risco);
  const kpis = [
    ["Fornecedor", fornecedor?.nome || "—"],
    ["Valor Total", fmtCurrency(contrato.valor_total, contrato.moeda || "BRL")],
    ["Vigência", `${fmtDate(contrato.data_inicio)} → ${fmtDate(contrato.data_fim)}`],
    ["Risco", risk.label + (analise?.score_risco != null ? ` (${analise.score_risco})` : "")],
  ];
  autoTable(doc, {
    startY: y,
    body: kpis,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: { top: 2, bottom: 2, left: 0, right: 4 } },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [MUTED.r, MUTED.g, MUTED.b], cellWidth: 35 },
      1: { textColor: [0, 0, 0] },
    },
    didParseCell: (data) => {
      if (data.row.index === 3 && data.column.index === 1) {
        data.cell.styles.textColor = risk.color;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ===== Descrição =====
  if (contrato.descricao) {
    sectionTitle(doc, "Objeto / Descrição", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(contrato.descricao, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 4;
  }

  // ===== Análise de Risco =====
  if (analise) {
    y = ensureSpace(doc, y, 30);
    sectionTitle(doc, "Análise de Risco", margin, y);
    y += 4;
    const riscos = Array.isArray(analise.riscos_identificados) ? analise.riscos_identificados : [];
    if (riscos.length > 0) {
      autoTable(doc, {
        startY: y + 2,
        head: [["Risco", "Severidade", "Recomendação"]],
        body: riscos.map((r: any) => [
          r.descricao || r.risco || r.titulo || "—",
          (r.severidade || r.nivel || "—").toString().toUpperCase(),
          r.recomendacao || r.mitigacao || "—",
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
      doc.text("Nenhum risco crítico identificado pela análise.", margin, y + 4);
      y += 8;
    }

    const sugestoes = Array.isArray(analise.sugestoes_melhoria) ? analise.sugestoes_melhoria : [];
    if (sugestoes.length > 0) {
      y = ensureSpace(doc, y, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Recomendações", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      sugestoes.slice(0, 8).forEach((s: any) => {
        const text = typeof s === "string" ? s : s.descricao || s.recomendacao || JSON.stringify(s);
        const lines = doc.splitTextToSize(`• ${text}`, pageW - margin * 2);
        y = ensureSpace(doc, y, lines.length * 4.5);
        doc.text(lines, margin, y);
        y += lines.length * 4.5 + 1;
      });
      y += 2;
    }
  }

  // ===== Cláusulas Importantes =====
  const clausulas = Array.isArray(analise?.clausulas_importantes) ? analise.clausulas_importantes : [];
  if (clausulas.length > 0) {
    y = ensureSpace(doc, y, 25);
    sectionTitle(doc, "Cláusulas Críticas", margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["Cláusula", "Resumo"]],
      body: clausulas.slice(0, 15).map((c: any) => [
        c.tipo || c.titulo || c.nome || "—",
        c.resumo || c.descricao || c.conteudo || "—",
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Compliance =====
  if (compliance) {
    y = ensureSpace(doc, y, 20);
    sectionTitle(doc, "Compliance", margin, y);
    y += 4;
    const cKpis: any[] = [];
    Object.entries(compliance).forEach(([k, v]) => {
      if (["id", "contrato_id", "organization_id", "created_at", "updated_at"].includes(k)) return;
      cKpis.push([k.replace(/_/g, " "), v == null ? "—" : String(v)]);
    });
    if (cKpis.length > 0) {
      autoTable(doc, {
        startY: y,
        body: cKpis,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // ===== Workflow / Aprovações =====
  if (stages.length > 0) {
    y = ensureSpace(doc, y, 25);
    sectionTitle(doc, "Workflow de Aprovação", margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["#", "Status", "Decisão", "Executado em", "Comentário"]],
      body: stages.map((s: any) => [
        s.ordem,
        s.status,
        s.decisao || "—",
        fmtDateTime(s.executado_em),
        s.comentario || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else if (aprovacoes.length > 0) {
    y = ensureSpace(doc, y, 25);
    sectionTitle(doc, "Aprovações", margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["Status", "Data", "Comentário"]],
      body: aprovacoes.map((a: any) => [
        a.status || "—",
        fmtDateTime(a.data_aprovacao || a.created_at),
        a.comentario || "—",
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Histórico de Versões =====
  if (versions.length > 0) {
    y = ensureSpace(doc, y, 25);
    sectionTitle(doc, "Histórico de Versões", margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["Versão", "Data", "Motivo"]],
      body: versions.map((v: any) => [`v${v.versao}`, fmtDateTime(v.created_at), v.motivo || "—"]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Rodapé com numeração =====
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(
      `LexFlow • Relatório Executivo • ${contrato.numero_contrato || ""}`,
      margin,
      pageH - 8
    );
    doc.text(`${i} / ${total}`, pageW - margin, pageH - 8, { align: "right" });
  }

  doc.save(
    `relatorio-executivo-${contrato.numero_contrato || contrato.id}-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

function sectionTitle(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(text, x, y);
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.4);
  doc.line(x, y + 1.5, x + 50, y + 1.5);
  doc.setTextColor(0, 0, 0);
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 15) {
    doc.addPage();
    return 20;
  }
  return y;
}
