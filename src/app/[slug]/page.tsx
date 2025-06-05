import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Link from '@/models/Link';

export const dynamic = 'force-dynamic';

type Props = {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function RedirectPage({ params }: Props) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const shortCode = params.slug;

  // Se il dominio è platform.brnd.ooo, non facciamo nulla
  if (host === 'platform.brnd.ooo') {
    return null;
  }

  await connectDB();

  // Cerca utente con baseUrl corrispondente e dominio verificato
  const user = await User.findOne({
    baseUrl: { $in: [`https://${host}/`, `http://${host}/`] },
    domainVerified: true,
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Link non trovato</h1>
          <p className="text-gray-600">Questo link non esiste</p>
        </div>
      </div>
    );
  }

  // Cerca link per quello user e shortcode
  const link = await Link.findOne({
    userId: user._id,
    shortCode,
  });

  if (link) {
    // Redirect verso il longUrl
    redirect(link.longUrl);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Link non trovato</h1>
        <p className="text-gray-600">Non ho trovato questo link</p>
      </div>
    </div>
  );
} 