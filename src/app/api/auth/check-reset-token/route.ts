import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token è richiesto' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verifica se il token esiste e non è scaduto
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Token non valido o scaduto' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Token valido' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Check token error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
