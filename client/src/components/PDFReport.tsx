interface PDFReportProps {
  address: string;
  segment: string;
  data: any;
}

export function PDFReport({ address, segment, data }: PDFReportProps) {
  const generatePDF = () => {
    // Criar elemento com o relatório
    const element = document.createElement("div");
    element.id = "pdf-report";
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 900px; margin: 0 auto;">
        <h1 style="color: #2563eb; margin-bottom: 20px; border-bottom: 3px solid #2563eb; padding-bottom: 10px;">
          Busca Ponto - Análise de Localização
        </h1>
        
        <div style="margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
          <div style="margin-bottom: 15px;">
            <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">ENDEREÇO</div>
            <div style="font-size: 16px;">${address || "Não informado"}</div>
          </div>
          <div style="margin-bottom: 15px;">
            <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">SEGMENTO DO NEGÓCIO</div>
            <div style="font-size: 16px;">${segment || "Não informado"}</div>
          </div>
          <div style="margin-bottom: 15px;">
            <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">DATA DO RELATÓRIO</div>
            <div style="font-size: 16px;">${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</div>
          </div>
        </div>

        <h2 style="color: #2563eb; font-size: 18px; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #2563eb; padding-left: 10px;">
          Dados Demográficos
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
            <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">HABITANTES</div>
            <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${(data.head?.habitantes || 0).toLocaleString("pt-BR")}</div>
            <div style="font-size: 12px; color: #999; margin-top: 5px;">${(data.head?.densidade || 0).toLocaleString("pt-BR")} hab/hectare</div>
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
            <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">RENDA MÉDIA</div>
            <div style="font-size: 24px; font-weight: bold; color: #2563eb;">R$ ${(data.head?.renda_media || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
            <div style="font-size: 12px; color: #999; margin-top: 5px;">Per capita: R$ ${(data.head?.renda_per_capita || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
            <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">DOMICÍLIOS</div>
            <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${(data.head?.domicilios || 0).toLocaleString("pt-BR")}</div>
            <div style="font-size: 12px; color: #999; margin-top: 5px;">Estimados na área</div>
          </div>
        </div>

        <h2 style="color: #2563eb; font-size: 18px; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #2563eb; padding-left: 10px;">
          Distribuição por Classe Social
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead style="background: #2563eb; color: white;">
            <tr>
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: bold;">Classe</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: bold;">Percentual</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.classes
                ?.map(
                  (cls: any, idx: number) => `
            <tr style="background: ${idx % 2 === 0 ? "#f8fafc" : "white"};">
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${cls.rotulo}</td>
              <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">${(cls.valor || 0).toFixed(1)}%</td>
            </tr>
            `
                )
                .join("") || ""
            }
          </tbody>
        </table>

        <h2 style="color: #2563eb; font-size: 18px; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #2563eb; padding-left: 10px;">
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
            ${
              data.categorias
                ?.filter((cat: any) => cat.valor > 0)
                .map(
                  (cat: any, idx: number) => `
            <tr style="background: ${idx % 2 === 0 ? "#f8fafc" : "white"};">
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${cat.rotulo}</td>
              <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">R$ ${(cat.valor / 1000000).toFixed(1)}M</td>
            </tr>
            `
                )
                .join("") || ""
            }
          </tbody>
        </table>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; font-size: 12px; color: #92400e; margin-top: 20px;">
          <strong>Aviso Importante:</strong> Dados conectados de ferramentas oficiais com base no Censo. Para informações específicas, consulte o time da Busca Ponto.
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #999; font-size: 12px;">
          <p>Relatório gerado automaticamente pelo Busca Ponto SaaS</p>
          <p style="margin-top: 10px;">© 2025 Busca Ponto. Todos os direitos reservados.</p>
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
        document.body.removeChild(element);
      }, 100);
    }, 100);
  };

  return (
    <button
      onClick={generatePDF}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        backgroundColor: "#ff6b35",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "bold",
      }}
    >
      📄 Exportar PDF
    </button>
  );
}

