'use client';

import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { useUser } from '@/hooks/useUser';
import { useState, useEffect } from 'react';
import MiniCart from './MiniCart';

export default function Header() {
  const itemCount = useCart((s) => s.getItemCount());
  const profile = useUser((s) => s.profile);
  const setMode = useUser((s) => s.setMode);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [applePayAvailable, setApplePayAvailable] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'ApplePaySession' in window) {
      try {
        setApplePayAvailable(
          (window as unknown as { ApplePaySession: { canMakePayments: () => boolean } })
            .ApplePaySession.canMakePayments()
        );
      } catch {
        setApplePayAvailable(false);
      }
    } else {
      setApplePayAvailable(false);
    }
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-accent">HOT</span> TOPIC
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="hover:text-accent transition-colors">
              Shop
            </Link>
            <Link href="/configurator" className="hover:text-accent transition-colors">
              Configurator
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Apple Pay Status Badge */}
            {mounted && (
              <span
                className={`text-xs px-2 py-1 rounded-full border ${
                  applePayAvailable
                    ? 'border-green-600 text-green-400 bg-green-950'
                    : 'border-yellow-600 text-yellow-400 bg-yellow-950'
                }`}
              >
                {applePayAvailable ? 'Apple Pay Available' : 'Apple Pay Unavailable'}
              </span>
            )}

            {/* User Mode Toggle */}
            <select
              value={profile.mode}
              onChange={(e) => setMode(e.target.value as 'guest' | 'first-time' | 'returning')}
              className="text-xs bg-surface border border-border rounded px-2 py-1 text-foreground"
            >
              <option value="guest">Guest</option>
              <option value="first-time">First-Time User</option>
              <option value="returning">Returning User</option>
            </select>

            {/* Cart Button */}
            <button
              onClick={() => setMiniCartOpen(true)}
              className="relative hover:text-accent transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {mounted && itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mini Cart Drawer */}
      <MiniCart open={miniCartOpen} onClose={() => setMiniCartOpen(false)} />
    </>
  );
}
