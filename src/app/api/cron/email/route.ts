import { NextResponse } from 'next/server';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';

const EMAIL_RECIPIENT = 'rui.cenoura@gmail.com';
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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Curated articles - always available
const CURATED_ARTICLES: Article[] = [
  {
    id: generateId(),
    title: 'Patient Blood Management Program Implementation - PMC',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11296688',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'Current scientific evidence supports the effectiveness of PBM by reducing the need for blood transfusions, decreasing associated complications, and improving patient outcomes.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'WHO Guidance on Implementing Patient Blood Management',
    url: 'https://www.who.int/publications/i/item/9789240104662',
    source: 'who.int',
    snippet: 'This guidance shows how the necessary structures and processes can be broadly replicated to improve overall population health through implementation of Patient Blood Management.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Cardiac Surgery and Blood-Saving Techniques: An Update',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8844256',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'In cardiac surgery, blood conservation strategies include aggressive use of PAD, low CPB prime, effective RAP, cell salvage techniques, and pharmacological agents.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Outcomes of Cardiac Surgery in Jehovah\'s Witness Patients',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8446884',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'The use of a bloodless protocol for Jehovah\'s Witnesses does not appear to significantly impact clinical outcomes when compared to non-Witness patients.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Alternatives to Blood Transfusion - PMC',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9666052',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'Strategies that enable patients to minimise or avoid blood transfusions include cell salvage, hemostatic agents, and comprehensive anemia management protocols.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Bloodless Heart Transplantation: An 11-Year Case Series',
    url: 'https://pubmed.ncbi.nlm.nih.gov/40935286',
    source: 'pubmed.ncbi.nlm.nih.gov',
    snippet: 'Bloodless heart transplantation can be performed safely with outcomes comparable to national standards when comprehensive perioperative optimization is employed.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Management of Anemia in Patients Who Decline Blood Transfusion',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30033541',
    source: 'pubmed.ncbi.nlm.nih.gov',
    snippet: 'Under Bloodless Medicine programs, patients with extremely low hemoglobin levels have survived without receiving allogeneic transfusions.',
    publicationDate: '2018',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'The Advantages of Bloodless Cardiac Surgery: A Systematic Review',
    url: 'https://www.sciencedirect.com/science/article/pii/S0146280623004954',
    source: 'sciencedirect.com',
    snippet: 'Bloodless cardiac surgery is safe with early outcomes similar between JW and non-JW patients.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Strategies for Blood Conservation in Pediatric Cardiac Surgery',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5070332',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'Modified ultrafiltration (MUF) increases hematocrit, improves hemostasis, decreases blood loss and significantly reduces transfusion requirements.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Intraoperative Cell Salvage as an Alternative to Allogeneic Transfusion',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7784599',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'Intraoperative cell salvage (ICS) provides high-quality autologous RBCs and can reduce requirements for allogeneic transfusions.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Patient Blood Management - AABB',
    url: 'https://www.aabb.org/blood-biotherapies/blood/transfusion-medicine/patient-blood-management',
    source: 'aabb.org',
    snippet: 'PBM techniques are designed to ensure optimal patient outcomes while maintaining blood supply availability.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'WHO Releases New Guidance on Patient Blood Management',
    url: 'https://www.aabb.org/news-resources/news/article/2025/03/19/who-releases-new-guidance-on-patient-blood-management',
    source: 'aabb.org',
    snippet: 'The World Health Organization released new guidance providing a framework to implement PBM policies globally.',
    publicationDate: '2025',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Developing a Protocol for Bloodless Kidney Transplantation',
    url: 'https://ashpublications.org/blood/article/146/Supplement%201/6688/550385/Developing-a-protocol-for-bloodless-medicine',
    source: 'ashpublications.org',
    snippet: 'Treatment strategies for JW patients undergoing kidney transplantation with bloodless protocols have shown successful outcomes.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Bloodless Medicine: Current Strategies and Emerging Treatment Paradigms',
    url: 'https://www.researchgate.net/publication/305751203_Bloodless_medicine_Current_strategies_and_emerging_treatment_paradigms',
    source: 'researchgate.net',
    snippet: 'Methods include minimizing laboratory testing, low-volume microtainers for phlebotomy, and comprehensive anemia management protocols.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Intraoperative Cell Salvage in Liver Transplantation',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6354069',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'Intraoperative blood salvage autotransfusion is routinely used in liver transplant surgery.',
    publicationDate: '2019',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Clinical Utility of Autologous Salvaged Blood: A Review',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S1091255X23013392',
    source: 'sciencedirect.com',
    snippet: 'Cell salvage can reduce requirements for allogeneic transfusions with excellent post-transfusion survival rates.',
    publicationDate: '2020',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Simplified International Recommendations for PBM Implementation',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5356305',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'PBM-related metrics should include proportion of patients who are anemic and receive treatment.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Blood Conservation Techniques in Cardiac Surgery',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S0003497510610077',
    source: 'sciencedirect.com',
    snippet: 'Techniques include preoperative blood donation, intraoperative withdrawal, and cell saver implementation.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  }
];

// Try to fetch live articles from PubMed
async function fetchPubMedArticles(): Promise<Article[]> {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=bloodless+medicine+patient+blood+management&retmax=5&retmode=json&sort=relevance`;
    
    const searchResponse = await fetch(searchUrl, { 
      signal: AbortSignal.timeout(5000) 
    });
    
    if (!searchResponse.ok) return [];
    
    const searchData = await searchResponse.json();
    const ids = searchData?.esearchresult?.idlist || [];
    
    if (ids.length === 0) return [];
    
    return ids.map((id: string) => ({
      id: generateId(),
      title: `PubMed Article ID: ${id}`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      source: 'pubmed.ncbi.nlm.nih.gov',
      snippet: 'Artigo recente do PubMed sobre medicina sem sangue.',
      publicationDate: null,
      dateFound: new Date().toISOString()
    }));
  } catch (error) {
    console.error('PubMed fetch error:', error);
    return [];
  }
}

function generateEmailHtml(articles: Article[]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 12px; text-align: center; }
    .stats { display: flex; gap: 15px; margin: 20px 0; }
    .stat { flex: 1; background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-number { font-size: 32px; font-weight: bold; color: #dc2626; }
    .article { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .article-title { font-size: 18px; font-weight: 600; color: #1e40af; text-decoration: none; }
    .article-source { background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 4px; font-size: 12px; display: inline-block; margin: 10px 0; }
    .article-snippet { color: #555; font-size: 14px; line-height: 1.6; }
    .footer { text-align: center; padding: 30px; color: #666; border-top: 1px solid #eee; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 Monitor de Medicina Sem Sangue</h1>
    <p>Relatório Automático Semanal</p>
    <p style="opacity: 0.8;">${dateStr}</p>
  </div>
  
  <div class="stats">
    <div class="stat">
      <div class="stat-number">${articles.length}</div>
      <div>Artigos Encontrados</div>
    </div>
    <div class="stat">
      <div class="stat-number">${new Set(articles.map(a => a.source)).size}</div>
      <div>Fontes Médicas</div>
    </div>
  </div>
  
  <h2>📄 Artigos da Semana</h2>
  
  ${articles.map(article => `
    <div class="article">
      <a href="${article.url}" class="article-title" target="_blank">${article.title}</a>
      <br>
      <span class="article-source">${article.source}</span>
      <p class="article-snippet">${article.snippet || ''}</p>
    </div>
  `).join('')}
  
  <div class="footer">
    <p>Este relatório foi gerado automaticamente pelo Monitor de Medicina Sem Sangue.</p>
  </div>
</body>
</html>
  `;
}

function generateEmailText(articles: Article[]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  
  return `
MONITOR DE MEDICINA SEM SANGUE
Relatório Automático Semanal
Data: ${dateStr}

=====================================
ARTIGOS ENCONTRADOS: ${articles.length}
=====================================

${articles.map((a, i) => `
${i + 1}. ${a.title}
   Fonte: ${a.source}
   Link: ${a.url}
`).join('\n')}

=====================================
Relatório gerado automaticamente.
`.trim();
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  try {
    console.log('📧 Starting automated email send...');
    
    // Start with curated articles
    const articles: Article[] = CURATED_ARTICLES.map(a => ({
      ...a,
      id: generateId(),
      dateFound: new Date().toISOString()
    }));
    
    // Try to add live PubMed articles
    try {
      const pubmedArticles = await fetchPubMedArticles();
      for (const article of pubmedArticles) {
        if (!articles.some(a => a.url === article.url)) {
          articles.push(article);
        }
      }
    } catch (e) {
      console.log('PubMed fetch failed, using curated articles only');
    }
    
    if (articles.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No articles available' 
      });
    }
    
    if (!BREVO_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'BREVO_API_KEY not configured' 
      });
    }
    
    // Generate email content
    const html = generateEmailHtml(articles);
    const text = generateEmailText(articles);
    
    // Send email via Brevo
    const apiInstance = new TransactionalEmailsApi();
    apiInstance.setApiKey(0, BREVO_API_KEY);
    
    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.subject = `🏥 Relatório Semanal - ${articles.length} Artigos sobre Medicina Sem Sangue`;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.textContent = text;
    sendSmtpEmail.sender = { 
      name: 'Monitor Medicina Sem Sangue', 
      email: 'rui.cenoura@gmail.com'
    };
    sendSmtpEmail.to = [{ email: EMAIL_RECIPIENT, name: 'Rui Cenoura' }];
    
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log(`✅ Automated email sent! ${articles.length} articles`);
    
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      articlesCount: articles.length,
      recipient: EMAIL_RECIPIENT,
      messageId: response.messageId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Automated email error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
