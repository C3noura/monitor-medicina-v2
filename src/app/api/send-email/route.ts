import { NextResponse } from 'next/server';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';

// Default admin email
const ADMIN_EMAIL = 'rui.cenoura@gmail.com';

// Brevo API key
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet: string;
  publicationDate: string | null;
  dateFound: string;
  isPortuguese?: boolean;
}

export async function POST(request: Request) {
  try {
    // Get articles and recipients from request body
    const body = await request.json();
    const articles: Article[] = body.articles || [];
    const recipients: string[] = body.recipients || [ADMIN_EMAIL];
    
    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum artigo encontrado para enviar'
      });
    }
    
    // Ensure admin is always included
    if (!recipients.includes(ADMIN_EMAIL)) {
      recipients.unshift(ADMIN_EMAIL);
    }
    
    // Generate email content
    const { html, text } = generateEmailContent(articles);
    
    // If no API key configured, return setup instructions
    if (!BREVO_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Configure o serviço de email ou use o link abaixo para enviar manualmente.',
        instructions: `
Para envio automático de emails:

1. Acesse https://app.brevo.com (cadastro gratuito)
2. Vá em Settings > SMTP & API > API Keys
3. Crie uma nova API key
4. Adicione às variáveis de ambiente na Vercel:
   BREVO_API_KEY=sua_api_key_aqui

O plano gratuito permite 300 emails/dia.
        `.trim(),
        htmlPreview: html,
        mailtoLink: generateMailtoLink(articles, text, recipients)
      });
    }

    // Configure Brevo API
    const apiInstance = new TransactionalEmailsApi();
    apiInstance.setApiKey(0, BREVO_API_KEY);

    // Send email to each recipient
    const results: { email: string; success: boolean; messageId?: string; error?: string }[] = [];
    
    for (const recipient of recipients) {
      try {
        // Create email
        const sendSmtpEmail = new SendSmtpEmail();
        sendSmtpEmail.subject = `Relatório - Monitor de Medicina Sem Sangue (${articles.length} artigos)`;
        sendSmtpEmail.htmlContent = html;
        sendSmtpEmail.sender = { 
          name: 'Monitor Medicina Sem Sangue', 
          email: ADMIN_EMAIL
        };
        sendSmtpEmail.to = [{ email: recipient }];
        sendSmtpEmail.textContent = text;
        sendSmtpEmail.replyTo = { email: ADMIN_EMAIL, name: 'Rui Cenoura' };

        // Send email
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        results.push({
          email: recipient,
          success: true,
          messageId: response.messageId
        });
        
        console.log(`✅ Email enviado para ${recipient}`);
      } catch (error: any) {
        results.push({
          email: recipient,
          success: false,
          error: error.message
        });
        console.error(`❌ Erro ao enviar para ${recipient}:`, error.message);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      return NextResponse.json({
        success: true,
        data: {
          recipients: recipients,
          successCount,
          failCount,
          subject: 'Relatório - Monitor de Medicina Sem Sangue',
          articlesCount: articles.length,
          results,
          message: `✅ Email enviado com sucesso para ${successCount} de ${recipients.length} destinatário(s)! (${articles.length} artigos)`
        },
        htmlPreview: html
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Não foi possível enviar o email para nenhum destinatário',
        results
      });
    }
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    return NextResponse.json({
      success: false,
      error: `Erro ao enviar: ${error.message}`
    });
  }
}

function generateMailtoLink(articles: Article[], text: string, recipients: string[]): string {
  const subject = encodeURIComponent(`Relatório - Monitor de Medicina Sem Sangue (${articles.length} artigos)`);
  const body = encodeURIComponent(text);
  const to = recipients.join(',');
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

function generateEmailContent(articles: Article[]): { html: string; text: string } {
  const now = new Date();
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const sourcesCount = new Set(articles.map(a => a.source)).size;
  const portugueseCount = articles.filter(a => a.isPortuguese).length;

  const html = `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório - Medicina Sem Sangue</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8fafc; }
    .header { background: linear-gradient(135deg, #5b3c88 0%, #452d6a 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .date-range { background: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #5b3c88; }
    .stats { display: flex; gap: 15px; margin-bottom: 30px; flex-wrap: wrap; }
    .stat-card { flex: 1; min-width: 120px; background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-number { font-size: 36px; font-weight: 700; color: #5b3c88; }
    .stat-label { color: #666; font-size: 14px; }
    .article { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .article-title { font-size: 18px; font-weight: 600; color: #1e40af; text-decoration: none; display: block; margin-bottom: 8px; }
    .article-source { display: inline-block; background: #f3e8ff; color: #7c3aed; padding: 4px 10px; border-radius: 4px; font-size: 12px; margin-bottom: 10px; }
    .article-pt { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 4px; font-size: 12px; margin-left: 5px; }
    .article-snippet { color: #555; font-size: 14px; }
    .footer { text-align: center; padding: 30px; color: #666; font-size: 14px; border-top: 1px solid #e5e7eb; margin-top: 30px; }
    .subscribe-info { background: #f0fdf4; border: 1px solid #86efac; padding: 15px; border-radius: 8px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 Monitor de Medicina Sem Sangue</h1>
    <p>Relatório de Pesquisa Semanal</p>
  </div>
  
  <div class="date-range">
    <strong>📅 Gerado em:</strong> ${formatDate(now)} | <strong>Filtro:</strong> 2021-2025
  </div>
  
  <div class="stats">
    <div class="stat-card">
      <div class="stat-number">${articles.length}</div>
      <div class="stat-label">Artigos Encontrados</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${portugueseCount}</div>
      <div class="stat-label">Em Português 🇵🇹</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${sourcesCount}</div>
      <div class="stat-label">Fontes Pesquisadas</div>
    </div>
  </div>
  
  <h2 style="color: #333; margin-bottom: 20px;">📄 Artigos Encontrados</h2>
  
  ${articles.map(article => `
    <div class="article">
      <a href="${article.url}" class="article-title" target="_blank">${article.title}</a>
      <span class="article-source">${article.source}</span>
      ${article.isPortuguese ? '<span class="article-pt">🇵🇹 PT</span>' : ''}
      <p class="article-snippet">${article.snippet || 'Sem descrição disponível.'}</p>
      ${article.publicationDate ? `<p style="font-size: 12px; color: #888; margin-top: 8px;">Publicado: ${article.publicationDate}</p>` : ''}
    </div>
  `).join('')}
  
  <div class="subscribe-info">
    <strong>📩 Subscrever:</strong> Visite <a href="https://monitor-medicina-v2.vercel.app" style="color: #5b3c88;">monitor-medicina-v2.vercel.app</a> para adicionar o seu email à lista de subscritores.
  </div>
  
  <div class="footer">
    <p>Este relatório foi gerado automaticamente pelo Monitor de Medicina Sem Sangue.</p>
    <p style="font-size: 12px; color: #888;">
      Para cancelar a subscrição, responda a este email com "CANCELAR".
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
MONITOR DE MEDICINA SEM SANGUE
Relatório de Pesquisa Semanal
=====================================

Gerado em: ${formatDate(now)}
Filtro de data: 2021-2025

Estatísticas:
- Artigos encontrados: ${articles.length}
- Em português: ${portugueseCount}
- Fontes pesquisadas: ${sourcesCount}

ARTIGOS:
------------------

${articles.map((a, i) => `
${i + 1}. ${a.title}${a.isPortuguese ? ' 🇵🇹 PT' : ''}
   Fonte: ${a.source}
   Link: ${a.url}
   ${a.snippet ? `Resumo: ${a.snippet}` : ''}
   ${a.publicationDate ? `Publicado: ${a.publicationDate}` : ''}
`).join('\n')}

-----------------------------------

Para subscrever: monitor-medicina-v2.vercel.app

Este relatório foi gerado automaticamente.
Para cancelar a subscrição, responda a este email com "CANCELAR".
`.trim();

  return { html, text };
}
