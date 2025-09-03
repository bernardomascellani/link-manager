import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Domain from '@/models/Domain';

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

    if (!id) {
      return NextResponse.json(
        { error: 'ID dominio richiesto' },
        { status: 400 }
      );
    }

    await connectDB();

    // Trova e rimuovi il dominio
    const domain = await Domain.findOneAndDelete({ 
      _id: id, 
      userId: session.user.id 
    });

    if (!domain) {
      return NextResponse.json(
        { error: 'Dominio non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Dominio rimosso con successo' },
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
    await domain.save();

    return NextResponse.json(
      { 
        message: isActive ? 'Dominio attivato' : 'Dominio disattivato',
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
