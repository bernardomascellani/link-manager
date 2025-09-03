import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Domain from '@/models/Domain';
import { promises as dns } from 'dns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const { domainId } = await request.json();

    if (!domainId) {
      return NextResponse.json(
        { error: 'ID dominio richiesto' },
        { status: 400 }
      );
    }

    await connectDB();

    // Trova il dominio
    const domain = await Domain.findOne({ 
      _id: domainId, 
      userId: session.user.id 
    });

    if (!domain) {
      return NextResponse.json(
        { error: 'Dominio non trovato' },
        { status: 404 }
      );
    }

    try {
      // Verifica TXT record
      const txtRecordName = `_linkmanager-verify.${domain.domain}`;
      const expectedTxtValue = `linkmanager-verify=${domain.verificationToken}`;
      
      const txtRecords = await dns.resolveTxt(txtRecordName);
      
      // Cerca il record TXT corretto
      const txtFound = txtRecords.some(record => 
        record.some(txt => txt === expectedTxtValue)
      );

      // Verifica CNAME record
      const expectedCnameValue = 'linkmanager.vercel.app';
      let cnameFound = false;
      
      try {
        const cnameRecords = await dns.resolveCname(domain.domain);
        cnameFound = cnameRecords.length > 0 && cnameRecords[0] === expectedCnameValue;
      } catch (cnameError) {
        console.log('CNAME not found or error:', cnameError);
      }

      if (txtFound && cnameFound) {
        // Entrambi i record sono verificati - attiva il dominio
        domain.isVerified = true;
        domain.isActive = true;
        domain.verifiedAt = new Date();
        await domain.save();

        return NextResponse.json(
          { 
            message: 'Dominio verificato e attivato con successo!',
            verified: true,
            active: true
          },
          { status: 200 }
        );
      } else if (txtFound) {
        // Solo TXT verificato
        return NextResponse.json(
          { 
            message: 'Record TXT verificato, ma CNAME mancante o incorretto',
            verified: false,
            txtVerified: true,
            cnameVerified: false,
            instructions: {
              txtRecordName,
              txtRecordValue: expectedTxtValue,
              cnameRecordName: domain.domain,
              cnameRecordValue: expectedCnameValue
            }
          },
          { status: 200 }
        );
      } else {
        // Nessun record verificato
        return NextResponse.json(
          { 
            message: 'Record DNS non trovati o non corretti',
            verified: false,
            txtVerified: false,
            cnameVerified: false,
            instructions: {
              txtRecordName,
              txtRecordValue: expectedTxtValue,
              cnameRecordName: domain.domain,
              cnameRecordValue: expectedCnameValue
            }
          },
          { status: 200 }
        );
      }

    } catch (dnsError) {
      console.error('DNS verification error:', dnsError);
      return NextResponse.json(
        { 
          message: 'Errore nella verifica DNS. Assicurati che il record sia stato propagato.',
          verified: false,
          instructions: {
            recordName: `_linkmanager-verify.${domain.domain}`,
            recordValue: `linkmanager-verify=${domain.verificationToken}`
          }
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Domain verification error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
