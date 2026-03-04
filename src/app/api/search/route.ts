import { NextResponse } from 'next/server';

// Interface unificada para artigos de pesquisa
interface ResearchPaper {
  id: string;
  source: string;
  title: string;
  authors: string;
  year: string;
  abstract: string;
  url: string;
  isPortuguese?: boolean;
  hasFullText?: boolean;
  citationCount?: number;
  isPreprint?: boolean;
  dateFound?: string;
  expiresAt?: string;
  relevanceScore?: number;
}

// Article expiration period in days
const ARTICLE_EXPIRATION_DAYS = 30;

// Add expiration date to article
function addExpirationDate(paper: ResearchPaper): ResearchPaper {
  const dateFound = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ARTICLE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return { ...paper, dateFound, expiresAt };
}

// Configuração de datas
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 4; // 2021

// Fake sites para excluir
const FAKE_SITES = [
  'actamedicaportuguesa.com',
  'scielo.pt',
  'revportcardiologia.pt',
  'rpmgf.pt',
  'spmi.pt',
  'ordemdosmedicos.pt',
  'apmc.pt',
];

// Termos de busca otimizados - SEM operadores booleanos complexos para melhor compatibilidade
const SEARCH_QUERIES = [
  'Patient Blood Management surgery',
  'Bloodless surgery techniques',
  'Anemia management without transfusion',
  'Blood conservation surgery',
  'Intraoperative cell salvage',
  'Preoperative anemia optimization',
  'transfusion alternatives medicine',
  'autologous blood transfusion',
];

// Termos em português
const PORTUGUESE_QUERIES = [
  'medicina sem sangue',
  'gestão de sangue do paciente',
  'cirurgia sem transfusão',
  'tratamento sem transfusão',
];

// Palavras-chave relevantes para filtrar resultados (todas devem aparecer no título ou abstract)
const RELEVANT_KEYWORDS = [
  // Inglês
  'bloodless', 'blood conservation', 'patient blood management', 'pbm',
  'transfusion alternative', 'without transfusion', 'no transfusion',
  'autologous', 'cell salvage', 'blood salvage', 'cell saver',
  'anemia management', 'hemoglobin optimization', 'erythropoietin',
  'intraoperative', 'perioperative', 'preoperative anemia',
  'jehovah witness', 'blood refuse', 'bloodless surgery',
  // Português
  'sem sangue', 'sem transfusão', 'medicina sem sangue',
  'gestão de sangue', 'conservação de sangue',
  'alternativa à transfusão', 'autóloga', 'salvamento de sangue',
];

// Verificar se o artigo é relevante (contém palavras-chave no título ou abstract)
function isRelevantArticle(title: string, abstract: string): boolean {
  const text = `${title} ${abstract}`.toLowerCase();
  return RELEVANT_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

// Calcular pontuação de relevância (mais keywords = mais relevante)
function calculateRelevanceScore(title: string, abstract: string): number {
  const text = `${title} ${abstract}`.toLowerCase();
  let score = 0;
  for (const keyword of RELEVANT_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      score++;
    }
  }
  return score;
}

class MedicalResearchAgent {
  private readonly SEMANTIC_SCHOLAR_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
  private readonly EUROPE_PMC_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";
  private readonly PUBMED_SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
  private readonly PUBMED_SUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
  private readonly PUBMED_FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isFakeSite(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      return FAKE_SITES.some(site => hostname === site || hostname.endsWith('.' + site));
    } catch {
      return false;
    }
  }

  private detectPortuguese(title: string, abstract: string): boolean {
    const keywords = ['medicina', 'sangue', 'transfusão', 'paciente', 'tratamento', 
                      'hospital', 'cirurgia', 'anemia', 'portugal', 'saúde'];
    const text = `${title} ${abstract}`.toLowerCase();
    return keywords.some(k => text.includes(k));
  }

  private isValidYear(year: string | null): boolean {
    if (!year) return true;
    const y = parseInt(year);
    return y >= MIN_YEAR && y <= CURRENT_YEAR;
  }

  /**
   * Busca no Europe PMC (Excelente para Open Access)
   * - JSON nativo
   * - Texto completo disponível
   * - Inclui PubMed + mais fontes
   */
  async fetchEuropePMC(query: string): Promise<ResearchPaper[]> {
    try {
      const params = new URLSearchParams({
        query: `${query} AND PUB_YEAR:[${MIN_YEAR} TO ${CURRENT_YEAR}]`,
        format: 'json',
        pageSize: '5',
        resultType: 'core',
        sort: 'P_PDATE_D desc'
      });

      const response = await fetch(`${this.EUROPE_PMC_URL}?${params}`);
      if (!response.ok) return [];

      const data = await response.json();
      const results = data?.resultList?.result || [];

      return results
        .filter((r: any) => this.isValidYear(r.pubYear))
        .map((r: any) => ({
          id: this.generateId(),
          source: 'Europe PMC',
          title: r.title || 'Untitled',
          authors: r.authorString || 'Unknown authors',
          year: r.pubYear || '',
          abstract: r.abstractText || "Resumo não disponível.",
          url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/med/${r.pmid}`,
          isPortuguese: this.detectPortuguese(r.title, r.abstractText),
          hasFullText: r.isOpenAccess === 'Y' || !!r.pmcid
        }));
    } catch (error) {
      console.error('Europe PMC error:', error);
      return [];
    }
  }

  /**
   * Busca no Semantic Scholar (IA para relevância)
   * - Ranking por citações
   * - Resumos gerados por IA
   * - Links para PDFs abertos
   */
  async fetchSemanticScholar(query: string): Promise<ResearchPaper[]> {
    try {
      const params = new URLSearchParams({
        query: query,
        limit: '5',
        fields: 'title,authors,year,abstract,url,citationCount,openAccessPdf,publicationDate',
        year: `${MIN_YEAR}-${CURRENT_YEAR}`
      });

      const response = await fetch(`${this.SEMANTIC_SCHOLAR_URL}?${params}`, {
        headers: { 'User-Agent': 'MonitorMedicinaSemSangue/1.0' }
      });
      if (!response.ok) return [];

      const data = await response.json();
      const results = data?.data || [];

      return results
        .filter((r: any) => this.isValidYear(r.year?.toString()))
        .map((r: any) => ({
          id: this.generateId(),
          source: 'Semantic Scholar',
          title: r.title || 'Untitled',
          authors: r.authors?.map((a: any) => a.name).join(', ') || 'Unknown authors',
          year: r.year?.toString() || '',
          abstract: r.abstract || "Resumo não disponível.",
          url: r.openAccessPdf?.url || r.url || `https://semanticscholar.org/paper/${r.paperId}`,
          isPortuguese: this.detectPortuguese(r.title, r.abstract),
          citationCount: r.citationCount || 0,
          hasFullText: !!r.openAccessPdf?.url
        }));
    } catch (error) {
      console.error('Semantic Scholar error:', error);
      return [];
    }
  }

  /**
   * Busca no PubMed (Padrão Ouro via E-Utilities)
   * - 35+ milhões de citações
   * - MeSH terms
   * - Dois passos: Search -> Summary/Fetch
   */
  async fetchPubMed(query: string): Promise<ResearchPaper[]> {
    try {
      // Passo 1: Buscar IDs com filtro de data
      const searchParams = new URLSearchParams({
        db: 'pubmed',
        term: `${query} AND (${MIN_YEAR}:${CURRENT_YEAR}[pdat])`,
        retmode: 'json',
        retmax: '5',
        sort: 'relevance'
      });

      const searchResponse = await fetch(`${this.PUBMED_SEARCH_URL}?${searchParams}`, {
        headers: { 'User-Agent': 'MonitorMedicinaSemSangue/1.0 (mailto:rui.cenoura@gmail.com)' }
      });
      if (!searchResponse.ok) return [];

      const searchData = await searchResponse.json();
      const ids = searchData?.esearchresult?.idlist || [];
      
      if (ids.length === 0) return [];

      // Passo 2: Buscar Detalhes (esummary para dados básicos)
      const summaryParams = new URLSearchParams({
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'json'
      });

      const summaryResponse = await fetch(`${this.PUBMED_SUMMARY_URL}?${summaryParams}`, {
        headers: { 'User-Agent': 'MonitorMedicinaSemSangue/1.0' }
      });
      if (!summaryResponse.ok) return [];

      const summaryData = await summaryResponse.json();
      const results = summaryData?.result || {};
      const uids = results?.uids || [];

      // Passo 3: Buscar abstracts (efetch)
      const fetchParams = new URLSearchParams({
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'xml'
      });

      const fetchResponse = await fetch(`${this.PUBMED_FETCH_URL}?${fetchParams}`, {
        headers: { 'User-Agent': 'MonitorMedicinaSemSangue/1.0' }
      });
      const fetchText = fetchResponse.ok ? await fetchResponse.text() : '';

      // Parse abstracts do XML
      const abstractMap: Record<string, string> = {};
      const articleBlocks = fetchText.split('<PubmedArticle>');
      for (const block of articleBlocks) {
        const pmidMatch = block.match(/<PMID[^>]*>([^<]+)<\/PMID>/);
        const abstractMatch = block.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
        if (pmidMatch && abstractMatch) {
          abstractMap[pmidMatch[1]] = abstractMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 500);
        }
      }

      return uids.map((uid: string) => {
        const r = results[uid];
        if (!r || typeof r !== 'object') return null;

        const year = r.pubdate?.split(' ')[0] || '';
        const abstract = abstractMap[uid] || "Resumo disponível no link.";

        return {
          id: this.generateId(),
          source: 'PubMed',
          title: r.title || 'Untitled',
          authors: r.authors?.map((a: any) => a.name).join(', ') || 'Unknown authors',
          year: year,
          abstract: abstract,
          url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
          isPortuguese: this.detectPortuguese(r.title, abstract)
        };
      }).filter((p: ResearchPaper | null): p is ResearchPaper => p !== null && this.isValidYear(p.year));
    } catch (error) {
      console.error('PubMed error:', error);
      return [];
    }
  }

  /**
   * Busca no DOAJ (Open Access Journals)
   * - Inclui revistas portuguesas
   */
  async fetchDOAJ(query: string): Promise<ResearchPaper[]> {
    try {
      const params = new URLSearchParams({
        query: query,
        page: '1',
        pageSize: '5'
      });

      const response = await fetch(`https://api.doaj.org/search/articles?${params}`);
      if (!response.ok) return [];

      const data = await response.json();
      const results = data?.results || [];

      return results.map((item: any) => {
        const bibjson = item?.bibjson || {};
        const isPortuguese = bibjson?.journal?.publisher?.country === 'PT' ||
                            this.detectPortuguese(bibjson?.title, bibjson?.abstract);

        return {
          id: this.generateId(),
          source: 'DOAJ',
          title: bibjson?.title || 'Untitled',
          authors: bibjson?.author?.map((a: any) => a.name).join(', ') || 'Unknown authors',
          year: bibjson?.year || '',
          abstract: bibjson?.abstract?.substring(0, 500) || "Resumo não disponível.",
          url: bibjson?.link?.[0]?.url || `https://doaj.org/article/${item.id}`,
          isPortuguese: isPortuguese,
          hasFullText: true
        };
      });
    } catch (error) {
      console.error('DOAJ error:', error);
      return [];
    }
  }

  /**
   * Orquestrador: Busca em todas as fontes e consolida
   */
  async searchAll(query: string): Promise<ResearchPaper[]> {
    console.log(`🔍 Pesquisando por: "${query}"...`);
    
    // Busca paralela em todas as fontes
    const [epmc, semantic, pubmed, doaj] = await Promise.all([
      this.fetchEuropePMC(query),
      this.fetchSemanticScholar(query),
      this.fetchPubMed(query),
      this.fetchDOAJ(query)
    ]);

    const allResults = [...epmc, ...semantic, ...pubmed, ...doaj];

    // Remover duplicados por URL e filtrar por relevância
    const seenUrls = new Set<string>();
    const uniqueResults = allResults.filter(paper => {
      if (seenUrls.has(paper.url) || this.isFakeSite(paper.url)) return false;
      // Filtrar por relevância - deve conter palavras-chave
      if (!isRelevantArticle(paper.title, paper.abstract)) return false;
      seenUrls.add(paper.url);
      return true;
    });

    // Calcular pontuação de relevância para cada artigo
    const scoredResults = uniqueResults.map(paper => ({
      ...paper,
      relevanceScore: calculateRelevanceScore(paper.title, paper.abstract)
    }));

    // Ordenar: Relevância primeiro, depois Português, depois citações, depois ano
    scoredResults.sort((a, b) => {
      // Primeiro por relevância (mais keywords)
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      // Depois português
      if (a.isPortuguese && !b.isPortuguese) return -1;
      if (!a.isPortuguese && b.isPortuguese) return 1;
      // Depois citações
      if (a.citationCount && b.citationCount) return b.citationCount - a.citationCount;
      // Por fim, ano mais recente
      return parseInt(b.year) - parseInt(a.year);
    });

    console.log(`✅ ${scoredResults.length} artigos relevantes encontrados`);
    return scoredResults;
  }
}

// API Route Handler
export async function POST(request: Request) {
  try {
    const agent = new MedicalResearchAgent();
    const allPapers: ResearchPaper[] = [];

    // Buscar com termos em inglês (usar TODAS as queries)
    for (const query of SEARCH_QUERIES) {
      const papers = await agent.searchAll(query);
      allPapers.push(...papers);
    }

    // Buscar com termos em português
    for (const query of PORTUGUESE_QUERIES) {
      const papers = await agent.searchAll(query);
      allPapers.push(...papers);
    }

    // Remover duplicados finais
    const seenUrls = new Set<string>();
    const uniquePapers = allPapers.filter(paper => {
      if (seenUrls.has(paper.url)) return false;
      seenUrls.add(paper.url);
      return true;
    });

    // Ordenar novamente
    uniquePapers.sort((a, b) => {
      if (a.isPortuguese && !b.isPortuguese) return -1;
      if (!a.isPortuguese && b.isPortuguese) return 1;
      if (a.citationCount && b.citationCount) return b.citationCount - a.citationCount;
      return parseInt(b.year || '0') - parseInt(a.year || '0');
    });

    // Limitar a 15 resultados (consistente com MAX_ARTICLES)
    const finalPapers = uniquePapers.slice(0, 15).map(addExpirationDate);

    // Estatísticas
    const portugueseCount = finalPapers.filter(p => p.isPortuguese).length;
    const fullTextCount = finalPapers.filter(p => p.hasFullText).length;
    const sourcesCount = new Set(finalPapers.map(p => p.source)).size;

    return NextResponse.json({
      success: true,
      data: {
        articlesFound: finalPapers.length,
        portugueseArticles: portugueseCount,
        fullTextArticles: fullTextCount,
        weeklyArticles: finalPapers,
        message: `Pesquisa concluída! ${finalPapers.length} artigos encontrados (${portugueseCount} em português, ${fullTextCount} com texto completo).`,
        sources: {
          'PubMed': 'Padrão ouro - 35+ milhões de citações médicas',
          'Europe PMC': 'Open Access - Texto completo disponível',
          'Semantic Scholar': 'IA para relevância e citações',
          'DOAJ': 'Revistas em acesso aberto'
        },
        dateRange: `${MIN_YEAR}-${CURRENT_YEAR}`,
        searchTerms: SEARCH_QUERIES.slice(0, 3)
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao realizar pesquisa. Tente novamente.',
      data: {
        articlesFound: 0,
        weeklyArticles: []
      }
    });
  }
}
