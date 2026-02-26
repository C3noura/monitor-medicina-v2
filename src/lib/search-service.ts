import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

// Use /tmp for Vercel serverless environment
const DATA_DIR = process.env.VERCEL ? '/tmp/data' : '/home/z/my-project/data';
const LAST_SEARCH_FILE = path.join(DATA_DIR, 'last-search.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');

// In-memory cache for serverless environment
let memoryCache: {
  articles: Article[];
  lastSearch: LastSearchData | null;
} = {
  articles: [],
  lastSearch: null
};

// Ensure data directory exists
function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating data directory:', error);
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
  'cell salvage autologous transfusion'
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
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return REPUTABLE_SOURCES.some(source => 
      hostname === source || hostname.endsWith('.' + source)
    );
  } catch {
    return false;
  }
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
  // Return from memory cache if available
  if (memoryCache.lastSearch) {
    return memoryCache.lastSearch;
  }
  
  try {
    ensureDataDir();
    if (fs.existsSync(LAST_SEARCH_FILE)) {
      const data = fs.readFileSync(LAST_SEARCH_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      memoryCache.lastSearch = parsed;
      return parsed;
    }
  } catch (error) {
    console.error('Error reading last search data:', error);
  }
  
  return {
    lastSearchTimestamp: null,
    nextScheduledSearch: null,
    articlesFound: 0,
    sourcesSearched: []
  };
}

// Write last search data
export function writeLastSearchData(data: LastSearchData): void {
  memoryCache.lastSearch = data;
  try {
    ensureDataDir();
    fs.writeFileSync(LAST_SEARCH_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing last search data:', error);
  }
}

// Read articles data
export function readArticlesData(): ArticlesData {
  // Return from memory cache if available
  if (memoryCache.articles.length > 0) {
    return { articles: memoryCache.articles, lastUpdated: new Date().toISOString() };
  }
  
  try {
    ensureDataDir();
    if (fs.existsSync(ARTICLES_FILE)) {
      const data = fs.readFileSync(ARTICLES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      memoryCache.articles = parsed.articles || [];
      return parsed;
    }
  } catch (error) {
    console.error('Error reading articles data:', error);
  }
  
  return { articles: [], lastUpdated: null };
}

// Write articles data
export function writeArticlesData(data: ArticlesData): void {
  memoryCache.articles = data.articles;
  try {
    ensureDataDir();
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing articles data:', error);
  }
}

// Perform web search using z-ai-web-dev-sdk
export async function performSearch(): Promise<Article[]> {
  try {
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
  } catch (error) {
    console.error('Error initializing ZAI:', error);
    return [];
  }
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
