import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { validatePassword } from '@/lib/passwordValidation';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e password sono richiesti' },
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

    // Find user with valid reset token
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

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user
    user.password = hashedPassword;
    user.passwordResetToken = '';
    user.passwordResetExpires = null;
    await user.save();

    return NextResponse.json(
      { message: 'Password resettata con successo' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
