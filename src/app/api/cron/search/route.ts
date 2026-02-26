import { NextResponse } from 'next/server';

interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet: string;
  publicationDate: string | null;
  dateFound: string;
}

// Reputable medical sources
const REPUTABLE_SOURCES = [
  'pmc.ncbi.nlm.nih.gov',
  'pubmed.ncbi.nlm.nih.gov',
  'aabb.org',
  'who.int',
  'ashpublications.org',
  'sciencedirect.com',
  'link.springer.com',
  'researchgate.net'
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// PubMed E-utilities API (FREE)
async function searchPubMed(query: string): Promise<Article[]> {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=10&retmode=json&sort=relevance`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return [];
    
    const searchData = await searchResponse.json();
    const ids = searchData?.esearchresult?.idlist || [];
    
    if (ids.length === 0) return [];
    
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
    
    const fetchResponse = await fetch(fetchUrl);
    if (!fetchResponse.ok) return [];
    
    const fetchText = await fetchResponse.text();
    
    const articles: Article[] = [];
    const titleMatches = [...fetchText.matchAll(/<ArticleTitle>([^<]+)<\/ArticleTitle>/g)];
    const pmidMatches = [...fetchText.matchAll(/<PMID[^>]*>([^<]+)<\/PMID>/g)];
    const abstractMatches = [...fetchText.matchAll(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/g)];
    
    for (let i = 0; i < Math.min(pmidMatches.length, titleMatches.length); i++) {
      articles.push({
        id: generateId(),
        title: titleMatches[i][1],
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmidMatches[i][1]}/`,
        source: 'pubmed.ncbi.nlm.nih.gov',
        snippet: abstractMatches[i]?.[1]?.substring(0, 300) || '',
        publicationDate: null,
        dateFound: new Date().toISOString()
      });
    }
    
    return articles;
  } catch (error) {
    return [];
  }
}

// Europe PMC API (FREE)
async function searchEuropePMC(query: string): Promise<Article[]> {
  try {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=10`;
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    const results = data?.resultList?.result || [];
    
    return results.map((item: any) => ({
      id: generateId(),
      title: item.title || 'Untitled',
      url: `https://europepmc.org/article/med/${item.pmid || item.pmcid}`,
      source: 'europepmc.org',
      snippet: item.abstractText?.substring(0, 300) || '',
      publicationDate: item.pubYear || null,
      dateFound: new Date().toISOString()
    }));
  } catch (error) {
    return [];
  }
}

// Curated articles
const CURATED_ARTICLES: Article[] = [
  {
    id: generateId(),
    title: 'Patient Blood Management Program Implementation - PMC',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11296688',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'PBM reduces need for blood transfusions, decreasing associated complications.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'WHO Guidance on Patient Blood Management',
    url: 'https://www.who.int/publications/i/item/9789240104662',
    source: 'who.int',
    snippet: 'Framework to implement PBM at national and institutional levels.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Cardiac Surgery and Blood-Saving Techniques',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8844256',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'Blood conservation strategies in cardiac surgery.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Outcomes in Jehovah\'s Witness Cardiac Surgery',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8446884',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'Bloodless protocol outcomes similar to standard care.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  },
  {
    id: generateId(),
    title: 'Alternatives to Blood Transfusion',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9666052',
    source: 'pmc.ncbi.nlm.nih.gov',
    snippet: 'Cell salvage, hemostatic agents, anemia management.',
    publicationDate: '2024',
    dateFound: new Date().toISOString()
  }
];

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  try {
    const allArticles: Article[] = [];
    const seenUrls = new Set<string>();

    // Search PubMed
    const pubmedArticles = await searchPubMed('bloodless medicine patient blood management');
    for (const article of pubmedArticles) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        allArticles.push(article);
      }
    }

    // Search Europe PMC
    const europeArticles = await searchEuropePMC('bloodless surgery transfusion');
    for (const article of europeArticles) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        allArticles.push(article);
      }
    }

    // Add curated articles
    for (const article of CURATED_ARTICLES) {
      if (!seenUrls.has(article.url)) {
        allArticles.push({ ...article, id: generateId() });
      }
    }

    console.log(`✅ Automated search: ${allArticles.length} articles`);

    return NextResponse.json({
      success: true,
      articlesCount: allArticles.length,
      articles: allArticles,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Automated search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
