import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token di verifica richiesto' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user with verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerified: false
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Token di verifica non valido o già utilizzato' },
        { status: 400 }
      );
    }

    // Verify user email
    user.emailVerified = true;
    user.emailVerificationToken = '';
    await user.save();

    return NextResponse.json(
      { message: 'Email verificata con successo! Ora puoi accedere al tuo account.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
