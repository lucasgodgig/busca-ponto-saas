import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";

interface PDFReportProps {
  address: string;
  segment: string;
  data: any;
}

export function PDFReport({ address, segment, data }: PDFReportProps) {
  const generatePDF = async () => {
    if (!data) {
      alert("Nenhum dado disponível para exportar");
      return;
    }

    try {
      // Extrair dados da estrutura correta
      const habitantes = data.head?.people || data.people || 0;
      const rendaMedia = data.head?.income || data.income || 0;
      const rendaPerCapita = rendaMedia / 2.5;
      const domicilios = Math.round(habitantes / 2.8);
      const potencialConsumo = data.head?.consumer || data.consumer || 0;

      // Dados de classe social
      const classData = [
        { label: "A1", value: data.classes?.find((c: any) => c.sigla === "A1")?.domicilios || 0 },
        { label: "A2", value: data.classes?.find((c: any) => c.sigla === "A2")?.domicilios || 0 },
        { label: "B1", value: data.classes?.find((c: any) => c.sigla === "B1")?.domicilios || 0 },
        { label: "B2", value: data.classes?.find((c: any) => c.sigla === "B2")?.domicilios || 0 },
        { label: "C", value: data.classes?.find((c: any) => c.sigla === "C")?.domicilios || 0 },
        { label: "D", value: data.classes?.find((c: any) => c.sigla === "D")?.domicilios || 0 },
        { label: "E", value: data.classes?.find((c: any) => c.sigla === "E")?.domicilios || 0 },
      ];

      const totalClass = classData.reduce((sum, c) => sum + c.value, 0);

      // Dados de consumo por categoria
      const consumoData = data.categorias?.filter((c: any) => c.valor > 0) || [];

      // Criar PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;

      // Cabeçalho
      pdf.setFillColor(37, 99, 235);
      pdf.rect(10, 10, pageWidth - 20, 20, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("Sistema Busca Ponto", 15, 22);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("Análise de Localização", 15, 28);

      yPosition = 40;

      // Data do relatório
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(9);
      pdf.text(`Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 15, yPosition);
      yPosition += 8;

      // Informações principais
      pdf.setFillColor(240, 249, 255);
      pdf.rect(10, yPosition, pageWidth - 20, 25, "F");
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("INFORMAÇÕES PRINCIPAIS", 15, yPosition + 5);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(`Endereço: ${address || "Não informado"}`, 15, yPosition + 12);
      pdf.text(`Segmento: ${segment || "Não informado"}`, 15, yPosition + 18);
      pdf.text(`Raio de Análise: 1.5 km`, 15, yPosition + 24);
      yPosition += 30;

      // Dados Demográficos
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(37, 99, 235);
      pdf.text("DADOS DEMOGRÁFICOS", 15, yPosition);
      yPosition += 8;

      // Cards de dados
      const cardWidth = (pageWidth - 30) / 3;
      const cardHeight = 20;

      // Card 1: Habitantes
      pdf.setFillColor(255, 245, 230);
      pdf.rect(10, yPosition, cardWidth, cardHeight, "F");
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Habitantes", 12, yPosition + 5);
      pdf.setFontSize(14);
      pdf.text(habitantes.toLocaleString("pt-BR"), 12, yPosition + 13);

      // Card 2: Renda Média
      pdf.setFillColor(240, 253, 244);
      pdf.rect(10 + cardWidth + 5, yPosition, cardWidth, cardHeight, "F");
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Renda Média", 12 + cardWidth + 5, yPosition + 5);
      pdf.setFontSize(14);
      pdf.text(`R$ ${(rendaMedia).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, 12 + cardWidth + 5, yPosition + 13);

      // Card 3: Domicílios
      pdf.setFillColor(239, 246, 255);
      pdf.rect(10 + (cardWidth + 5) * 2, yPosition, cardWidth, cardHeight, "F");
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Domicílios", 12 + (cardWidth + 5) * 2, yPosition + 5);
      pdf.setFontSize(14);
      pdf.text(domicilios.toLocaleString("pt-BR"), 12 + (cardWidth + 5) * 2, yPosition + 13);

      yPosition += 25;

      // Potencial de Consumo
      pdf.setFillColor(248, 249, 250);
      pdf.rect(10, yPosition, pageWidth - 20, 15, "F");
      pdf.setTextColor(37, 99, 235);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Potencial de Consumo Total", 15, yPosition + 5);
      pdf.setFontSize(16);
      pdf.text(`R$ ${(potencialConsumo / 1000000).toFixed(1)}M`, 15, yPosition + 12);
      yPosition += 20;

      // Distribuição por Classe Social
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(37, 99, 235);
      pdf.text("DISTRIBUIÇÃO POR CLASSE SOCIAL", 15, yPosition);
      yPosition += 8;

      // Tabela de classes
      pdf.setFillColor(37, 99, 235);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Classe", 15, yPosition);
      pdf.text("Quantidade", 80, yPosition);
      pdf.text("Percentual", 130, yPosition);
      yPosition += 6;

      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);

      classData.forEach((cls, idx) => {
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(10, yPosition - 3, pageWidth - 20, 5, "F");
        }
        pdf.text(`Classe ${cls.label}`, 15, yPosition);
        pdf.text(cls.value.toLocaleString("pt-BR"), 80, yPosition);
        pdf.text(`${totalClass > 0 ? ((cls.value / totalClass) * 100).toFixed(1) : 0}%`, 130, yPosition);
        yPosition += 5;
      });

      yPosition += 5;

      // Potencial de Consumo por Categoria
      if (consumoData.length > 0) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(37, 99, 235);
        pdf.text("POTENCIAL DE CONSUMO POR CATEGORIA", 15, yPosition);
        yPosition += 8;

        // Tabela de consumo
        pdf.setFillColor(37, 99, 235);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text("Categoria", 15, yPosition);
        pdf.text("Valor", 130, yPosition);
        yPosition += 6;

        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);

        consumoData.forEach((cat: any, idx: number) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 15;
          }

          if (idx % 2 === 0) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(10, yPosition - 3, pageWidth - 20, 5, "F");
          }
          pdf.text(cat.rotulo, 15, yPosition);
          pdf.text(`R$ ${(cat.valor / 1000000).toFixed(2)}M`, 130, yPosition);
          yPosition += 5;
        });
      }

      // Rodapé
      yPosition = pageHeight - 15;
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(8);
      pdf.text("Relatório gerado automaticamente pelo Sistema Busca Ponto", 15, yPosition);
      pdf.text("© 2025 Sistema Busca Ponto. Todos os direitos reservados.", 15, yPosition + 5);

      // Salvar PDF
      pdf.save(`relatorio-busca-ponto-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    }
  };

  return (
    <Button onClick={generatePDF} className="gap-2">
      <Download className="h-4 w-4" />
      Exportar Relatório
    </Button>
  );
}

