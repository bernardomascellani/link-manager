import { redirect } from 'next/navigation';
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
    // Estrai il dominio e il percorso dal slug
    const { slug } = await params;
    
    if (!slug || slug.length === 0) {
      redirect('/');
    }

    // Se è solo un dominio (es. brnd.ooo), reindirizza alla home
    if (slug.length === 1) {
      redirect('/');
    }

    // Il primo elemento è il dominio, il resto è il percorso
    const domain = slug[0];
    const shortPath = slug.slice(1).join('/');

    await connectDB();

    // Trova il dominio nel database
    const domainRecord = await Domain.findOne({ 
      domain: domain,
      isActive: true 
    });

    if (!domainRecord) {
      // Dominio non trovato o non attivo
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

    if (!link) {
      // Link non trovato
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
