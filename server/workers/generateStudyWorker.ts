import { getDb } from '../db';
import { generatedStudies } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { fetchSpace, normalizeSpace } from '../services/spaceApiService';
import { fetchNearby, mapSegmentToTypes, mapSynergyTypes } from '../services/googlePlacesService';
import { computeSegmentPotential } from '../services/segmentPotentialService';
import { generatePdf } from '../services/pdfService';
import { storagePut } from '../storage';

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

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar estudo no banco
    const study = await db.select().from(generatedStudies).where(eq(generatedStudies.id, studyId)).limit(1);
    const studyData = study[0];

    if (!studyData) {
      throw new Error(`Estudo ${studyId} não encontrado`);
    }

    // Atualizar status para processing
    const db2 = await getDb();
    if (!db2) throw new Error('Database not available');
    await db2
      .update(generatedStudies)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(generatedStudies.id, studyId));

    // Converter lat/lng de string para number
    const lat = parseFloat(studyData.lat);
    const lng = parseFloat(studyData.lng);

    // 1. Buscar dados da Space API
    console.log(`[Worker] Buscando dados Space API para ${lat}, ${lng}, raio ${studyData.radiusM}m`);
    const rawSpace = await fetchSpace(lat, lng, studyData.radiusM);
    const space = normalizeSpace(rawSpace);

    // 2. Buscar concorrentes
    console.log(`[Worker] Buscando concorrentes para segmento: ${studyData.segment}`);
    const competitors = await fetchNearby(lat, lng, studyData.radiusM, mapSegmentToTypes(studyData.segment));

    // 3. Buscar sinergias
    console.log(`[Worker] Buscando sinergias`);
    const synergies = await fetchNearby(lat, lng, studyData.radiusM, mapSynergyTypes());

    // 4. Calcular potencial por segmento
    console.log(`[Worker] Calculando potencial para segmento: ${studyData.segment}`);
    const { value: segmentPotential, breakdown } = computeSegmentPotential(
      space.categorias,
      studyData.segment
    );

    // 5. Montar payload completo
    const payload_data = {
      meta: {
        id: studyData.id,
        title: studyData.title,
        segment: studyData.segment,
        lat,
        lng,
        radiusM: studyData.radiusM,
        notes: studyData.notes,
        createdAt: studyData.createdAt,
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
    const { url: pdfUrl } = await storagePut(`studies/${studyId}.pdf`, pdfBuffer, 'application/pdf');

    // 7. Salvar JSON
    console.log(`[Worker] Salvando JSON`);
    const { url: jsonUrl } = await storagePut(
      `studies/${studyId}.json`,
      JSON.stringify(payload_data),
      'application/json'
    );

    // 8. Atualizar status para done
    console.log(`[Worker] Atualizando status para done`);
    const db3 = await getDb();
    if (!db3) throw new Error('Database not available');
    await db3
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
    try {
      const db4 = await getDb();
      if (db4) {
        await db4
          .update(generatedStudies)
          .set({
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
            updatedAt: new Date(),
          })
          .where(eq(generatedStudies.id, studyId));
      }
    } catch (dbError) {
      console.error(`[Worker] Erro ao atualizar status de erro:`, dbError);
    }
  }
}

