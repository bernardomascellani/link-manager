'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Benvenuto in Link Manager</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-lg text-gray-700">
          Ciao {session?.user?.name}! Questa è la tua dashboard personale.
        </p>
      </div>
    </div>
  );
}
