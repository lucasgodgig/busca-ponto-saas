import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useAuth } from "@/_core/hooks/useAuth";

export function useExportDashboard() {
  const { user } = useAuth();

  const exportToPDF = async () => {
    try {
      const dashboard = document.getElementById("dashboard-content");
      if (!dashboard) {
        throw new Error("Dashboard content not found");
      }

      // Capturar o dashboard como imagem
      const canvas = await html2canvas(dashboard, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Adicionar logo e cabeçalho
      const tenant = user?.memberships?.[0]?.tenant;
      if (tenant?.logoUrl) {
        try {
          // Adicionar logo no topo
          pdf.setFontSize(18);
          pdf.text(tenant.name, 105, 15, { align: "center" });
        } catch (e) {
          console.error("Erro ao adicionar logo:", e);
        }
      }

      // Adicionar título
      pdf.setFontSize(16);
      pdf.text("Dashboard - Busca Ponto", 105, 25, { align: "center" });
      
      // Adicionar data
      pdf.setFontSize(10);
      const date = new Date().toLocaleDateString("pt-BR");
      pdf.text(`Gerado em: ${date}`, 105, 32, { align: "center" });

      // Adicionar imagem do dashboard
      pdf.addImage(imgData, "PNG", 0, 40, imgWidth, imgHeight);
      heightLeft -= pageHeight - 40;

      // Adicionar páginas adicionais se necessário
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Salvar PDF
      const fileName = `dashboard-${date.replace(/\//g, "-")}.pdf`;
      pdf.save(fileName);

      return true;
    } catch (error) {
      console.error("Erro ao exportar dashboard:", error);
      return false;
    }
  };

  return { exportToPDF };
}

