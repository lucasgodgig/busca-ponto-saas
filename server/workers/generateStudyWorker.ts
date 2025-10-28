import { db } from '../db';
import { generatedStudies } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { fetchSpace, normalizeSpace } from '../services/spaceApiService';
import { fetchNearby, mapSegmentToTypes, mapSynergyTypes } from '../services/googlePlacesService';
import { computeSegmentPotential } from '../services/segmentPotentialService';
import { generatePdf } from '../services/pdfService';
import { storagePut } from '../utils/storage';

export interface GenerateStudyPayload {
  id: number;
}

/**
 * Worker que processa a geração de um estudo
 */
export async function generateStudyWorker(payload: GenerateStudyPayload) {
  const studyId = payload.id;

  try {
    console.log(`[Worker] Iniciando geração do estudo ${studyId}`);

    // Buscar estudo no banco
    const study = await db.query.generatedStudies.findFirst({
      where: eq(generatedStudies.id, studyId),
    });

    if (!study) {
      throw new Error(`Estudo ${studyId} não encontrado`);
    }

    // Atualizar status para processing
    await db
      .update(generatedStudies)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(generatedStudies.id, studyId));

    // Converter lat/lng de string para number
    const lat = parseFloat(study.lat);
    const lng = parseFloat(study.lng);

    // 1. Buscar dados da Space API
    console.log(`[Worker] Buscando dados Space API para ${lat}, ${lng}, raio ${study.radiusM}m`);
    const rawSpace = await fetchSpace(lat, lng, study.radiusM);
    const space = normalizeSpace(rawSpace);

    // 2. Buscar concorrentes
    console.log(`[Worker] Buscando concorrentes para segmento: ${study.segment}`);
    const competitors = await fetchNearby(lat, lng, study.radiusM, mapSegmentToTypes(study.segment));

    // 3. Buscar sinergias
    console.log(`[Worker] Buscando sinergias`);
    const synergies = await fetchNearby(lat, lng, study.radiusM, mapSynergyTypes());

    // 4. Calcular potencial por segmento
    console.log(`[Worker] Calculando potencial para segmento: ${study.segment}`);
    const { value: segmentPotential, breakdown } = computeSegmentPotential(
      space.categorias,
      study.segment
    );

    // 5. Montar payload completo
    const payload_data = {
      meta: {
        id: study.id,
        title: study.title,
        segment: study.segment,
        lat,
        lng,
        radiusM: study.radiusM,
        notes: study.notes,
        createdAt: study.createdAt,
      },
      space,
      competitors,
      synergies,
      segmentPotential,
      breakdown,
    };

    // 6. Gerar PDF
    console.log(`[Worker] Gerando PDF`);
    const pdfBuffer = await generatePdf(payload_data);
    const pdfUrl = await storagePut(`studies/${studyId}.pdf`, pdfBuffer, 'application/pdf');

    // 7. Salvar JSON
    console.log(`[Worker] Salvando JSON`);
    const jsonUrl = await storagePut(
      `studies/${studyId}.json`,
      JSON.stringify(payload_data),
      'application/json'
    );

    // 8. Atualizar status para done
    console.log(`[Worker] Atualizando status para done`);
    await db
      .update(generatedStudies)
      .set({
        status: 'done',
        resultJsonUrl: jsonUrl,
        pdfUrl: pdfUrl,
        updatedAt: new Date(),
      })
      .where(eq(generatedStudies.id, studyId));

    console.log(`[Worker] Estudo ${studyId} gerado com sucesso!`);
  } catch (error) {
    console.error(`[Worker] Erro ao gerar estudo ${studyId}:`, error);

    // Atualizar status para error
    await db
      .update(generatedStudies)
      .set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        updatedAt: new Date(),
      })
      .where(eq(generatedStudies.id, studyId));
  }
}

