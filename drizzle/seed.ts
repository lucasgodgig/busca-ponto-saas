import { drizzle } from "drizzle-orm/mysql2";
import { 
  users, 
  tenants, 
  memberships, 
  studies, 
  quickQueries, 
  planUsage,
  studyComments,
  studyFiles
} from "./schema";

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não configurada");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  console.log("🌱 Iniciando seed...");

  // 1. Criar tenant de exemplo
  const [tenant] = await db.insert(tenants).values({
    name: "Franqueadora Demo",
    slug: "franqueadora-demo",
    logoUrl: "https://placehold.co/200x200/0F172A/FFFFFF/png?text=FD",
    colorPrimary: "#0F172A",
    colorDark: "#020617",
    plan: "essencial",
    limitsJson: {
      quickQueriesPerMonth: 600,
      simultaneousStudies: 5,
      maxAttachmentSizeMB: 10,
    },
  }).$returningId();

  console.log(`✅ Tenant criado: ${tenant.id}`);

  // 2. Criar usuários
  const [adminUser] = await db.insert(users).values({
    openId: "demo-admin-001",
    name: "Admin Demo",
    email: "admin@franqueadorademo.com",
    loginMethod: "email",
    role: "tenant_admin",
  }).$returningId();

  const [member1] = await db.insert(users).values({
    openId: "demo-member-001",
    name: "Ana Silva",
    email: "ana.silva@franqueadorademo.com",
    loginMethod: "email",
    role: "member",
  }).$returningId();

  const [member2] = await db.insert(users).values({
    openId: "demo-member-002",
    name: "Carlos Santos",
    email: "carlos.santos@franqueadorademo.com",
    loginMethod: "email",
    role: "member",
  }).$returningId();

  const [analystBp] = await db.insert(users).values({
    openId: "demo-analyst-bp-001",
    name: "Consultor BP",
    email: "consultor@buscaponto.com",
    loginMethod: "email",
    role: "analyst_bp",
  }).$returningId();

  console.log(`✅ Usuários criados: ${adminUser.id}, ${member1.id}, ${member2.id}, ${analystBp.id}`);

  // 3. Criar memberships
  await db.insert(memberships).values([
    {
      userId: adminUser.id,
      tenantId: tenant.id,
      role: "tenant_admin",
    },
    {
      userId: member1.id,
      tenantId: tenant.id,
      role: "member",
    },
    {
      userId: member2.id,
      tenantId: tenant.id,
      role: "member",
    },
  ]);

  console.log("✅ Memberships criados");

  // 4. Criar estudos de exemplo
  const [study1] = await db.insert(studies).values({
    tenantId: tenant.id,
    title: "Estudo de Viabilidade - Academia Zona Sul",
    segment: "Academia",
    address: "Av. Paulista, 1000 - São Paulo, SP",
    lat: "-23.55052",
    lng: "-46.633308",
    radiusM: 1500,
    objectives: "Avaliar viabilidade de abertura de academia de médio porte na região da Av. Paulista",
    status: "em_analise",
    priority: "alta",
    createdBy: member1.id,
    assignedBpUserId: analystBp.id,
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
  }).$returningId();

  const [study2] = await db.insert(studies).values({
    tenantId: tenant.id,
    title: "Análise de Mercado - Lavanderia Zona Norte",
    segment: "Lavanderia",
    address: "Rua Voluntários da Pátria, 500 - São Paulo, SP",
    lat: "-23.52345",
    lng: "-46.62891",
    radiusM: 2000,
    objectives: "Identificar potencial de mercado para lavanderia self-service",
    status: "aberto",
    priority: "media",
    createdBy: member2.id,
  }).$returningId();

  console.log(`✅ Estudos criados: ${study1.id}, ${study2.id}`);

  // 5. Adicionar comentário ao estudo 1
  await db.insert(studyComments).values({
    studyId: study1.id,
    authorId: analystBp.id,
    body: "Iniciando análise. A região tem ótimo potencial demográfico. Vou aprofundar a análise de concorrência.",
  });

  console.log("✅ Comentário adicionado ao estudo");

  // 6. Criar consultas rápidas de exemplo
  const quickQueriesData = [
    {
      tenantId: tenant.id,
      userId: member1.id,
      lat: "-23.55052",
      lng: "-46.633308",
      radiusM: 1500,
      layersEnabledJson: {
        demografia: true,
        renda: true,
        fluxo: true,
        concorrencia: true,
      },
      resultSummaryJson: {
        populacao: 45000,
        rendaMedia: 5200,
        fluxoPedestres: "alto",
      },
      costUnits: 1,
    },
    {
      tenantId: tenant.id,
      userId: member1.id,
      lat: "-23.56123",
      lng: "-46.65678",
      radiusM: 1000,
      layersEnabledJson: {
        demografia: true,
        renda: true,
        fluxo: false,
        concorrencia: false,
      },
      resultSummaryJson: {
        populacao: 32000,
        rendaMedia: 4800,
      },
      costUnits: 1,
    },
    {
      tenantId: tenant.id,
      userId: member2.id,
      lat: "-23.52345",
      lng: "-46.62891",
      radiusM: 2000,
      layersEnabledJson: {
        demografia: true,
        renda: true,
        fluxo: true,
        concorrencia: true,
      },
      resultSummaryJson: {
        populacao: 58000,
        rendaMedia: 3900,
        fluxoPedestres: "medio",
      },
      costUnits: 1,
    },
    {
      tenantId: tenant.id,
      userId: member2.id,
      lat: "-23.54789",
      lng: "-46.64123",
      radiusM: 1200,
      layersEnabledJson: {
        demografia: true,
        renda: false,
        fluxo: true,
        concorrencia: false,
      },
      resultSummaryJson: {
        populacao: 28000,
        fluxoPedestres: "baixo",
      },
      costUnits: 1,
    },
    {
      tenantId: tenant.id,
      userId: member1.id,
      lat: "-23.53456",
      lng: "-46.63789",
      radiusM: 1800,
      layersEnabledJson: {
        demografia: true,
        renda: true,
        fluxo: true,
        concorrencia: true,
      },
      resultSummaryJson: {
        populacao: 51000,
        rendaMedia: 6100,
        fluxoPedestres: "alto",
      },
      costUnits: 1,
    },
  ];

  await db.insert(quickQueries).values(quickQueriesData);

  console.log("✅ 5 consultas rápidas criadas");

  // 7. Criar registro de uso do plano
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  await db.insert(planUsage).values({
    tenantId: tenant.id,
    periodStart,
    periodEnd,
    quickQueriesUsed: 5,
    studiesOpened: 2,
  });

  console.log("✅ Registro de uso do plano criado");

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("\n📊 Resumo:");
  console.log(`   - 1 tenant: Franqueadora Demo`);
  console.log(`   - 4 usuários: 1 admin, 2 membros, 1 consultor BP`);
  console.log(`   - 2 estudos: 1 em análise, 1 aberto`);
  console.log(`   - 5 consultas rápidas no histórico`);
  console.log(`   - 1 registro de uso mensal\n`);

  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Erro ao executar seed:", error);
  process.exit(1);
});

