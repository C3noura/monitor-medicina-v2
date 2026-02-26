import { NextResponse } from 'next/server';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';

const EMAIL_RECIPIENT = 'rui.cenoura@gmail.com';

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
}

export async function POST(request: Request) {
  try {
    // Get articles from request body
    const body = await request.json();
    const articles: Article[] = body.articles || [];
    
    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum artigo encontrado para enviar'
      });
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
        mailtoLink: generateMailtoLink(articles, text)
      });
    }

    // Configure Brevo API
    const apiInstance = new TransactionalEmailsApi();
    apiInstance.setApiKey(0, BREVO_API_KEY);

    // Create email
    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.subject = `Relatório - Monitor de Medicina Sem Sangue (${articles.length} artigos)`;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = { 
      name: 'Monitor Medicina Sem Sangue', 
      email: 'rui.cenoura@gmail.com'
    };
    sendSmtpEmail.to = [{ email: EMAIL_RECIPIENT, name: 'Rui Cenoura' }];
    sendSmtpEmail.textContent = text;
    sendSmtpEmail.replyTo = { email: 'rui.cenoura@gmail.com', name: 'Rui Cenoura' };

    // Send email
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Email enviado com sucesso via Brevo!', response);
    
    return NextResponse.json({
      success: true,
      data: {
        recipient: EMAIL_RECIPIENT,
        subject: 'Relatório - Monitor de Medicina Sem Sangue',
        articlesCount: articles.length,
        messageId: response.messageId,
        message: `✅ Email enviado com sucesso para ${EMAIL_RECIPIENT}! (${articles.length} artigos)`
      }
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    return NextResponse.json({
      success: false,
      error: `Erro ao enviar: ${error.message}`
    });
  }
}

function generateMailtoLink(articles: Article[], text: string): string {
  const subject = encodeURIComponent(`Relatório - Monitor de Medicina Sem Sangue (${articles.length} artigos)`);
  const body = encodeURIComponent(text);
  return `mailto:rui.cenoura@gmail.com?subject=${subject}&body=${body}`;
}

function generateEmailContent(articles: Article[]): { html: string; text: string } {
  const now = new Date();
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const sourcesCount = new Set(articles.map(a => a.source)).size;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório - Medicina Sem Sangue</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8fafc; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .date-range { background: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626; }
    .stats { display: flex; gap: 15px; margin-bottom: 30px; }
    .stat-card { flex: 1; background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-number { font-size: 36px; font-weight: 700; color: #dc2626; }
    .stat-label { color: #666; font-size: 14px; }
    .article { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .article-title { font-size: 18px; font-weight: 600; color: #1e40af; text-decoration: none; display: block; margin-bottom: 8px; }
    .article-source { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 4px; font-size: 12px; margin-bottom: 10px; }
    .article-snippet { color: #555; font-size: 14px; }
    .footer { text-align: center; padding: 30px; color: #666; font-size: 14px; border-top: 1px solid #e5e7eb; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 Monitor de Medicina Sem Sangue</h1>
    <p>Relatório de Pesquisa</p>
  </div>
  
  <div class="date-range">
    <strong>📅 Gerado em:</strong> ${formatDate(now)}
  </div>
  
  <div class="stats">
    <div class="stat-card">
      <div class="stat-number">${articles.length}</div>
      <div class="stat-label">Artigos Encontrados</div>
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
      <p class="article-snippet">${article.snippet || 'Sem descrição disponível.'}</p>
      ${article.publicationDate ? `<p style="font-size: 12px; color: #888; margin-top: 8px;">Publicado: ${article.publicationDate}</p>` : ''}
    </div>
  `).join('')}
  
  <div class="footer">
    <p>Este relatório foi gerado automaticamente pelo Monitor de Medicina Sem Sangue.</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
MONITOR DE MEDICINA SEM SANGUE
Relatório de Pesquisa
=====================================

Gerado em: ${formatDate(now)}

Estatísticas:
- Artigos encontrados: ${articles.length}
- Fontes pesquisadas: ${sourcesCount}

ARTIGOS:
------------------

${articles.map((a, i) => `
${i + 1}. ${a.title}
   Fonte: ${a.source}
   Link: ${a.url}
   ${a.snippet ? `Resumo: ${a.snippet}` : ''}
   ${a.publicationDate ? `Publicado: ${a.publicationDate}` : ''}
`).join('\n')}

-----------------------------------
Este relatório foi gerado automaticamente.
`.trim();

  return { html, text };
}
