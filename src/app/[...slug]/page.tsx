import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import connectDB from '@/lib/mongodb';
import Link from '@/models/Link';
import Domain from '@/models/Domain';

interface RedirectPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export default async function RedirectPage({ params }: RedirectPageProps) {
  try {
    // Ottieni l'header Host per estrarre il dominio
    const headersList = await headers();
    const host = headersList.get('host');
    
    if (!host) {
      redirect('/');
    }

    // Estrai il dominio dall'header Host (es. d.brnd.ooo)
    const domain = host.toLowerCase();
    
    // Estrai il percorso dal slug
    const { slug } = await params;
    const shortPath = slug ? slug.join('/') : '';
    
    // Se non c'è un percorso, reindirizza alla home
    if (!shortPath) {
      redirect('/');
    }

    await connectDB();

    console.log('=== REDIRECT DEBUG ===');
    console.log('Host header:', host);
    console.log('Domain extracted:', domain);
    console.log('Short path:', shortPath);

    // Trova il dominio nel database
    const domainRecord = await Domain.findOne({ 
      domain: domain,
      isActive: true 
    });

    console.log('Domain record found:', domainRecord ? 'YES' : 'NO');
    if (domainRecord) {
      console.log('Domain ID:', domainRecord._id);
      console.log('Domain verified:', domainRecord.isVerified);
      console.log('Domain active:', domainRecord.isActive);
    }

    if (!domainRecord) {
      // Dominio non trovato o non attivo
      console.log('Domain not found or not active');
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Link non trovato</h1>
            <p className="text-gray-600">Il dominio {domain} non è configurato o non è attivo.</p>
          </div>
        </div>
      );
    }

    // Trova il link nel database
    const link = await Link.findOne({
      domainId: domainRecord._id,
      shortPath: shortPath
    });

    console.log('Link found:', link ? 'YES' : 'NO');
    if (link) {
      console.log('Link ID:', link._id);
      console.log('Target URLs count:', link.targetUrls.length);
      console.log('Total clicks:', link.totalClicks);
    }

    if (!link) {
      // Link non trovato
      console.log('Link not found for path:', shortPath);
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Link non trovato</h1>
            <p className="text-gray-600">Il link {domain}/{shortPath} non esiste.</p>
          </div>
        </div>
      );
    }

    // Filtra solo gli URL attivi
    const activeTargetUrls = link.targetUrls.filter((url: { isActive: boolean }) => url.isActive);

    if (activeTargetUrls.length === 0) {
      // Nessun URL attivo
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Link non disponibile</h1>
            <p className="text-gray-600">Tutti gli URL di destinazione sono disattivati.</p>
          </div>
        </div>
      );
    }

    // Implementa la rotazione basata sui pesi
    const selectedUrl = selectUrlByWeight(activeTargetUrls);

    console.log('Selected URL:', selectedUrl.url);
    console.log('Redirecting to:', selectedUrl.url);

    // Aggiorna le statistiche
    await Link.findByIdAndUpdate(link._id, {
      $inc: { totalClicks: 1 },
      lastUsed: new Date()
    });

    // Reindirizza all'URL selezionato
    redirect(selectedUrl.url);

  } catch (error) {
    console.error('Redirect error:', error);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Errore</h1>
          <p className="text-gray-600">Si è verificato un errore durante il reindirizzamento.</p>
        </div>
      </div>
    );
  }
}

// Funzione per selezionare un URL basato sui pesi
function selectUrlByWeight(targetUrls: Array<{ url: string; weight: number; isActive: boolean }>): { url: string; weight: number; isActive: boolean } {
  // Calcola il peso totale
  const totalWeight = targetUrls.reduce((sum, url) => sum + url.weight, 0);
  
  // Genera un numero casuale tra 0 e il peso totale
  const random = Math.random() * totalWeight;
  
  // Trova l'URL corrispondente
  let currentWeight = 0;
  for (const url of targetUrls) {
    currentWeight += url.weight;
    if (random <= currentWeight) {
      return url;
    }
  }
  
  // Fallback (non dovrebbe mai arrivare qui)
  return targetUrls[0];
}
