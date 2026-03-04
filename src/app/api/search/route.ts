import { NextResponse } from 'next/server';
import { performSearch, saveSearchResults, getWeeklyArticles } from '@/lib/search-service';

export async function POST() {
  try {
    // Perform web search
    const articles = await performSearch();
    
    // Save results
    saveSearchResults(articles);
    
    // Get weekly articles
    const weeklyArticles = getWeeklyArticles();
    
    return NextResponse.json({
      success: true,
      data: {
        articlesFound: articles.length,
        weeklyArticles: weeklyArticles.slice(0, 20), // Return up to 20 articles
        message: `Pesquisa concluída! ${articles.length} artigos encontrados.`
      }
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao realizar pesquisa' },
      { status: 500 }
    );
  }
}
