import { ENV } from "../_core/env";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Serviço de email usando Resend API
 * Requer RESEND_API_KEY nas variáveis de ambiente
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Se não houver API key, apenas logar (para desenvolvimento)
    if (!ENV.resendApiKey) {
      console.log("[Email] Modo desenvolvimento - Email não enviado:", {
        to: options.to,
        subject: options.subject,
      });
      return true;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.resendApiKey}`,
      },
      body: JSON.stringify({
        from: "noreply@buscaponto.com",
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[Email] Erro ao enviar email:", error);
      return false;
    }

    console.log("[Email] Email enviado com sucesso para:", options.to);
    return true;
  } catch (error) {
    console.error("[Email] Erro ao enviar email:", error);
    return false;
  }
}

/**
 * Template de email para alerta de limite próximo
 */
export function generateLimitAlertEmail(
  userName: string,
  used: number,
  limit: number,
  percentage: number
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0F172A; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; border-radius: 8px; margin-top: 20px; }
          .alert { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #0F172A; }
          .stat-label { color: #666; font-size: 12px; margin-top: 5px; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Alerta de Limite de Estudos</h1>
          </div>
          
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <p>Você está próximo de atingir o limite mensal de estudos. Confira seu consumo:</p>
            
            <div class="stats">
              <div class="stat">
                <div class="stat-value">${used}</div>
                <div class="stat-label">Utilizados</div>
              </div>
              <div class="stat">
                <div class="stat-value">${limit}</div>
                <div class="stat-label">Limite</div>
              </div>
              <div class="stat">
                <div class="stat-value">${percentage}%</div>
                <div class="stat-label">Taxa de Uso</div>
              </div>
            </div>
            
            <div class="alert">
              <strong>⚠️ Atenção:</strong> Você já utilizou ${percentage}% do seu limite mensal. Para continuar criando estudos, considere fazer upgrade do seu plano.
            </div>
            
            <p>Com um plano superior, você terá acesso a:</p>
            <ul>
              <li>Mais estudos por mês</li>
              <li>Análises mais detalhadas</li>
              <li>Suporte prioritário</li>
              <li>Recursos avançados</li>
            </ul>
            
            <a href="https://buscaponto.com/upgrade" class="button">Fazer Upgrade Agora</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Se tiver dúvidas sobre seu plano ou precisar de ajuda, entre em contato com nosso suporte.
            </p>
          </div>
          
          <div class="footer">
            <p>© 2025 Busca Ponto. Todos os direitos reservados.</p>
            <p>Você recebeu este email porque está usando a plataforma Busca Ponto.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Template de email para limite atingido
 */
export function generateLimitReachedEmail(userName: string, limit: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; border-radius: 8px; margin-top: 20px; }
          .alert { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Limite Mensal Atingido</h1>
          </div>
          
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="alert">
              <strong>❌ Limite Atingido:</strong> Você utilizou todos os ${limit} estudos disponíveis este mês.
            </div>
            
            <p>Para continuar criando estudos, você precisa fazer upgrade do seu plano.</p>
            
            <p>Nossos planos oferecem:</p>
            <ul>
              <li><strong>Plano Starter:</strong> 3 estudos/mês</li>
              <li><strong>Plano Professional:</strong> 10 estudos/mês</li>
              <li><strong>Plano Enterprise:</strong> Estudos ilimitados</li>
            </ul>
            
            <a href="https://buscaponto.com/upgrade" class="button">Fazer Upgrade Agora</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Seu limite será resetado no próximo mês. Se precisar de acesso imediato, faça upgrade do seu plano.
            </p>
          </div>
          
          <div class="footer">
            <p>© 2025 Busca Ponto. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

