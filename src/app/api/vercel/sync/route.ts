import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Domain from '@/models/Domain';
import { vercelApi } from '@/lib/vercel-api';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    await connectDB();

    // Verifica se Vercel API è configurata
    if (!vercelApi.isConfigured()) {
      return NextResponse.json(
        { error: 'Vercel API non configurata' },
        { status: 500 }
      );
    }

    // Trova tutti i domini dell'utente che sono verificati e attivi ma non ancora in Vercel
    const domainsToSync = await Domain.find({
      userId: session.user.id,
      isVerified: true,
      isActive: true,
      $or: [
        { vercelStatus: { $exists: false } },
        { vercelStatus: 'pending' },
        { vercelStatus: 'error' }
      ]
    });

    const results = {
      success: 0,
      errors: 0,
      details: [] as Array<{ domain: string; status: string; message: string }>
    };

    // Sincronizza ogni dominio
    for (const domain of domainsToSync) {
      try {
        const vercelResponse = await vercelApi.addDomain(domain.domain);
        domain.vercelDomainId = vercelResponse.id;
        domain.vercelStatus = vercelResponse.status;
        domain.vercelError = null;
        await domain.save();
        
        results.success++;
        results.details.push({
          domain: domain.domain,
          status: 'success',
          message: 'Aggiunto a Vercel con successo'
        });
      } catch (vercelError: any) {
        domain.vercelStatus = 'error';
        domain.vercelError = vercelError.message;
        await domain.save();
        
        results.errors++;
        results.details.push({
          domain: domain.domain,
          status: 'error',
          message: vercelError.message
        });
      }
    }

    return NextResponse.json({
      message: `Sincronizzazione completata: ${results.success} successi, ${results.errors} errori`,
      results
    });

  } catch (error) {
    console.error('Vercel sync error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
