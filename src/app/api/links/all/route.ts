import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Link from '@/models/Link';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: 'Utente non trovato' }, { status: 404 });
    }

    const links = await Link.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .select('originalUrl shortCode createdAt -_id');

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Errore nel recupero dei link:', error);
    return NextResponse.json({ message: 'Errore nel recupero dei link' }, { status: 500 });
  }
} 