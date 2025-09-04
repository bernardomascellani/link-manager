import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import crypto from 'crypto';
import { sendEmail, generateVerificationEmailHtml } from '@/lib/email';
import { validatePassword } from '@/lib/passwordValidation';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password e nome sono richiesti' },
        { status: 400 }
      );
    }

    // Validazione password robusta
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Password non valida',
          details: passwordValidation.errors 
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Utente già esistente con questa email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      emailVerificationToken,
    });

    // Send verification email
    try {
      const emailHtml = generateVerificationEmailHtml(emailVerificationToken, name);
      await sendEmail({
        to: email,
        subject: 'Verifica il tuo account Link Manager',
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    return NextResponse.json(
      { 
        message: 'Utente creato con successo. Controlla la tua email per verificare l\'account.',
        userId: user._id 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
