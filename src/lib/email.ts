import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Link Manager <onboarding@resend.dev>', // Dominio di test Resend
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }

    console.log('Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

export function generateVerificationEmailHtml(token: string, name: string) {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifica il tuo account</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Benvenuto in Link Manager!</h1>
        </div>
        <div class="content">
          <h2>Ciao ${name}!</h2>
          <p>Grazie per esserti registrato su Link Manager. Per completare la registrazione, clicca sul pulsante qui sotto per verificare il tuo account:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verifica Account</a>
          </div>
          
          <p>Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">
            ${verificationUrl}
          </p>
          
          <p><strong>Nota:</strong> Questo link scadrà tra 24 ore per motivi di sicurezza.</p>
        </div>
        <div class="footer">
          <p>Se non hai richiesto questa registrazione, puoi ignorare questa email.</p>
          <p>© 2024 Link Manager. Tutti i diritti riservati.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateResetPasswordEmailHtml(token: string, name: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset della password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .warning { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Password</h1>
        </div>
        <div class="content">
          <h2>Ciao ${name}!</h2>
          <p>Abbiamo ricevuto una richiesta per resettare la password del tuo account Link Manager.</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Resetta Password</a>
          </div>
          
          <p>Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">
            ${resetUrl}
          </p>
          
          <div class="warning">
            <strong>⚠️ Attenzione:</strong> Questo link scadrà tra 1 ora per motivi di sicurezza. Se non hai richiesto il reset della password, ignora questa email.
          </div>
        </div>
        <div class="footer">
          <p>Se non hai richiesto il reset della password, puoi ignorare questa email.</p>
          <p>© 2024 Link Manager. Tutti i diritti riservati.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
