import { Router } from "express";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const router = Router();

interface PDFGenerateRequest {
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
    classes?: Array<{
      chave: string;
      rotulo: string;
      valor: number;
    }>;
  };
}

router.post("/generate", (req, res) => {
  try {
    const { address, segment, data } = req.body as PDFGenerateRequest;

    // Criar HTML do relatório
    const html = `
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
      font-family: Arial, sans-serif;
      color: #333;
      background: white;
      padding: 40px;
      line-height: 1.6;
    }
    h1 {
      color: #2563eb;
      margin-bottom: 20px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #2563eb;
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-left: 4px solid #2563eb;
      padding-left: 10px;
    }
    .header-section {
      margin-bottom: 30px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
    }
    .header-item {
      margin-bottom: 15px;
    }
    .header-label {
      font-size: 12px;
      color: #666;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .header-value {
      font-size: 16px;
    }
    .metrics {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin-bottom: 30px;
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
      font-weight: bold;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .metric-sub {
      font-size: 12px;
      color: #999;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead {
      background: #2563eb;
      color: white;
    }
    th {
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: bold;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .disclaimer {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 4px;
      font-size: 12px;
      color: #92400e;
      margin-top: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>Busca Ponto - Análise de Localização</h1>
  
  <div class="header-section">
    <div class="header-item">
      <div class="header-label">ENDEREÇO</div>
      <div class="header-value">${address || "Não informado"}</div>
    </div>
    <div class="header-item">
      <div class="header-label">SEGMENTO DO NEGÓCIO</div>
      <div class="header-value">${segment || "Não informado"}</div>
    </div>
    <div class="header-item">
      <div class="header-label">DATA DO RELATÓRIO</div>
      <div class="header-value">${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</div>
    </div>
  </div>

  <h2>Dados Demográficos</h2>
  <div class="metrics">
    <div class="metric-card">
      <div class="metric-label">HABITANTES</div>
      <div class="metric-value">${(data.head?.habitantes || 0).toLocaleString("pt-BR")}</div>
      <div class="metric-sub">${(data.head?.densidade || 0).toLocaleString("pt-BR")} hab/hectare</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">RENDA MÉDIA</div>
      <div class="metric-value">R$ ${(data.head?.renda_media || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
      <div class="metric-sub">Per capita: R$ ${(data.head?.renda_per_capita || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">DOMICÍLIOS</div>
      <div class="metric-value">${(data.head?.domicilios || 0).toLocaleString("pt-BR")}</div>
      <div class="metric-sub">Estimados na área</div>
    </div>
  </div>

  <h2>Distribuição por Classe Social</h2>
  <table>
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
            (cls) => `
      <tr>
        <td>${cls.rotulo}</td>
        <td style="text-align: right;">${(cls.valor || 0).toFixed(1)}%</td>
      </tr>
      `
          )
          .join("") || ""
      }
    </tbody>
  </table>

  <h2>Potencial de Consumo por Categoria</h2>
  <table>
    <thead>
      <tr>
        <th>Categoria</th>
        <th style="text-align: right;">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${
        data.categorias
          ?.filter((cat) => cat.valor > 0)
          .map(
            (cat) => `
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

  <div class="disclaimer">
    <strong>Aviso Importante:</strong> Dados conectados de ferramentas oficiais com base no Censo. Para informações específicas, consulte o time da Busca Ponto.
  </div>

  <div class="footer">
    <p>Relatório gerado automaticamente pelo Busca Ponto SaaS</p>
    <p style="margin-top: 10px;">© 2025 Busca Ponto. Todos os direitos reservados.</p>
  </div>
</body>
</html>
    `;

    // Salvar HTML temporário
    const tempDir = os.tmpdir();
    const htmlFile = path.join(tempDir, `relatorio_${Date.now()}.html`);
    const pdfFile = path.join(tempDir, `relatorio_${Date.now()}.pdf`);

    fs.writeFileSync(htmlFile, html);

    // Converter HTML para PDF usando manus-md-to-pdf (ou outro método)
    // Como manus-md-to-pdf é para Markdown, vamos usar uma abordagem alternativa
    // Vamos apenas retornar o HTML e deixar o frontend fazer a conversão

    // Limpar arquivo temporário
    fs.unlinkSync(htmlFile);

    // Retornar o HTML para o frontend fazer a conversão
    res.json({
      success: true,
      html: html,
      fileName: `Relatorio_${segment}_${Date.now()}.pdf`,
    });
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao gerar PDF",
    });
  }
});

export default router;

