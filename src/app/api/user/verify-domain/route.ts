import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import dns from 'dns/promises';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.baseUrl || !user.domainVerificationToken) {
      return NextResponse.json({ message: 'Dominio o token non impostato' }, { status: 400 });
    }

    // Estraggo il dominio dal baseUrl
    const url = new URL(user.baseUrl);
    const domain = url.hostname;
    const txtName = `_linkmanager-verifica.${domain}`;

    let verified = false;
    try {
      const records = await dns.resolveTxt(txtName);
      verified = records.some(arr => arr.includes(user.domainVerificationToken));
    } catch (e) {
      verified = false;
    }

    if (verified) {
      user.domainVerified = true;
      await user.save();
      return NextResponse.json({ verified: true, message: 'Dominio verificato con successo!' });
    } else {
      user.domainVerified = false;
      await user.save();
      return NextResponse.json({ verified: false, message: 'Record TXT non trovato o non valido.' });
    }
  } catch (error) {
    console.error('Errore nella verifica DNS:', error);
    return NextResponse.json({ message: 'Errore nella verifica DNS' }, { status: 500 });
  }
} 