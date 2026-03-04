import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const DATA_DIR = '/home/z/my-project/data';
const LAST_SEARCH_FILE = path.join(DATA_DIR, 'last-search.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Reputable medical sources for bloodless medicine
const REPUTABLE_SOURCES = [
  'pmc.ncbi.nlm.nih.gov',
  'pubmed.ncbi.nlm.nih.gov',
  'aabb.org',
  'who.int',
  'ashpublications.org',
  'sciencedirect.com',
  'link.springer.com',
  'jmir.org',
  'researchgate.net',
  'nejm.org',
  'thelancet.com',
  'bmj.com',
  'jamanetwork.com',
  'nature.com',
  'frontiersin.org',
  'plos.org',
  'mdpi.com',
  'biomedcentral.com'
];

// Search queries for bloodless medicine
const SEARCH_QUERIES = [
  'bloodless medicine surgery treatment 2024 2025',
  'Patient Blood Management PBM guidelines new techniques',
  'transfusion alternatives medical research',
  'blood conservation surgery techniques',
  'medicina sem sangue tratamento sem transfusão',
  'bloodless cardiac surgery outcomes',
  'anemia management without transfusion',
  'cell salvage autologous transfusion',
  "Jehovah's Witnesses bloodless surgery",
  'testemunhas de Jeová medicina sem sangue'
];

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet: string;
  publicationDate: string | null;
  dateFound: string;
}

export interface LastSearchData {
  lastSearchTimestamp: string | null;
  nextScheduledSearch: string | null;
  articlesFound: number;
  sourcesSearched: string[];
}

export interface ArticlesData {
  articles: Article[];
  lastUpdated: string | null;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Check if URL is from a reputable source
function isReputableSource(url: string): boolean {
  const hostname = new URL(url).hostname.replace('www.', '');
  return REPUTABLE_SOURCES.some(source => 
    hostname === source || hostname.endsWith('.' + source)
  );
}

// Extract domain name from URL
function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname;
  } catch {
    return 'Unknown';
  }
}

// Read last search data
export function readLastSearchData(): LastSearchData {
  try {
    ensureDataDir();
    if (!fs.existsSync(LAST_SEARCH_FILE)) {
      return {
        lastSearchTimestamp: null,
        nextScheduledSearch: null,
        articlesFound: 0,
        sourcesSearched: []
      };
    }
    const data = fs.readFileSync(LAST_SEARCH_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      lastSearchTimestamp: null,
      nextScheduledSearch: null,
      articlesFound: 0,
      sourcesSearched: []
    };
  }
}

// Write last search data
export function writeLastSearchData(data: LastSearchData): void {
  ensureDataDir();
  fs.writeFileSync(LAST_SEARCH_FILE, JSON.stringify(data, null, 2));
}

// Read articles data
export function readArticlesData(): ArticlesData {
  try {
    ensureDataDir();
    if (!fs.existsSync(ARTICLES_FILE)) {
      return { articles: [], lastUpdated: null };
    }
    const data = fs.readFileSync(ARTICLES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      articles: [],
      lastUpdated: null
    };
  }
}

// Write articles data
export function writeArticlesData(data: ArticlesData): void {
  ensureDataDir();
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(data, null, 2));
}

// Perform web search using z-ai-web-dev-sdk
export async function performSearch(): Promise<Article[]> {
  const zai = await ZAI.create();
  const allArticles: Article[] = [];
  const sourcesSet = new Set<string>();

  for (const query of SEARCH_QUERIES) {
    try {
      const searchResult = await zai.functions.invoke('web_search', {
        query,
        num: 10
      });

      if (Array.isArray(searchResult)) {
        for (const item of searchResult) {
          // Filter to only include reputable sources
          if (isReputableSource(item.url)) {
            const article: Article = {
              id: generateId(),
              title: item.name || 'Untitled',
              url: item.url,
              source: extractSourceName(item.url),
              snippet: item.snippet || '',
              publicationDate: item.date || null,
              dateFound: new Date().toISOString()
            };
            
            // Avoid duplicates
            if (!allArticles.some(a => a.url === article.url)) {
              allArticles.push(article);
              sourcesSet.add(article.source);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error searching for query "${query}":`, error);
    }
  }

  return allArticles;
}

// Save search results
export function saveSearchResults(articles: Article[]): void {
  // Read existing articles
  const existingData = readArticlesData();
  
  // Merge new articles with existing, avoiding duplicates
  const existingUrls = new Set(existingData.articles.map(a => a.url));
  const newArticles = articles.filter(a => !existingUrls.has(a.url));
  
  const mergedArticles = [...newArticles, ...existingData.articles];
  
  // Keep only last 100 articles
  const limitedArticles = mergedArticles.slice(0, 100);
  
  // Update last search data
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  writeLastSearchData({
    lastSearchTimestamp: now.toISOString(),
    nextScheduledSearch: nextWeek.toISOString(),
    articlesFound: articles.length,
    sourcesSearched: [...new Set(articles.map(a => a.source))]
  });
  
  // Write articles
  writeArticlesData({
    articles: limitedArticles,
    lastUpdated: now.toISOString()
  });
}

// Check if a new search is needed (more than 7 days)
export function needsSearch(): boolean {
  const lastSearch = readLastSearchData();
  
  if (!lastSearch.lastSearchTimestamp) {
    return true;
  }
  
  const lastSearchDate = new Date(lastSearch.lastSearchTimestamp);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return lastSearchDate < weekAgo;
}

// Get system status
export function getSystemStatus(): {
  lastSearch: LastSearchData;
  articlesCount: number;
  emailRecipient: string;
} {
  const lastSearch = readLastSearchData();
  const articles = readArticlesData();
  
  return {
    lastSearch,
    articlesCount: articles.articles.length,
    emailRecipient: 'rui.cenoura@gmail.com'
  };
}

// Get weekly articles (articles from the last 7 days)
export function getWeeklyArticles(): Article[] {
  const articles = readArticlesData();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return articles.articles.filter(a => 
    new Date(a.dateFound) >= weekAgo
  );
}
