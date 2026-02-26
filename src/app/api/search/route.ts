import { NextResponse } from 'next/server';

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet: string;
  publicationDate: string | null;
  dateFound: string;
  language?: string;
  isPortuguese?: boolean;
  isPreprint?: boolean;
  citationCount?: number;
  hasFullText?: boolean;
}

// Current year for date filtering (last 4 years: 2021-2025)
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 4;

// Fake sites to EXCLUDE
const FAKE_SITES = [
  'actamedicaportuguesa.com',
  'scielo.pt',
  'revportcardiologia.pt',
  'rpmgf.pt',
  'spmi.pt',
  'ordemdosmedicos.pt',
  'apmc.pt',
  'revistaportuguesadepneumologia.com',
  'journalofpediatrics.eu',
  'arsmedica.pt',
  'revportgastrenterologia.com',
];

// MeSH Terms for precise medical searches (PubMed standard)
const MESH_TERMS = [
  '"Bloodless Medical Procedures"[MeSH]',
  '"Blood Transfusion"[MeSH] AND "alternatives"',
  '"Patient Blood Management"[MeSH]',
  '"Blood Conservation"[MeSH]',
  '"Intraoperative Cell Salvage"[MeSH]',
  '"Anemia"[MeSH] AND "therapy" AND "surgery"',
];

// Optimized search queries based on medical terminology
const SEARCH_QUERIES = {
  // Primary terms (most relevant)
  primary: [
    '"bloodless surgery"',
    '"patient blood management"',
    '"anemia management without transfusion"',
    '"blood-sparing techniques"',
    '"bloodless medicine"',
  ],
  // MeSH combined queries for PubMed
  mesh: [
    '"Bloodless Medical Procedures"[MeSH] OR "bloodless surgery"',
    '"Patient Blood Management"[MeSH]',
    '"Blood Conservation"[MeSH] AND surgery',
    '"Intraoperative Cell Salvage"[MeSH]',
    '"Preoperative Anemia"[MeSH] AND management',
  ],
  // Specific procedures
  procedures: [
    'cell salvage cardiac surgery',
    'autologous blood transfusion surgery',
    'acute normovolemic hemodilution',
    'erythropoietin preoperative anemia',
    'iron infusion before surgery',
  ],
  // Portuguese terms for Portuguese sources
  portuguese: [
    'medicina sem sangue',
    'gestão de sangue do paciente',
    'cirurgia sem transfusão',
    'alternativas transfusão sanguínea',
    'conservação sanguínea cirurgia',
  ]
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname;
  } catch {
    return 'Unknown';
  }
}

function isFakeSite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return FAKE_SITES.some(site => hostname === site || hostname.endsWith('.' + site));
  } catch {
    return false;
  }
}

function isValidYear(dateStr: string | null): boolean {
  if (!dateStr) return true;
  const yearMatch = dateStr.match(/\d{4}/);
  if (!yearMatch) return true;
  const year = parseInt(yearMatch[0]);
  return year >= MIN_YEAR && year <= CURRENT_YEAR;
}

function extractYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const yearMatch = dateStr.match(/\d{4}/);
  return yearMatch ? parseInt(yearMatch[0]) : null;
}

function detectPortuguese(title: string, snippet: string, sourceName: string): boolean {
  const portugueseKeywords = [
    'medicina', 'sangue', 'transfusão', 'paciente', 'tratamento',
    'hospital', 'clínico', 'saúde', 'doença', 'cirurgia', 'anemia',
    'portugal', 'português', 'brasileiro', 'revista', 'artigo',
    'sem sangue', 'alternativa', 'conservação'
  ];
  const combinedText = `${title} ${snippet} ${sourceName}`.toLowerCase();
  return portugueseKeywords.some(keyword => combinedText.includes(keyword));
}

// ==================== PUBMED E-UTILITIES API ====================
// The "gold standard" for medical searches - 35+ million citations
async function searchPubMed(query: string, useMesh: boolean = false): Promise<Article[]> {
  try {
    // Date filter for last 4 years
    const dateFilter = `AND (${MIN_YEAR}:${CURRENT_YEAR}[pdat])`;
    const fullQuery = useMesh ? `${query} ${dateFilter}` : `${query} ${dateFilter}`;
    
    // Step 1: Search for article IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(fullQuery)}&retmax=20&retmode=json&sort=relevance&datetype=pdat`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'MonitorMedicinaSemSangue/1.0 (mailto:rui.cenoura@gmail.com)'
      }
    });
    if (!searchResponse.ok) return [];
    
    const searchData = await searchResponse.json();
    const ids = searchData?.esearchresult?.idlist || [];
    
    if (ids.length === 0) return [];
    
    // Step 2: Fetch article details using efetch
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
    
    const fetchResponse = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'MonitorMedicinaSemSangue/1.0 (mailto:rui.cenoura@gmail.com)'
      }
    });
    if (!fetchResponse.ok) return [];
    
    const fetchText = await fetchResponse.text();
    const articles: Article[] = [];
    
    // Parse XML response
    const articleBlocks = fetchText.split('<PubmedArticle>').slice(1);
    
    for (const block of articleBlocks) {
      try {
        const titleMatch = block.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/);
        const abstractMatches = block.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
        const pmidMatch = block.match(/<PMID[^>]*>([^<]+)<\/PMID>/);
        const yearMatch = block.match(/<Year>([^<]+)<\/Year>/);
        const monthMatch = block.match(/<Month>([^<]+)<\/Month>/);
        const dayMatch = block.match(/<Day>([^<]+)<\/Day>/);
        
        if (pmidMatch && titleMatch) {
          // Build publication date
          const year = yearMatch?.[1];
          const month = monthMatch?.[1];
          const day = dayMatch?.[1];
          const pubDate = year ? `${year}${month ? `-${month.padStart(2, '0')}` : ''}${day ? `-${day.padStart(2, '0')}` : ''}` : null;
          
          // Extract and clean abstract
          let abstract = '';
          if (abstractMatches) {
            abstract = abstractMatches
              .map(m => m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
              .join(' ')
              .substring(0, 500);
          }
          
          // Check if full text is available (PMC)
          const hasPmc = block.includes('pmc') || block.includes('PMC');
          
          articles.push({
            id: generateId(),
            title: titleMatch[1].trim(),
            url: `https://pubmed.ncbi.nlm.nih.gov/${pmidMatch[1]}/`,
            source: 'pubmed.ncbi.nlm.nih.gov',
            snippet: abstract,
            publicationDate: pubDate,
            dateFound: new Date().toISOString(),
            language: 'en',
            isPortuguese: false,
            hasFullText: hasPmc
          });
        }
      } catch (parseError) {
        console.error('Error parsing PubMed article:', parseError);
      }
    }
    
    return articles;
  } catch (error) {
    console.error(`Error searching PubMed for "${query}":`, error);
    return [];
  }
}

// ==================== EUROPE PMC API ====================
// Excellent alternative - native JSON, includes full text articles
async function searchEuropePMC(query: string): Promise<Article[]> {
  try {
    // Search with date filter and open access preference
    const dateFilter = `PUB_YEAR:[${MIN_YEAR} TO ${CURRENT_YEAR}]`;
    const fullQuery = `${query} AND ${dateFilter}`;
    
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(fullQuery)}&format=json&pageSize=20&sort=P_PDATE_D desc&resulttype=core`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) return [];
    
    const data = await response.json();
    const results = data?.resultList?.result || [];
    
    return results
      .filter((item: any) => {
        const year = parseInt(item.pubYear || '0');
        return year >= MIN_YEAR && year <= CURRENT_YEAR;
      })
      .map((item: any) => {
        const hasFullText = item.isOpenAccess === 'Y' || item.pmcid;
        const isPortuguese = item.language === 'pt' || 
                            detectPortuguese(item.title || '', item.abstractText || '', '');
        
        return {
          id: generateId(),
          title: item.title || 'Untitled',
          url: hasFullText && item.pmcid 
            ? `https://europepmc.org/article/PMC/${item.pmcid}` 
            : `https://europepmc.org/article/med/${item.pmid}`,
          source: hasFullText ? 'europepmc.org (Open Access)' : 'europepmc.org',
          snippet: item.abstractText?.substring(0, 500) || '',
          publicationDate: item.pubYear || null,
          dateFound: new Date().toISOString(),
          language: isPortuguese ? 'pt' : 'en',
          isPortuguese: isPortuguese,
          hasFullText: hasFullText
        };
      });
  } catch (error) {
    console.error(`Error searching Europe PMC for "${query}":`, error);
    return [];
  }
}

// ==================== SEMANTIC SCHOLAR API ====================
// AI-powered relevance and citation analysis
async function searchSemanticScholar(query: string): Promise<Article[]> {
  try {
    const yearFilter = `year:${MIN_YEAR}-${CURRENT_YEAR}`;
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&year=${yearFilter}&limit=15&fields=title,abstract,url,year,citationCount,openAccessPdf,publicationDate,authors`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MonitorMedicinaSemSangue/1.0'
      }
    });
    if (!response.ok) return [];
    
    const data = await response.json();
    const results = data?.data || [];
    
    return results
      .filter((item: any) => {
        const year = item.year || extractYear(item.publicationDate);
        return year && year >= MIN_YEAR && year <= CURRENT_YEAR;
      })
      .map((item: any) => {
        const isPortuguese = detectPortuguese(item.title || '', item.abstract || '', '');
        
        return {
          id: generateId(),
          title: item.title || 'Untitled',
          url: item.openAccessPdf?.url || item.url || `https://semanticscholar.org/paper/${item.paperId}`,
          source: 'semanticscholar.org',
          snippet: item.abstract?.substring(0, 500) || '',
          publicationDate: item.publicationDate || (item.year ? `${item.year}` : null),
          dateFound: new Date().toISOString(),
          language: isPortuguese ? 'pt' : 'en',
          isPortuguese: isPortuguese,
          citationCount: item.citationCount || 0,
          hasFullText: !!item.openAccessPdf?.url
        };
      });
  } catch (error) {
    console.error(`Error searching Semantic Scholar for "${query}":`, error);
    return [];
  }
}

// ==================== MEDRXIV API ====================
// Preprints - cutting edge research before peer review
async function searchMedRxiv(query: string): Promise<Article[]> {
  try {
    // medRxiv uses a simple search API
    const url = `https://api.medrxiv.org/details/medrxiv/${encodeURIComponent(query)}`;
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    const results = data?.collection || [];
    
    return results
      .filter((item: any) => {
        const year = item.date ? extractYear(item.date) : null;
        return !year || (year >= MIN_YEAR && year <= CURRENT_YEAR);
      })
      .slice(0, 10)
      .map((item: any) => {
        return {
          id: generateId(),
          title: item.title || 'Untitled',
          url: `https://www.medrxiv.org/content/${item.doi}`,
          source: 'medrxiv.org (Preprint)',
          snippet: item.abstract?.substring(0, 500) || '',
          publicationDate: item.date || null,
          dateFound: new Date().toISOString(),
          language: 'en',
          isPortuguese: false,
          isPreprint: true
        };
      });
  } catch (error) {
    console.error(`Error searching medRxiv for "${query}":`, error);
    return [];
  }
}

// ==================== DOAJ API ====================
// Open access journals - may include Portuguese journals
async function searchDOAJ(query: string): Promise<Article[]> {
  try {
    const url = `https://api.doaj.org/search/articles/${encodeURIComponent(query)}?page=1&pageSize=15`;
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    const results = data?.results || [];
    
    return results
      .filter((item: any) => {
        const year = item?.created_date ? extractYear(item.created_date) : null;
        if (!year) return true;
        return year >= MIN_YEAR && year <= CURRENT_YEAR;
      })
      .map((item: any) => {
        const bibjson = item?.bibjson || {};
        const articleUrl = bibjson?.link?.[0]?.url || '';
        const isPortuguese = bibjson?.journal?.publisher?.country === 'PT' || 
                            detectPortuguese(bibjson?.title || '', bibjson?.abstract || '', '');
        
        return {
          id: generateId(),
          title: bibjson?.title || 'Untitled',
          url: articleUrl || `https://doaj.org/article/${item.id}`,
          source: articleUrl ? extractSourceName(articleUrl) : 'doaj.org',
          snippet: bibjson?.abstract?.substring(0, 500) || '',
          publicationDate: bibjson?.year || null,
          dateFound: new Date().toISOString(),
          language: isPortuguese ? 'pt' : 'en',
          isPortuguese: isPortuguese,
          hasFullText: true
        };
      })
      .filter((article: Article) => article.url && article.url.startsWith('http'));
  } catch (error) {
    console.error(`Error searching DOAJ for "${query}":`, error);
    return [];
  }
}

// ==================== CURATED HIGH-QUALITY ARTICLES ====================
const CURATED_ARTICLES: Article[] = [
  {
    id: generateId(),
    title: 'WHO Guidance on Implementing Patient Blood Management',
    url: 'https://www.who.int/publications/i/item/9789240104662',
    source: 'who.int',
    snippet: 'This guidance shows how the necessary structures and processes can be broadly replicated to improve overall population health through implementation of Patient Blood Management at national and institutional levels.',
    publicationDate: '2024',
    dateFound: new Date().toISOString(),
    language: 'en',
    isPortuguese: false,
    hasFullText: true
  },
  {
    id: generateId(),
    title: 'Patient Blood Management: The Global Standard of Care',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38097276/',
    source: 'pubmed.ncbi.nlm.nih.gov',
    snippet: 'Patient Blood Management (PBM) is a patient-centered, systematic, evidence-based approach to the care of patients who might need a blood transfusion.',
    publicationDate: '2024',
    dateFound: new Date().toISOString(),
    language: 'en',
    isPortuguese: false
  },
  {
    id: generateId(),
    title: 'Bloodless Cardiac Surgery: Modern Techniques and Outcomes',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8844256',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'In cardiac surgery, blood conservation strategies include aggressive use of PAD, low CPB prime, effective RAP, cell salvage techniques, and pharmacological agents to minimize transfusion requirements.',
    publicationDate: '2024',
    dateFound: new Date().toISOString(),
    language: 'en',
    isPortuguese: false,
    hasFullText: true
  }
];

export async function POST() {
  try {
    const allArticles: Article[] = [];
    const seenUrls = new Set<string>();

    // ==================== 1. PUBMED (Gold Standard) ====================
    console.log('🔍 Searching PubMed with MeSH terms...');
    
    // Search with MeSH terms for precision
    for (const meshQuery of SEARCH_QUERIES.mesh.slice(0, 3)) {
      try {
        const pubmedArticles = await searchPubMed(meshQuery, true);
        for (const article of pubmedArticles) {
          if (!seenUrls.has(article.url) && !isFakeSite(article.url)) {
            seenUrls.add(article.url);
            allArticles.push(article);
          }
        }
      } catch (e) {
        console.error('PubMed mesh search failed:', e);
      }
    }
    
    // Also search with primary terms
    for (const query of SEARCH_QUERIES.primary.slice(0, 2)) {
      try {
        const pubmedArticles = await searchPubMed(query);
        for (const article of pubmedArticles) {
          if (!seenUrls.has(article.url) && !isFakeSite(article.url)) {
            seenUrls.add(article.url);
            allArticles.push(article);
          }
        }
      } catch (e) {
        console.error('PubMed search failed:', e);
      }
    }

    // ==================== 2. EUROPE PMC (Open Access focus) ====================
    console.log('🔍 Searching Europe PMC for open access articles...');
    
    for (const query of SEARCH_QUERIES.primary.slice(0, 3)) {
      try {
        const europeArticles = await searchEuropePMC(query);
        for (const article of europeArticles) {
          if (!seenUrls.has(article.url) && !isFakeSite(article.url)) {
            seenUrls.add(article.url);
            allArticles.push(article);
          }
        }
      } catch (e) {
        console.error('Europe PMC search failed:', e);
      }
    }

    // ==================== 3. SEMANTIC SCHOLAR (AI-powered relevance) ====================
    console.log('🔍 Searching Semantic Scholar for relevant papers...');
    
    try {
      const semanticArticles = await searchSemanticScholar('patient blood management bloodless surgery');
      for (const article of semanticArticles) {
        if (!seenUrls.has(article.url) && !isFakeSite(article.url)) {
          seenUrls.add(article.url);
          allArticles.push(article);
        }
      }
    } catch (e) {
      console.error('Semantic Scholar search failed:', e);
    }

    // ==================== 4. MEDRXIV (Preprints) ====================
    console.log('🔍 Searching medRxiv for preprints...');
    
    try {
      const medrxivArticles = await searchMedRxiv('bloodless surgery patient blood management');
      for (const article of medrxivArticles) {
        if (!seenUrls.has(article.url) && !isFakeSite(article.url)) {
          seenUrls.add(article.url);
          allArticles.push(article);
        }
      }
    } catch (e) {
      console.error('medRxiv search failed:', e);
    }

    // ==================== 5. DOAJ (Open Access Journals) ====================
    console.log('🔍 Searching DOAJ for open access journals...');
    
    // Search with Portuguese terms for Portuguese content
    for (const query of SEARCH_QUERIES.portuguese.slice(0, 2)) {
      try {
        const doajArticles = await searchDOAJ(query);
        for (const article of doajArticles) {
          if (!seenUrls.has(article.url) && !isFakeSite(article.url)) {
            seenUrls.add(article.url);
            allArticles.push(article);
          }
        }
      } catch (e) {
        console.error('DOAJ search failed:', e);
      }
    }

    // ==================== ADD CURATED ARTICLES ====================
    for (const article of CURATED_ARTICLES) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        allArticles.push({
          ...article,
          id: generateId(),
          dateFound: new Date().toISOString()
        });
      }
    }

    // ==================== FILTER & SORT ====================
    
    // Filter out fake sites and invalid articles
    const validArticles = allArticles.filter(article => {
      if (!article.url || !article.url.startsWith('http')) return false;
      if (!article.title || article.title.length < 10) return false;
      if (isFakeSite(article.url)) return false;
      return true;
    });

    // Sort by: Portuguese first, then by citation count, then by date
    const sortedArticles = validArticles.sort((a, b) => {
      // Portuguese articles first
      if (a.isPortuguese && !b.isPortuguese) return -1;
      if (!a.isPortuguese && b.isPortuguese) return 1;
      
      // Then by citation count (if available)
      if (a.citationCount && b.citationCount) {
        return b.citationCount - a.citationCount;
      }
      
      // Then by publication date
      const yearA = extractYear(a.publicationDate) || 0;
      const yearB = extractYear(b.publicationDate) || 0;
      return yearB - yearA;
    });

    // Count statistics
    const portugueseCount = sortedArticles.filter(a => a.isPortuguese).length;
    const fullTextCount = sortedArticles.filter(a => a.hasFullText).length;
    const preprintCount = sortedArticles.filter(a => a.isPreprint).length;

    console.log(`✅ Search complete: ${sortedArticles.length} articles found`);

    return NextResponse.json({
      success: true,
      data: {
        articlesFound: sortedArticles.length,
        portugueseArticles: portugueseCount,
        fullTextArticles: fullTextCount,
        preprints: preprintCount,
        weeklyArticles: sortedArticles,
        message: `Pesquisa concluída! ${sortedArticles.length} artigos encontrados (${portugueseCount} em português, ${fullTextCount} com texto completo).`,
        sources: {
          pubmed: 'PubMed/NCBI - Base de dados médica padrão ouro',
          europepmc: 'Europe PMC - Artigos em acesso aberto',
          semanticScholar: 'Semantic Scholar - IA para relevância',
          medrxiv: 'medRxiv - Preprints recentes',
          doaj: 'DOAJ - Revistas em acesso aberto'
        },
        dateRange: `${MIN_YEAR}-${CURRENT_YEAR}`,
        searchTerms: {
          mesh: SEARCH_QUERIES.mesh.slice(0, 3),
          primary: SEARCH_QUERIES.primary.slice(0, 3)
        }
      }
    });
  } catch (error) {
    console.error('Error performing search:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao realizar pesquisa. Tente novamente.',
      data: {
        articlesFound: 0,
        weeklyArticles: CURATED_ARTICLES
      }
    });
  }
}
