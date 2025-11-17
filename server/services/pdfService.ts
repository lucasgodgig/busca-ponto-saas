import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfPayload {
  meta: {
    id: number;
    title: string;
    segment: string;
    lat: number;
    lng: number;
    radiusM: number;
    notes?: string | null;
    createdAt: Date;
  };
  space: any;
  competitors: any[];
  synergies: any[];
  segmentPotential: number;
  breakdown: any[];
}

/**
 * Gera PDF do relatório Busca Ponto usando jsPDF
 * Nota: Esta é uma implementação simplificada. Para relatórios mais complexos,
 * considere usar uma API de renderização HTML para PDF (como via Manus Forge API)
 */
export async function generatePdf(payload: PdfPayload): Promise<Buffer> {
  try {
    // Criar documento PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let yPosition = margin;

    // Título
    doc.setFontSize(16);
    doc.text('Relatório Busca Ponto', margin, yPosition);
    yPosition += 10;

    // Metadados
    doc.setFontSize(10);
    doc.text(`ID: ${payload.meta.id}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Título: ${payload.meta.title}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Segmento: ${payload.meta.segment}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Localização: ${payload.meta.lat.toFixed(4)}, ${payload.meta.lng.toFixed(4)}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Raio: ${payload.meta.radiusM}m`, margin, yPosition);
    yPosition += 5;
    if (payload.meta.notes) {
      doc.text(`Notas: ${payload.meta.notes}`, margin, yPosition);
      yPosition += 5;
    }
    doc.text(`Data: ${new Date(payload.meta.createdAt).toLocaleDateString('pt-BR')}`, margin, yPosition);
    yPosition += 10;

    // Potencial do Segmento
    doc.setFontSize(12);
    doc.text('Potencial do Segmento', margin, yPosition);
    yPosition += 6;
    doc.setFontSize(10);
    doc.text(`Valor: ${(payload.segmentPotential * 100).toFixed(1)}%`, margin, yPosition);
    yPosition += 10;

    // Resumo de Dados
    doc.setFontSize(12);
    doc.text('Resumo de Dados', margin, yPosition);
    yPosition += 6;
    doc.setFontSize(10);
    doc.text(`Concorrentes encontrados: ${payload.competitors.length}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Sinergias encontradas: ${payload.synergies.length}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Categorias de espaço: ${payload.space.categorias?.length || 0}`, margin, yPosition);

    // Converter para Buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
  } catch (error) {
    console.error('[PDF Service] Erro ao gerar PDF:', error);
    throw new Error('Falha ao gerar PDF');
  }
}
