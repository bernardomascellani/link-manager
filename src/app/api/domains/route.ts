import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Domain from '@/models/Domain';
import crypto from 'crypto';
import { normalizeDomain, isValidDomain } from '@/lib/domain-utils';

// GET - Lista domini dell'utente
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

    const domains = await Domain.find({ userId: session.user.id })
      .sort({ createdAt: -1 });

    return NextResponse.json({ domains }, { status: 200 });

  } catch (error) {
    console.error('Get domains error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST - Aggiungi nuovo dominio
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json(
        { error: 'Dominio è richiesto' },
        { status: 400 }
      );
    }

    // Normalizza il dominio
    const normalizedDomain = normalizeDomain(domain);

    if (!normalizedDomain) {
      return NextResponse.json(
        { error: 'Dominio non valido' },
        { status: 400 }
      );
    }

    // Validazione formato dominio
    if (!isValidDomain(normalizedDomain)) {
      return NextResponse.json(
        { error: 'Formato dominio non valido. Inserisci un dominio valido (es. esempio.com)' },
        { status: 400 }
      );
    }

    await connectDB();

    // Controlla se il dominio esiste già
    const existingDomain = await Domain.findOne({ domain: normalizedDomain });
    if (existingDomain) {
      return NextResponse.json(
        { error: 'Dominio già esistente' },
        { status: 400 }
      );
    }

    // Genera token di verifica
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Crea nuovo dominio
    const newDomain = await Domain.create({
      userId: session.user.id,
      domain: normalizedDomain,
      verificationToken,
      isVerified: false,
      isActive: false,
    });

    return NextResponse.json(
      { 
        message: 'Dominio aggiunto con successo',
        domain: newDomain 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Add domain error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
