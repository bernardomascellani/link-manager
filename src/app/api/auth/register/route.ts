import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    console.log('Tentativo di registrazione per:', { name, email });

    await connectDB();
    console.log('Connessione al database stabilita');

    // Verifica se l'utente esiste già
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Utente già esistente con email:', email);
      return NextResponse.json(
        { message: 'Utente già registrato con questa email' },
        { status: 400 }
      );
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashata con successo');

    // Crea il nuovo utente
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });
    console.log('Nuovo utente creato con successo:', { id: newUser._id, email: newUser.email });

    return NextResponse.json(
      { message: 'Utente registrato con successo' },
      { status: 201 }
    );
  } catch (err) {
    console.error('Errore durante la registrazione:', err);
    return NextResponse.json(
      { message: 'Errore durante la registrazione' },
      { status: 500 }
    );
  }
} 