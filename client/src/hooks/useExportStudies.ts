import { utils, writeFile } from "xlsx";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_analise: "Em Análise",
  devolvido: "Devolvido",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export function useExportStudies() {
  const exportToExcel = (studies: any[], filename = "estudos") => {
    try {
      // Preparar dados para exportação
      const data = studies.map((study) => ({
        ID: study.id,
        Título: study.title,
        Endereço: study.address || "N/A",
        Segmento: study.segment,
        Status: STATUS_LABELS[study.status] || study.status,
        "Criado em": new Date(study.createdAt).toLocaleDateString("pt-BR"),
        "Atualizado em": new Date(study.updatedAt).toLocaleDateString("pt-BR"),
        Observações: study.notes || "",
      }));

      // Criar worksheet
      const ws = utils.json_to_sheet(data);

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 8 },  // ID
        { wch: 30 }, // Título
        { wch: 40 }, // Endereço
        { wch: 15 }, // Segmento
        { wch: 15 }, // Status
        { wch: 15 }, // Criado em
        { wch: 15 }, // Atualizado em
        { wch: 50 }, // Observações
      ];
      ws["!cols"] = colWidths;

      // Criar workbook
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Estudos");

      // Salvar arquivo
      const timestamp = new Date().toISOString().split("T")[0];
      writeFile(wb, `${filename}_${timestamp}.xlsx`);

      toast.success(`${data.length} estudos exportados com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar estudos");
    }
  };

  const exportToCSV = (studies: any[], filename = "estudos") => {
    try {
      // Preparar dados para exportação
      const data = studies.map((study) => ({
        ID: study.id,
        Título: study.title,
        Endereço: study.address || "N/A",
        Segmento: study.segment,
        Status: STATUS_LABELS[study.status] || study.status,
        "Criado em": new Date(study.createdAt).toLocaleDateString("pt-BR"),
        "Atualizado em": new Date(study.updatedAt).toLocaleDateString("pt-BR"),
        Observações: study.notes || "",
      }));

      // Criar worksheet
      const ws = utils.json_to_sheet(data);

      // Converter para CSV
      const csv = utils.sheet_to_csv(ws);

      // Criar blob e download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const timestamp = new Date().toISOString().split("T")[0];
      link.setAttribute("download", `${filename}_${timestamp}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${data.length} estudos exportados com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar estudos");
    }
  };

  return {
    exportToExcel,
    exportToCSV,
  };
}

