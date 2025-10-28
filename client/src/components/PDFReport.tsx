import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import type { SpaceData } from "@/services/spaceClient";

interface PDFReportProps {
  address: string;
  segment: string;
  data: {
    categorias?: Array<{
      chave: string;
      rotulo: string;
      ordem: number;
      valor: number;
    }>;
    head?: {
      habitantes?: number;
      densidade?: number;
      renda_media?: number;
      renda_per_capita?: number;
      domicilios?: number;
    };
    totals?: {
      cons_a_total?: number;
      cons_1_food?: number;
      cons_3_clothing?: number;
      cons_4_transport?: number;
      cons_5_hygiene_care?: number;
      cons_6_health?: number;
      cons_7_education?: number;
      cons_8_recreation?: number;
    };
    classes?: Array<{
      chave: string;
      rotulo: string;
      valor: number;
    }>;
    faixas?: Array<{
      chave: string;
      rotulo: string;
      valor: number;
    }>;
    [key: string]: any;
  };
}

export default function PDFReport({ address, segment, data }: PDFReportProps) {
  const generatePDF = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório - Busca Ponto</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 40px;
          }
          
          .container {
            max-width: 900px;
            margin: 0 auto;
          }
          
          .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .header h1 {
            color: #2563eb;
            font-size: 28px;
            margin-bottom: 10px;
          }
          
          .header-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
          }
          
          .info-item {
            padding: 10px 0;
          }
          
          .info-label {
            font-weight: 600;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          
          .info-value {
            font-size: 16px;
            color: #333;
          }
          
          .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #2563eb;
            margin-bottom: 15px;
            border-left: 4px solid #2563eb;
            padding-left: 10px;
          }
          
          .metrics {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 20px;
          }
          
          .metric-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
          }
          
          .metric-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          
          .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #2563eb;
          }
          
          .metric-subtext {
            font-size: 12px;
            color: #999;
            margin-top: 5px;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          
          .table th {
            background: #2563eb;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
          }
          
          .table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .table tr:nth-child(even) {
            background: #f8fafc;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
          
          .disclaimer {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin-top: 20px;
            border-radius: 4px;
            font-size: 12px;
            color: #92400e;
          }
          
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Busca Ponto - Análise de Localização</h1>
            <div class="header-info">
              <div class="info-item">
                <div class="info-label">Endereço</div>
                <div class="info-value">${address || "Não informado"}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Segmento do Negócio</div>
                <div class="info-value">${segment || "Não informado"}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Data do Relatório</div>
                <div class="info-value">${new Date().toLocaleDateString("pt-BR")}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Hora</div>
                <div class="info-value">${new Date().toLocaleTimeString("pt-BR")}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Dados Demográficos</h2>
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-label">Habitantes</div>
                <div class="metric-value">${(data.head?.habitantes || 0).toLocaleString("pt-BR")}</div>
                <div class="metric-subtext">${(data.head?.densidade || 0).toLocaleString("pt-BR")} hab/hectare</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Renda Média</div>
                <div class="metric-value">R$ ${(data.head?.renda_media || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
                <div class="metric-subtext">Per capita: R$ ${(data.head?.renda_per_capita || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Domicílios</div>
                <div class="metric-value">${(data.head?.domicilios || 0).toLocaleString("pt-BR")}</div>
                <div class="metric-subtext">Estimados na área</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Potencial de Consumo</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th style="text-align: right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${
                  data.categorias
                    ?.filter(cat => cat.valor > 0)
                    .map(
                      cat => `
                  <tr>
                    <td>${cat.rotulo}</td>
                    <td style="text-align: right;">R$ ${(cat.valor / 1000000).toFixed(1)}M</td>
                  </tr>
                `
                    )
                    .join("") || ""
                }
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2 class="section-title">Distribuição por Classe Social</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Classe</th>
                  <th style="text-align: right;">Percentual</th>
                </tr>
              </thead>
              <tbody>
                ${
                  data.classes
                    ?.map(
                      cls => `
                  <tr>
                    <td>${cls.rotulo}</td>
                    <td style="text-align: right;">${cls.valor.toFixed(1)}%</td>
                  </tr>
                `
                    )
                    .join("") || ""
                }
              </tbody>
            </table>
          </div>
          
          <div class="disclaimer">
            <strong>Aviso Importante:</strong> Dados conectados de ferramentas oficiais com base no Censo. Para informações específicas, consulte o time da Busca Ponto.
          </div>
          
          <div class="footer">
            <p>Relatório gerado automaticamente pelo Busca Ponto SaaS</p>
            <p style="margin-top: 10px;">© 2025 Busca Ponto. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Criar um blob com o conteúdo HTML
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    // Abrir em nova aba para impressão
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.print();
      });
    }
  };

  return (
    <Button
      onClick={generatePDF}
      variant="outline"
      size="sm"
      className="gap-2"
      title="Exportar relatório como PDF"
    >
      <FileDown className="w-4 h-4" />
      Exportar PDF
    </Button>
  );
}

