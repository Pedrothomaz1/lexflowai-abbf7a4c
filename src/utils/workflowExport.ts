import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

type Contrato = { id: string; titulo: string; numero_contrato: string };
type Stage = { id: string; ordem: number; nome: string; tipo_acao: string };
type RunStage = {
  id: string; stage_id: string; ordem: number; status: string;
  decisao: string | null; comentario: string | null;
  executado_por: string | null; executado_em: string | null;
  due_at: string | null; created_at: string;
  regra_aplicada?: boolean;
};
type Run = { id: string; status: string; iniciado_em: string; concluido_em: string | null };

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";

function buildRows(
  stages: Stage[], runStages: RunStage[], userMap: Record<string, string>,
) {
  return runStages.map((rs) => {
    const stage = stages.find(s => s.id === rs.stage_id);
    return {
      ordem: rs.ordem,
      etapa: stage?.nome ?? "—",
      tipo: stage?.tipo_acao ?? "—",
      status: rs.status,
      decisao: rs.decisao ?? "—",
      regra: rs.regra_aplicada ? "Sim" : "Não",
      responsavel: rs.executado_por
        ? (userMap[rs.executado_por] ?? rs.executado_por.slice(0, 8))
        : "—",
      executadoEm: fmt(rs.executado_em),
      criadoEm: fmt(rs.created_at),
      sla: fmt(rs.due_at),
      comentario: rs.comentario ?? "",
    };
  });
}

export function exportWorkflowHistoryPDF(
  contrato: Contrato, run: Run, stages: Stage[], runStages: RunStage[],
  userMap: Record<string, string> = {},
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("Histórico de Workflow — LexFlow", 14, 16);
  doc.setFontSize(10);
  doc.text(`Contrato: ${contrato.numero_contrato} — ${contrato.titulo}`, 14, 24);
  doc.text(`Status do run: ${run.status}`, 14, 30);
  doc.text(
    `Iniciado: ${fmt(run.iniciado_em)}${run.concluido_em ? `  ·  Concluído: ${fmt(run.concluido_em)}` : ""}`,
    14, 36,
  );
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 42);

  const rows = buildRows(stages, runStages, userMap);
  autoTable(doc, {
    startY: 48,
    head: [["#", "Etapa", "Tipo", "Status", "Decisão", "Regra", "Responsável", "Executado em", "SLA", "Comentário"]],
    body: rows.map(r => [
      r.ordem, r.etapa, r.tipo, r.status, r.decisao, r.regra,
      r.responsavel, r.executadoEm, r.sla, r.comentario,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [22, 101, 52] },
    columnStyles: { 9: { cellWidth: 60 } },
  });
  doc.save(`workflow-${contrato.numero_contrato}.pdf`);
}

export async function exportWorkflowHistoryXLSX(
  contrato: Contrato, run: Run, stages: Stage[], runStages: RunStage[],
  userMap: Record<string, string> = {},
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Histórico");

  ws.addRow(["Contrato", `${contrato.numero_contrato} — ${contrato.titulo}`]);
  ws.addRow(["Status do run", run.status]);
  ws.addRow(["Iniciado em", fmt(run.iniciado_em)]);
  ws.addRow(["Concluído em", fmt(run.concluido_em)]);
  ws.addRow(["Gerado em", new Date().toLocaleString("pt-BR")]);
  ws.addRow([]);

  const header = ws.addRow([
    "#", "Etapa", "Tipo", "Status", "Decisão", "Regra aplicada",
    "Responsável", "Executado em", "SLA", "Criado em", "Comentário",
  ]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FF166534" },
  };

  const rows = buildRows(stages, runStages, userMap);
  rows.forEach(r => {
    ws.addRow([
      r.ordem, r.etapa, r.tipo, r.status, r.decisao, r.regra,
      r.responsavel, r.executadoEm, r.sla, r.criadoEm, r.comentario,
    ]);
  });

  ws.columns.forEach((c, i) => { c.width = i === 10 ? 50 : 18; });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `workflow-${contrato.numero_contrato}.xlsx`;
  a.click(); URL.revokeObjectURL(url);
}
