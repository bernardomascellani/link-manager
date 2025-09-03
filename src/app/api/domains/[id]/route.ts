import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Domain from '@/models/Domain';
import { vercelApi } from '@/lib/vercel-api';

// DELETE - Rimuovi dominio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    console.log('=== DOMAIN ID DEBUG ===');
    console.log('Received domain ID:', id);
    console.log('Domain ID type:', typeof id);
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID dominio richiesto' },
        { status: 400 }
      );
    }

    await connectDB();

    // Trova il dominio prima di eliminarlo
    const domain = await Domain.findOne({ 
      _id: id, 
      userId: session.user.id 
    });

    if (!domain) {
      return NextResponse.json(
        { error: 'Dominio non trovato' },
        { status: 404 }
      );
    }

    // Rimuovi il dominio da Vercel se è configurato e il dominio è in Vercel
    let vercelMessage = '';
    console.log('=== DOMAIN DELETION DEBUG ===');
    console.log('Domain:', domain.domain);
    console.log('Vercel configured:', vercelApi.isConfigured());
    console.log('Vercel domain ID:', domain.vercelDomainId);
    console.log('Vercel domain ID type:', typeof domain.vercelDomainId);
    console.log('Vercel domain ID is null:', domain.vercelDomainId === null);
    console.log('Vercel domain ID is undefined:', domain.vercelDomainId === undefined);
    console.log('Vercel status:', domain.vercelStatus);
    console.log('Full domain object:', JSON.stringify(domain, null, 2));
    
    if (vercelApi.isConfigured() && domain.vercelDomainId) {
      try {
        console.log(`Attempting to remove domain ${domain.vercelDomainId} from Vercel...`);
        await vercelApi.removeDomain(domain.vercelDomainId);
        vercelMessage = ' e rimosso da Vercel';
        console.log(`Domain ${domain.domain} removed from Vercel successfully`);
      } catch (vercelError: any) {
        console.error('Error removing domain from Vercel:', vercelError);
        // Non bloccare l'eliminazione se Vercel fallisce
        vercelMessage = ' (errore nella rimozione da Vercel)';
      }
    } else {
      console.log('Domain not removed from Vercel - either not configured or not in Vercel');
    }

    // Elimina il dominio dal database
    await Domain.findOneAndDelete({ 
      _id: id, 
      userId: session.user.id 
    });

    return NextResponse.json(
      { message: `Dominio rimosso con successo${vercelMessage}` },
      { status: 200 }
    );

  } catch (error) {
    console.error('Delete domain error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT - Attiva/Disattiva dominio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { isActive } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID dominio richiesto' },
        { status: 400 }
      );
    }

    await connectDB();

    // Trova e aggiorna il dominio
    const domain = await Domain.findOne({ 
      _id: id, 
      userId: session.user.id 
    });

    if (!domain) {
      return NextResponse.json(
        { error: 'Dominio non trovato' },
        { status: 404 }
      );
    }

    if (isActive && !domain.isVerified) {
      return NextResponse.json(
        { error: 'Non puoi attivare un dominio non verificato' },
        { status: 400 }
      );
    }

    domain.isActive = isActive;
    
    // Se il dominio viene disattivato, rimuovilo da Vercel
    let vercelMessage = '';
    if (!isActive && vercelApi.isConfigured() && domain.vercelDomainId) {
      try {
        await vercelApi.removeDomain(domain.vercelDomainId);
        domain.vercelDomainId = null;
        domain.vercelStatus = 'removed';
        domain.vercelError = null;
        vercelMessage = ' e rimosso da Vercel';
        console.log(`Domain ${domain.domain} removed from Vercel due to deactivation`);
      } catch (vercelError: any) {
        console.error('Error removing domain from Vercel:', vercelError);
        domain.vercelStatus = 'error';
        domain.vercelError = vercelError.message;
        vercelMessage = ' (errore nella rimozione da Vercel)';
      }
    }
    
    await domain.save();

    return NextResponse.json(
      { 
        message: `${isActive ? 'Dominio attivato' : 'Dominio disattivato'}${vercelMessage}`,
        domain 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Update domain error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
