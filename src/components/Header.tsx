'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-gray-800">
            Link Manager
          </Link>
          
          <div className="flex space-x-4">
            {session ? (
              <>
                <Link href="/link" className="text-gray-600 hover:text-gray-800">
                  I Miei Link
                </Link>
                <Link href="/profilo" className="text-gray-600 hover:text-gray-800">
                  Profilo
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-800">
                  Login
                </Link>
                <Link href="/registrati" className="text-gray-600 hover:text-gray-800">
                  Registrati
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
} 