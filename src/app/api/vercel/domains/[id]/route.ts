import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Domain from '@/models/Domain';
import { vercelApi } from '@/lib/vercel-api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // Verifica che il dominio appartenga all'utente
    const domain = await Domain.findById(id);
    if (!domain || domain.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Dominio non trovato' }, { status: 404 });
    }

    // Verifica che il dominio sia verificato e attivo
    if (!domain.isVerified || !domain.isActive) {
      return NextResponse.json(
        { error: 'Il dominio deve essere verificato e attivo prima di essere aggiunto a Vercel' },
        { status: 400 }
      );
    }

    // Verifica se Vercel API è configurata
    if (!vercelApi.isConfigured()) {
      return NextResponse.json(
        { error: 'Vercel API non configurata' },
        { status: 500 }
      );
    }

    try {
      // Aggiungi il dominio a Vercel
      const vercelResponse = await vercelApi.addDomain(domain.domain);
      
      // Aggiorna il database
      domain.vercelDomainId = vercelResponse.id;
      domain.vercelStatus = vercelResponse.status;
      domain.vercelError = null;
      await domain.save();

      return NextResponse.json({
        success: true,
        message: 'Dominio aggiunto a Vercel con successo',
        vercelStatus: vercelResponse.status,
        vercelDomainId: vercelResponse.id
      });

    } catch (vercelError: any) {
      // Aggiorna lo stato di errore nel database
      domain.vercelStatus = 'error';
      domain.vercelError = vercelError.message;
      await domain.save();

      return NextResponse.json(
        { 
          error: 'Errore nell\'aggiunta del dominio a Vercel',
          details: vercelError.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Vercel domain addition error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // Verifica che il dominio appartenga all'utente
    const domain = await Domain.findById(id);
    if (!domain || domain.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Dominio non trovato' }, { status: 404 });
    }

    // Verifica se Vercel API è configurata
    if (!vercelApi.isConfigured()) {
      return NextResponse.json(
        { error: 'Vercel API non configurata' },
        { status: 500 }
      );
    }

    try {
      // Rimuovi il dominio da Vercel
      await vercelApi.removeDomain(domain.domain);
      
      // Aggiorna il database
      domain.vercelDomainId = null;
      domain.vercelStatus = 'removed';
      domain.vercelError = null;
      await domain.save();

      return NextResponse.json({
        success: true,
        message: 'Dominio rimosso da Vercel con successo'
      });

    } catch (vercelError: any) {
      // Aggiorna lo stato di errore nel database
      domain.vercelStatus = 'error';
      domain.vercelError = vercelError.message;
      await domain.save();

      return NextResponse.json(
        { 
          error: 'Errore nella rimozione del dominio da Vercel',
          details: vercelError.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Vercel domain removal error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // Verifica che il dominio appartenga all'utente
    const domain = await Domain.findById(id);
    if (!domain || domain.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Dominio non trovato' }, { status: 404 });
    }

    // Verifica se Vercel API è configurata
    if (!vercelApi.isConfigured()) {
      return NextResponse.json(
        { error: 'Vercel API non configurata' },
        { status: 500 }
      );
    }

    try {
      // Ottieni lo stato del dominio da Vercel
      const vercelStatus = await vercelApi.getDomainStatus(domain.domain);
      
      // Aggiorna il database con lo stato corrente
      domain.vercelStatus = vercelStatus.status;
      domain.vercelError = vercelStatus.error || null;
      await domain.save();

      return NextResponse.json({
        vercelStatus: vercelStatus.status,
        vercelDomainId: domain.vercelDomainId,
        vercelError: domain.vercelError,
        lastChecked: new Date()
      });

    } catch (vercelError: any) {
      return NextResponse.json(
        { 
          error: 'Errore nel controllo dello stato Vercel',
          details: vercelError.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Vercel domain status check error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
