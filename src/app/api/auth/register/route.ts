import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    await connectDB();

    // Verifica se l'utente esiste già
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Utente già registrato con questa email' },
        { status: 400 }
      );
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea il nuovo utente
    await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return NextResponse.json(
      { message: 'Utente registrato con successo' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    return NextResponse.json(
      { message: 'Errore durante la registrazione' },
      { status: 500 }
    );
  }
} 