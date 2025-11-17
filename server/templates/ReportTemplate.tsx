import React from 'react';

interface ReportTemplateProps {
  payload: any;
}

export function ReportTemplate({ payload }: ReportTemplateProps) {
  const { meta, space, competitors, synergies, segmentPotential } = payload;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <title>{meta.title} - Busca Ponto</title>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #1f2937;
            line-height: 1.6;
            background: #ffffff;
          }
          
          .page {
            page-break-after: always;
            padding: 40px;
            min-height: 100vh;
          }
          
          .cover {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
          }
          
          .cover h1 {
            font-size: 48px;
            margin-bottom: 20px;
            font-weight: 700;
          }
          
          .cover p {
            font-size: 20px;
            margin-bottom: 10px;
            opacity: 0.9;
          }
          
          .cover .meta {
            margin-top: 40px;
            font-size: 14px;
            opacity: 0.7;
          }
          
          h2 {
            font-size: 28px;
            margin: 30px 0 20px 0;
            color: #0f172a;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 10px;
          }
          
          h3 {
            font-size: 18px;
            margin: 20px 0 15px 0;
            color: #1f2937;
          }
          
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          
          .cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .card {
            background: #f3f4f6;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            border-radius: 8px;
          }
          
          .card-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          
          .card-value {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
          }
          
          .card-unit {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #0f172a;
            border-bottom: 2px solid #e5e7eb;
          }
          
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          tr:last-child td {
            border-bottom: none;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          
          .location {
            background: #eff6ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #3b82f6;
          }
          
          .location-title {
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 8px;
          }
          
          .location-details {
            font-size: 14px;
            color: #1f2937;
            line-height: 1.8;
          }
        `}</style>
      </head>
      <body>
        {/* Capa */}
        <div className="page cover">
          <h1>Busca Ponto</h1>
          <p>Análise de Mercado</p>
          <p className="meta">
            {meta.title} • {meta.segment}
          </p>
          <div className="meta">
            <p>Gerado em {new Date(meta.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Dados Demográficos */}
        <div className="page">
          <h2>1. Dados Demográficos</h2>

          <div className="location">
            <div className="location-title">Localização Analisada</div>
            <div className="location-details">
              <p>
                <strong>Coordenadas:</strong> {meta.lat.toFixed(6)}, {meta.lng.toFixed(6)}
              </p>
              <p>
                <strong>Raio de Análise:</strong> {(meta.radiusM / 1000).toFixed(1)} km
              </p>
              {meta.notes && (
                <p>
                  <strong>Notas:</strong> {meta.notes}
                </p>
              )}
            </div>
          </div>

          <div className="cards">
            <div className="card">
              <div className="card-label">Habitantes</div>
              <div className="card-value">{formatNumber(space.head.people)}</div>
              <div className="card-unit">pessoas</div>
            </div>
            <div className="card">
              <div className="card-label">Renda Média</div>
              <div className="card-value">{formatCurrency(space.head.income)}</div>
              <div className="card-unit">por mês</div>
            </div>
            <div className="card">
              <div className="card-label">Potencial de Consumo</div>
              <div className="card-value">{formatCurrency(segmentPotential)}</div>
              <div className="card-unit">para {meta.segment}</div>
            </div>
          </div>

          <h3>Distribuição por Classe Social</h3>
          <table>
            <thead>
              <tr>
                <th>Classe</th>
                <th>Domicílios</th>
                <th>Percentual</th>
              </tr>
            </thead>
            <tbody>
              {space.classes.map((cls: any, idx: number) => (
                <tr key={idx}>
                  <td>{cls.sigla}</td>
                  <td>{formatNumber(cls.domicilios)}</td>
                  <td>{cls.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Categorias de Consumo */}
        <div className="page">
          <h2>2. Categorias de Consumo</h2>

          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {space.categorias.map((cat: any, idx: number) => (
                <tr key={idx}>
                  <td>{cat.rotulo}</td>
                  <td>{formatCurrency(cat.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Concorrentes */}
        <div className="page">
          <h2>3. Concorrentes Próximos</h2>

          {competitors.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Endereço</th>
                  <th>Avaliação</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {competitors.slice(0, 15).map((comp: any, idx: number) => (
                  <tr key={idx}>
                    <td>{comp.name}</td>
                    <td>{comp.address}</td>
                    <td>{comp.rating ? `${comp.rating.toFixed(1)} ⭐` : 'N/A'}</td>
                    <td>{comp.openNow ? '✓ Aberto' : '✗ Fechado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Nenhum concorrente encontrado na área.</p>
          )}
        </div>

        {/* Sinergias */}
        <div className="page">
          <h2>4. Sinergias e Complementos</h2>

          {synergies.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Endereço</th>
                </tr>
              </thead>
              <tbody>
                {synergies.slice(0, 15).map((syn: any, idx: number) => (
                  <tr key={idx}>
                    <td>{syn.name}</td>
                    <td>Ponto de Interesse</td>
                    <td>{syn.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Nenhuma sinergia encontrada na área.</p>
          )}
        </div>

        {/* Conclusão */}
        <div className="page">
          <h2>5. Conclusão</h2>

          <div className="section">
            <h3>Resumo Executivo</h3>
            <p>
              A análise realizada para o segmento de <strong>{meta.segment}</strong> na região
              selecionada apresenta os seguintes indicadores:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li>
                <strong>População:</strong> {formatNumber(space.head.people)} habitantes
              </li>
              <li>
                <strong>Renda Média:</strong> {formatCurrency(space.head.income)} por mês
              </li>
              <li>
                <strong>Potencial de Consumo:</strong> {formatCurrency(segmentPotential)} para o
                segmento
              </li>
              <li>
                <strong>Concorrentes Identificados:</strong> {competitors.length} estabelecimentos
              </li>
              <li>
                <strong>Pontos de Sinergia:</strong> {synergies.length} locais complementares
              </li>
            </ul>
          </div>

          <div className="footer">
            <p>Relatório gerado automaticamente pelo Busca Ponto SaaS</p>
            <p>
              {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

