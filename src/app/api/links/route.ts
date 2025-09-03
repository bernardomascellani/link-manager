import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Link from '@/models/Link';
import Domain from '@/models/Domain';

// GET - Lista link dell'utente
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    await connectDB();

    const links = await Link.find({ userId: session.user.id })
      .populate('domainId', 'domain isActive')
      .sort({ createdAt: -1 });

    return NextResponse.json({ links }, { status: 200 });

  } catch (error) {
    console.error('Get links error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST - Crea nuovo link
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { domainId, shortPath, targetUrls } = await request.json();

    if (!domainId || !shortPath || !targetUrls || !Array.isArray(targetUrls) || targetUrls.length === 0) {
      return NextResponse.json(
        { error: 'Dominio, percorso breve e almeno un URL di destinazione sono richiesti' },
        { status: 400 }
      );
    }

    // Validazione shortPath
    if (!/^[a-zA-Z0-9_-]+$/.test(shortPath)) {
      return NextResponse.json(
        { error: 'Il percorso breve può contenere solo lettere, numeri, trattini e underscore' },
        { status: 400 }
      );
    }

    // Validazione targetUrls
    for (const targetUrl of targetUrls) {
      if (!targetUrl.url || !targetUrl.weight || targetUrl.weight <= 0) {
        return NextResponse.json(
          { error: 'Ogni URL di destinazione deve avere un URL valido e un peso maggiore di 0' },
          { status: 400 }
        );
      }

      try {
        new URL(targetUrl.url);
      } catch {
        return NextResponse.json(
          { error: 'URL di destinazione non valido' },
          { status: 400 }
        );
      }
    }

    await connectDB();

    // Verifica che il dominio appartenga all'utente e sia attivo
    const domain = await Domain.findOne({ 
      _id: domainId, 
      userId: session.user.id,
      isActive: true 
    });

    if (!domain) {
      return NextResponse.json(
        { error: 'Dominio non trovato o non attivo' },
        { status: 404 }
      );
    }

    // Controlla se il percorso breve esiste già per questo dominio
    const existingLink = await Link.findOne({ 
      domainId: domainId,
      shortPath: shortPath 
    });

    if (existingLink) {
      return NextResponse.json(
        { error: 'Percorso breve già esistente per questo dominio' },
        { status: 400 }
      );
    }

    // Crea nuovo link
    const newLink = await Link.create({
      userId: session.user.id,
      domainId: domainId,
      shortPath: shortPath,
      targetUrls: targetUrls.map(url => ({
        url: url.url,
        weight: url.weight,
        isActive: true
      })),
      totalClicks: 0,
    });

    // Popola il dominio per la risposta
    await newLink.populate('domainId', 'domain isActive');

    return NextResponse.json(
      { 
        message: 'Link creato con successo',
        link: newLink 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create link error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
