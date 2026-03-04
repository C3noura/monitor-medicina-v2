import { NextResponse } from 'next/server';
import { getSystemStatus, getWeeklyArticles } from '@/lib/search-service';

export async function GET() {
  try {
    const status = getSystemStatus();
    const weeklyArticles = getWeeklyArticles();
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        weeklyArticles
      }
    });
  } catch (error) {
    console.error('Error getting status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get system status' },
      { status: 500 }
    );
  }
}
