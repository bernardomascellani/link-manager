import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Link from '@/models/Link';

// PUT - Aggiorna link
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
    const { targetUrls, shortPath } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID link richiesto' },
        { status: 400 }
      );
    }

    await connectDB();

    // Trova il link
    const link = await Link.findOne({ 
      _id: id, 
      userId: session.user.id 
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link non trovato' },
        { status: 404 }
      );
    }

    // Aggiorna i campi se forniti
    if (targetUrls && Array.isArray(targetUrls) && targetUrls.length > 0) {
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

      link.targetUrls = targetUrls.map(url => ({
        url: url.url,
        weight: url.weight,
        isActive: url.isActive !== undefined ? url.isActive : true
      }));
    }

    if (shortPath && shortPath !== link.shortPath) {
      // Validazione shortPath
      if (!/^[a-zA-Z0-9_-]+$/.test(shortPath)) {
        return NextResponse.json(
          { error: 'Il percorso breve può contenere solo lettere, numeri, trattini e underscore' },
          { status: 400 }
        );
      }

      // Controlla se il nuovo percorso breve esiste già per questo dominio
      const existingLink = await Link.findOne({ 
        domainId: link.domainId,
        shortPath: shortPath,
        _id: { $ne: id }
      });

      if (existingLink) {
        return NextResponse.json(
          { error: 'Percorso breve già esistente per questo dominio' },
          { status: 400 }
        );
      }

      link.shortPath = shortPath;
    }

    await link.save();

    // Popola il dominio per la risposta
    await link.populate('domainId', 'domain isActive');

    return NextResponse.json(
      { 
        message: 'Link aggiornato con successo',
        link: link 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Update link error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE - Rimuovi link
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

    if (!id) {
      return NextResponse.json(
        { error: 'ID link richiesto' },
        { status: 400 }
      );
    }

    await connectDB();

    // Trova e rimuovi il link
    const link = await Link.findOneAndDelete({ 
      _id: id, 
      userId: session.user.id 
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Link rimosso con successo' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Delete link error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
