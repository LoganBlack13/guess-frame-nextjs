import { NextRequest, NextResponse } from 'next/server';
import { cleanupInactivePlayers } from '@/lib/rooms';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    await cleanupInactivePlayers(code);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Cleanup API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
