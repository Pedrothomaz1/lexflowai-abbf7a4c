import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportContratosPDF = (contratos: any[], fornecedores: any[]) => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text("Relatório de Contratos - LexFlow", 14, 20);
  
  // Data do relatório
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);
  
  // Preparar dados para a tabela
  const tableData = contratos.map((contrato) => {
    const fornecedor = fornecedores.find((f) => f.id === contrato.fornecedor_id);
    
    return [
      contrato.numero_contrato,
      contrato.titulo,
      contrato.tipo.replace("_", " "),
      contrato.status,
      fornecedor?.nome || "-",
      contrato.valor_total
        ? new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: contrato.moeda || "BRL",
          }).format(contrato.valor_total)
        : "-",
      contrato.data_inicio
        ? new Date(contrato.data_inicio).toLocaleDateString("pt-BR")
        : "-",
      contrato.data_fim
        ? new Date(contrato.data_fim).toLocaleDateString("pt-BR")
        : "-",
    ];
  });
  
  // Criar tabela
  autoTable(doc, {
    startY: 35,
    head: [
      [
        "Número",
        "Título",
        "Tipo",
        "Status",
        "Fornecedor",
        "Valor",
        "Início",
        "Término",
      ],
    ],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    margin: { top: 35 },
  });
  
  // Estatísticas no final
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  
  doc.setFontSize(12);
  doc.text("Resumo", 14, finalY + 15);
  
  doc.setFontSize(10);
  doc.text(`Total de Contratos: ${contratos.length}`, 14, finalY + 22);
  
  const contratosAtivos = contratos.filter((c) => c.status === "ativo").length;
  doc.text(`Contratos Ativos: ${contratosAtivos}`, 14, finalY + 28);
  
  const valorTotal = contratos.reduce(
    (sum, c) => sum + (c.valor_total || 0),
    0
  );
  doc.text(
    `Valor Total: ${new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valorTotal)}`,
    14,
    finalY + 34
  );
  
  // Salvar PDF
  doc.save(`contratos-lexflow-${new Date().toISOString().split("T")[0]}.pdf`);
};

export const exportContratoDetalhePDF = (
  contrato: any,
  fornecedor: any | null,
  aprovacoes: any[]
) => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text("Detalhes do Contrato - LexFlow", 14, 20);
  
  // Informações do contrato
  doc.setFontSize(12);
  doc.text(`Contrato Nº: ${contrato.numero_contrato}`, 14, 35);
  doc.text(`Título: ${contrato.titulo}`, 14, 42);
  doc.text(`Status: ${contrato.status}`, 14, 49);
  doc.text(`Tipo: ${contrato.tipo.replace("_", " ")}`, 14, 56);
  
  if (fornecedor) {
    doc.text(`Fornecedor: ${fornecedor.nome}`, 14, 63);
  }
  
  if (contrato.valor_total) {
    doc.text(
      `Valor: ${new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: contrato.moeda || "BRL",
      }).format(contrato.valor_total)}`,
      14,
      70
    );
  }
  
  if (contrato.data_inicio) {
    doc.text(
      `Data de Início: ${new Date(contrato.data_inicio).toLocaleDateString("pt-BR")}`,
      14,
      77
    );
  }
  
  if (contrato.data_fim) {
    doc.text(
      `Data de Término: ${new Date(contrato.data_fim).toLocaleDateString("pt-BR")}`,
      14,
      84
    );
  }
  
  // Descrição
  if (contrato.descricao) {
    doc.setFontSize(12);
    doc.text("Descrição:", 14, 95);
    doc.setFontSize(10);
    const splitDescription = doc.splitTextToSize(contrato.descricao, 180);
    doc.text(splitDescription, 14, 102);
  }
  
  // Aprovações
  if (aprovacoes.length > 0) {
    const startY = contrato.descricao ? 120 : 100;
    
    doc.setFontSize(12);
    doc.text("Histórico de Aprovações:", 14, startY);
    
    const approvalData = aprovacoes.map((aprov) => [
      aprov.status || "-",
      aprov.data_aprovacao
        ? new Date(aprov.data_aprovacao).toLocaleString("pt-BR")
        : "-",
      aprov.comentario || "-",
    ]);
    
    autoTable(doc, {
      startY: startY + 5,
      head: [["Status", "Data", "Comentário"]],
      body: approvalData,
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fillColor: [59, 130, 246],
      },
    });
  }
  
  // Salvar PDF
  doc.save(
    `contrato-${contrato.numero_contrato}-${new Date().toISOString().split("T")[0]}.pdf`
  );
};

export const exportFornecedoresPDF = (fornecedores: any[]) => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text("Relatório de Fornecedores - LexFlow", 14, 20);
  
  // Data do relatório
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);
  
  // Preparar dados para a tabela
  const tableData = fornecedores.map((fornecedor) => [
    fornecedor.nome,
    fornecedor.tipo_pessoa === "juridica" ? "PJ" : "PF",
    fornecedor.cnpj || fornecedor.cpf || "-",
    fornecedor.email || "-",
    fornecedor.telefone || "-",
    fornecedor.cidade && fornecedor.estado
      ? `${fornecedor.cidade} - ${fornecedor.estado}`
      : fornecedor.cidade || fornecedor.estado || "-",
  ]);
  
  // Criar tabela
  autoTable(doc, {
    startY: 35,
    head: [["Nome", "Tipo", "Documento", "Email", "Telefone", "Localização"]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });
  
  // Estatísticas
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  
  doc.setFontSize(12);
  doc.text("Resumo", 14, finalY + 15);
  
  doc.setFontSize(10);
  doc.text(`Total de Fornecedores: ${fornecedores.length}`, 14, finalY + 22);
  
  const pj = fornecedores.filter((f) => f.tipo_pessoa === "juridica").length;
  const pf = fornecedores.filter((f) => f.tipo_pessoa === "fisica").length;
  
  doc.text(`Pessoa Jurídica: ${pj}`, 14, finalY + 28);
  doc.text(`Pessoa Física: ${pf}`, 14, finalY + 34);
  
  // Salvar PDF
  doc.save(
    `fornecedores-lexflow-${new Date().toISOString().split("T")[0]}.pdf`
  );
};
