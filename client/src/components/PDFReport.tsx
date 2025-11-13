import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface PDFReportProps {
  address: string;
  segment: string;
  data: any;
}

export function PDFReport({ address, segment, data }: PDFReportProps) {
  const generatePDF = () => {
    if (!data) {
      alert("Nenhum dado disponível para exportar");
      return;
    }

    // Extrair dados da estrutura correta
    const habitantes = data.head?.pessoas || data.people || 0;
    const rendaMedia = data.head?.renda_media || data.income || 0;
    const rendaPerCapita = rendaMedia / 2.5; // Aproximação
    const domicilios = Math.round(habitantes / 2.8);
    const potencialConsumo = data.head?.potencial_consumo || data.consumer || 0;

    // Dados de classe social
    const classData = [
      { label: "A1", value: data.head?.class_a1 || data.class_a1 || 0 },
      { label: "A2", value: data.head?.class_a2 || data.class_a2 || 0 },
      { label: "B1", value: data.head?.class_b1 || data.class_b1 || 0 },
      { label: "B2", value: data.head?.class_b2 || data.class_b2 || 0 },
      { label: "C", value: data.head?.class_c || data.class_c || 0 },
      { label: "D", value: data.head?.class_d || data.class_d || 0 },
      { label: "E", value: data.head?.class_e || data.class_e || 0 },
    ];

    const totalClass = classData.reduce((sum, c) => sum + c.value, 0);

    // Dados de consumo por categoria
    const consumoData = [
      { label: "Alimentação", value: data.head?.cons_alimentacao || 0 },
      { label: "Habitação", value: data.head?.cons_habitacao || 0 },
      { label: "Vestuário", value: data.head?.cons_vestuario || 0 },
      { label: "Transporte", value: data.head?.cons_transporte || 0 },
      { label: "Higiene & Cuidados", value: data.head?.cons_higiene || 0 },
      { label: "Saúde", value: data.head?.cons_saude || 0 },
      { label: "Educação", value: data.head?.cons_educacao || 0 },
      { label: "Lazer", value: data.head?.cons_lazer || 0 },
      { label: "Serviços Pessoais", value: data.head?.cons_servicos || 0 },
      { label: "Outros", value: data.head?.cons_outros || 0 },
    ].filter(c => c.value > 0);

    // Criar elemento com o relatório
    const element = document.createElement("div");
    element.id = "pdf-report";
    element.innerHTML = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; max-width: 1000px; margin: 0 auto; line-height: 1.6;">
        <!-- Cabeçalho -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
          <div>
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Sistema Busca Ponto</h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Análise de Localização</p>
          </div>
          <div style="text-align: right; font-size: 12px; color: #666;">
            <p style="margin: 0;">Relatório Gerado em</p>
            <p style="margin: 5px 0 0 0; font-weight: bold;">${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
          </div>
        </div>

        <!-- Informações Principais -->
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #2563eb;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
            <div>
              <div style="font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">Endereço</div>
              <div style="font-size: 14px; font-weight: 500;">${address || "Não informado"}</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">Segmento</div>
              <div style="font-size: 14px; font-weight: 500; text-transform: capitalize;">${segment || "Não informado"}</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #666; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">Raio de Análise</div>
              <div style="font-size: 14px; font-weight: 500;">1.5 km</div>
            </div>
          </div>
        </div>

        <!-- Dados Demográficos -->
        <h2 style="color: #2563eb; font-size: 18px; margin: 30px 0 20px 0; border-left: 4px solid #2563eb; padding-left: 12px; font-weight: 600;">
          Dados Demográficos
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%); padding: 20px; border-radius: 8px; border-left: 4px solid #f97316;">
            <div style="font-size: 11px; color: #92400e; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">Habitantes</div>
            <div style="font-size: 28px; font-weight: bold; color: #f97316;">${habitantes.toLocaleString("pt-BR")}</div>
            <div style="font-size: 12px; color: #b45309; margin-top: 8px;">${(habitantes / 100).toFixed(1)} hab/hectare</div>
          </div>
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
            <div style="font-size: 11px; color: #166534; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">Renda Média</div>
            <div style="font-size: 28px; font-weight: bold; color: #22c55e;">R$ ${(rendaMedia).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
            <div style="font-size: 12px; color: #4ade80; margin-top: 8px;">Per capita: R$ ${(rendaPerCapita).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
          </div>
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <div style="font-size: 11px; color: #1e40af; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">Domicílios</div>
            <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">${domicilios.toLocaleString("pt-BR")}</div>
            <div style="font-size: 12px; color: #60a5fa; margin-top: 8px;">Estimados na área</div>
          </div>
        </div>

        <!-- Potencial de Consumo -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #2563eb;">
          <h3 style="color: #2563eb; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">Potencial de Consumo Total</h3>
          <div style="font-size: 32px; font-weight: bold; color: #2563eb;">R$ ${(potencialConsumo / 1000000).toFixed(1)}M</div>
          <div style="font-size: 12px; color: #666; margin-top: 8px;">Potencial total na área de análise</div>
        </div>

        <!-- Distribuição por Classe Social -->
        <h2 style="color: #2563eb; font-size: 18px; margin: 30px 0 20px 0; border-left: 4px solid #2563eb; padding-left: 12px; font-weight: 600;">
          Distribuição por Classe Social
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead style="background: #2563eb; color: white;">
            <tr>
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: bold;">Classe</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: bold;">Quantidade</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: bold;">Percentual</th>
            </tr>
          </thead>
          <tbody>
            ${classData
              .map(
                (cls, idx) => `
            <tr style="background: ${idx % 2 === 0 ? "#f8fafc" : "white"}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: 500;">Classe ${cls.label}</td>
              <td style="padding: 12px; text-align: right;">${cls.value.toLocaleString("pt-BR")}</td>
              <td style="padding: 12px; text-align: right;">${totalClass > 0 ? ((cls.value / totalClass) * 100).toFixed(1) : 0}%</td>
            </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <!-- Potencial de Consumo por Categoria -->
        <h2 style="color: #2563eb; font-size: 18px; margin: 30px 0 20px 0; border-left: 4px solid #2563eb; padding-left: 12px; font-weight: 600;">
          Potencial de Consumo por Categoria
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead style="background: #2563eb; color: white;">
            <tr>
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: bold;">Categoria</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: bold;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${consumoData
              .map(
                (cat, idx) => `
            <tr style="background: ${idx % 2 === 0 ? "#f8fafc" : "white"}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px;">${cat.label}</td>
              <td style="padding: 12px; text-align: right; font-weight: 500;">R$ ${(cat.value / 1000000).toFixed(2)}M</td>
            </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <!-- Aviso -->
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; font-size: 12px; color: #92400e; margin-top: 30px;">
          <strong>Aviso Importante:</strong> Dados conectados de ferramentas oficiais com base no Censo. Para informações específicas, consulte o time da Sistema Busca Ponto.
        </div>

        <!-- Rodapé -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #999; font-size: 11px;">
          <p style="margin: 0;">Relatório gerado automaticamente pelo Sistema Busca Ponto</p>
          <p style="margin: 5px 0 0 0;">© 2025 Sistema Busca Ponto. Todos os direitos reservados.</p>
        </div>
      </div>
    `;

    // Adicionar ao DOM temporariamente
    document.body.appendChild(element);

    // Esperar um pouco para o elemento ser renderizado
    setTimeout(() => {
      // Abrir diálogo de impressão
      window.print();

      // Remover elemento após impressão
      setTimeout(() => {
        if (element.parentNode === document.body) {
          document.body.removeChild(element);
        }
      }, 100);
    }, 100);
  };

  return (
    <Button onClick={generatePDF} className="gap-2">
      <Download className="h-4 w-4" />
      Exportar Relatório
    </Button>
  );
}

