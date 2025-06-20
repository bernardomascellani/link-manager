import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('GET Session:', session);

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Non autorizzato' },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    

    if (!user) {
      return NextResponse.json(
        { message: 'Utente non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      baseUrl: user.baseUrl,
      domainVerificationToken: user.domainVerificationToken,
      domainVerified: user.domainVerified,
    });
  } catch {
    console.error('Errore nel recupero del profilo');
    return NextResponse.json(
      { message: 'Errore nel recupero del profilo' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('PUT Session:', session);

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { baseUrl } = await req.json();
    console.log('BaseUrl ricevuto:', baseUrl);

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { message: 'Utente non trovato' },
        { status: 404 }
      );
    }
    // Se baseUrl è vuoto, azzero anche il token e la verifica
    if (!baseUrl) {
      user.baseUrl = '';
      user.domainVerificationToken = '';
      user.domainVerified = false;
    } else {
      // Assicuro che baseUrl termini con una sola barra
      const cleanBaseUrl = baseUrl.replace(/\/+$/, '') + '/';
      // Genero un token di verifica
      const verificationToken = 'verify-' + Math.random().toString(36).substring(2, 12);
      user.baseUrl = cleanBaseUrl;
      user.domainVerificationToken = verificationToken;
      user.domainVerified = false;
    }
    try {
      await user.save();
      console.log('BaseUrl salvato per utente:', user.email, '->', user.baseUrl);
      if (user.domainVerificationToken) {
        console.log('Token di verifica generato:', user.domainVerificationToken);
      }
    } catch {
      console.error('Errore durante il salvataggio');
    }

    return NextResponse.json({
      message: 'Profilo aggiornato con successo',
      baseUrl: user.baseUrl,
    });
  } catch {
    console.error('Errore nell\'aggiornamento del profilo');
    return NextResponse.json(
      { message: 'Errore nell\'aggiornamento del profilo' },
      { status: 500 }
    );
  }
} 