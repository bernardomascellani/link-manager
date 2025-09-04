import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

    const { type, name, expectedValue } = await request.json();

    if (!type || !name || !expectedValue) {
      return NextResponse.json(
        { error: 'Tipo, nome e valore atteso sono richiesti' },
        { status: 400 }
      );
    }

    try {
      if (type === 'TXT') {
        // Verifica record TXT
        console.log('=== DNS RESOLVER INFO ===');
        console.log('Node.js DNS servers:', dns.getServers());
        console.log('Attempting to resolve:', name);
        
        // Prova con DNS specifico
        const originalServers = dns.getServers();
        console.log('Original servers:', originalServers);
        
        // Imposta DNS specifico (Google DNS)
        dns.setServers(['8.8.8.8', '8.8.4.4']);
        console.log('New servers:', dns.getServers());
        
        const txtRecords = await dns.resolveTxt(name);
        
        // Ripristina server originali
        dns.setServers(originalServers);
        
        console.log('=== DEBUG TXT RECORD ===');
        console.log('Name:', name);
        console.log('Expected value:', expectedValue);
        console.log('Found records:', JSON.stringify(txtRecords, null, 2));
        
        // Flatten all records for easier comparison
        const allRecords = txtRecords.flat();
        console.log('All records flattened:', allRecords);
        
        // Cerca il record corretto (confronto esatto)
        const foundRecord = allRecords.includes(expectedValue);
        console.log('Found exact match:', foundRecord);
        
        // Cerca anche senza virgolette (nel caso il DNS le aggiunga)
        const foundWithoutQuotes = allRecords.some(record => 
          record.replace(/"/g, '') === expectedValue.replace(/"/g, '')
        );
        console.log('Found without quotes:', foundWithoutQuotes);

        if (foundRecord || foundWithoutQuotes) {
          return NextResponse.json({
            found: true,
            actualValue: expectedValue,
            message: 'Record TXT trovato correttamente'
          });
        } else {
          // Mostra i record trovati per debug
          return NextResponse.json({
            found: false,
            actualValue: allRecords.length > 0 ? allRecords.join(', ') : 'Nessun record trovato',
            message: 'Record TXT non trovato o valore non corretto',
            debug: {
              expected: expectedValue,
              found: allRecords,
              name: name
            }
          });
        }

      } else if (type === 'CNAME') {
        // Verifica record CNAME
        const cnameRecords = await dns.resolveCname(name);
        
        if (cnameRecords.length > 0) {
          const actualValue = cnameRecords[0];
          const isCorrect = actualValue === expectedValue;
          
          return NextResponse.json({
            found: isCorrect,
            actualValue: actualValue,
            message: isCorrect ? 'Record CNAME trovato correttamente' : 'Record CNAME trovato ma con valore diverso'
          });
        } else {
          return NextResponse.json({
            found: false,
            actualValue: 'Nessun record CNAME trovato',
            message: 'Record CNAME non trovato'
          });
        }

      } else if (type === 'A') {
        // Verifica record A
        console.log('=== DEBUG A RECORD ===');
        console.log('Name:', name);
        console.log('Expected IP:', expectedValue);
        
        const aRecords = await dns.resolve4(name);
        console.log('Found A records:', aRecords);
        
        if (aRecords.length > 0) {
          const actualValue = aRecords[0];
          const isCorrect = actualValue === expectedValue;
          
          return NextResponse.json({
            found: isCorrect,
            actualValue: actualValue,
            message: isCorrect ? 'Record A trovato correttamente' : 'Record A trovato ma con IP diverso'
          });
        } else {
          return NextResponse.json({
            found: false,
            actualValue: 'Nessun record A trovato',
            message: 'Record A non trovato'
          });
        }

      } else {
        return NextResponse.json(
          { error: 'Tipo di record non supportato' },
          { status: 400 }
        );
      }

    } catch (dnsError: unknown) {
      console.error('=== DNS ERROR DETAILS ===');
      const error = dnsError as { code?: string; message?: string; syscall?: string; hostname?: string };
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error syscall:', error.syscall);
      console.error('Error hostname:', error.hostname);
      console.error('Full error:', dnsError);
      
      // Gestisci errori specifici DNS
      if (error.code === 'ENOTFOUND') {
        return NextResponse.json({
          found: false,
          actualValue: 'Record non trovato',
          error: 'Record DNS non trovato. Assicurati che sia stato propagato correttamente.',
          message: 'Record non trovato'
        });
      } else if (error.code === 'ENODATA') {
        return NextResponse.json({
          found: false,
          actualValue: 'Nessun dato trovato',
          error: 'Nessun record DNS trovato per questo nome.',
          message: 'Nessun record trovato'
        });
      } else {
        return NextResponse.json({
          found: false,
          actualValue: 'Errore nella verifica',
          error: `Errore DNS: ${error.message}`,
          message: 'Errore durante la verifica'
        });
      }
    }

  } catch (error) {
    console.error('DNS verification API error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
