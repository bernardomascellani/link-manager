import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Link from '@/models/Link';

export const dynamic = 'force-dynamic';

export default async function RedirectPage({
  params,
}: {
  params: { slug?: string[] };
}) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const shortCode = params.slug?.[0] || '';

  // Debug
  console.log('Host:', host, 'ShortCode:', shortCode);

  if (host === 'platform.brnd.ooo') {
    return null;
  }

  await connectDB();

  // Normalizza baseUrl
  const possibleBaseUrls = [
    `https://${host}/`,
    `http://${host}/`,
    `https://${host}`,
    `http://${host}`,
  ];

  const user = await User.findOne({
    baseUrl: { $in: possibleBaseUrls },
    domainVerified: true,
  });

  console.log('User trovato:', user);

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

  const link = await Link.findOne({
    userId: user._id,
    shortCode,
  });

  console.log('Link trovato:', link);

  if (link) {
    redirect(link.originalUrl);
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