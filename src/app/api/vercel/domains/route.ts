import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { vercelApi } from '@/lib/vercel-api';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Verifica se Vercel API è configurata
    if (!vercelApi.isConfigured()) {
      return NextResponse.json(
        { error: 'Vercel API non configurata' },
        { status: 500 }
      );
    }

    try {
      // Lista tutti i domini del progetto Vercel
      const domains = await vercelApi.listDomains();
      
      return NextResponse.json({
        domains: domains,
        total: domains.length
      });

    } catch (vercelError: any) {
      return NextResponse.json(
        { 
          error: 'Errore nel recupero dei domini Vercel',
          details: vercelError.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Vercel domains list error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
