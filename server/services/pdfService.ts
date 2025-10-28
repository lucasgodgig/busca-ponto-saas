import { renderToString } from 'react-dom/server';
import { chromium } from 'playwright';
import { ReportTemplate } from '../templates/ReportTemplate';

export interface PdfPayload {
  meta: {
    id: number;
    title: string;
    segment: string;
    lat: number;
    lng: number;
    radiusM: number;
    notes?: string;
    createdAt: Date;
  };
  space: any;
  competitors: any[];
  synergies: any[];
  segmentPotential: number;
  breakdown: any[];
}

/**
 * Gera PDF do relatório Busca Ponto
 */
export async function generatePdf(payload: PdfPayload): Promise<Buffer> {
  try {
    // Renderizar template React para HTML
    const html = renderToString(<ReportTemplate payload={payload} />);

    // Usar Playwright para gerar PDF
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });

    await browser.close();

    return pdfBuffer;
  } catch (error) {
    console.error('[PDF Service] Erro ao gerar PDF:', error);
    throw new Error('Falha ao gerar PDF');
  }
}

