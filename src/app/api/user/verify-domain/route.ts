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

    // Estraggo il dominio principale dal baseUrl
    const url = new URL(user.baseUrl);
    const hostname = url.hostname;
    const domainParts = hostname.split('.');
    const mainDomain = domainParts.length > 2 
      ? domainParts.slice(-2).join('.')  // Prende gli ultimi due parti (es. brnd.ooo)
      : hostname;                        // Se non ci sono sottodomini, usa l'hostname completo
    
    const txtName = `_linkmanager-verifica.${mainDomain}`;
    console.log('Verifica DNS per:', txtName);
    console.log('Token da verificare:', user.domainVerificationToken);

    let verified = false;
    try {
      const records = await dns.resolveTxt(txtName);
      console.log('Record TXT trovati:', records);
      
      verified = records.some(arr => {
        const found = arr.includes(user.domainVerificationToken);
        console.log('Confronto record:', arr, 'con token:', user.domainVerificationToken, 'risultato:', found);
        return found;
      });
      
      console.log('Verifica finale:', verified);
    } catch (err) {
      console.error('Errore nella verifica DNS:', err);
      return NextResponse.json({ message: 'Errore nella verifica DNS' }, { status: 500 });
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
  } catch (err) {
    console.error('Errore nella verifica DNS:', err);
    return NextResponse.json({ message: 'Errore nella verifica DNS' }, { status: 500 });
  }
} 