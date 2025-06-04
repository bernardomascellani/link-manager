import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Link from '@/models/Link';

function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { urls, customCode } = await req.json();

    await connectDB();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { message: 'Utente non trovato' },
        { status: 404 }
      );
    }

    if (!user.baseUrl) {
      return NextResponse.json(
        { message: 'URL base non impostato' },
        { status: 400 }
      );
    }

    const generatedLinks = [];

    for (const url of urls) {
      let shortCode = customCode;
      
      if (!shortCode) {
        // Genera un codice casuale finché non ne trova uno disponibile
        do {
          shortCode = generateRandomCode();
        } while (await Link.findOne({ shortCode }));
      } else {
        // Verifica se il codice personalizzato è già in uso
        const existingLink = await Link.findOne({ shortCode });
        if (existingLink) {
          return NextResponse.json(
            { message: 'Il codice personalizzato è già in uso' },
            { status: 400 }
          );
        }
      }

      // Crea il nuovo link
      await Link.create({
        userId: user._id,
        originalUrl: url,
        shortCode,
      });

      generatedLinks.push({
        original: url,
        short: `${user.baseUrl}/${shortCode}`,
      });
    }

    return NextResponse.json({ links: generatedLinks });
  } catch (error) {
    console.error('Errore nella generazione dei link:', error);
    return NextResponse.json(
      { message: 'Errore nella generazione dei link' },
      { status: 500 }
    );
  }
} 