'use client';

import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { useUser } from '@/hooks/useUser';
import { useState, useEffect } from 'react';
import MiniCart from './MiniCart';

const NAV_CATEGORIES = [
  'POP CULTURE',
  'NEW',
  'TEES',
  'BAND MERCH',
  'ACCESSORIES',
  'SALE',
];

export default function Header() {
  const itemCount = useCart((s) => s.getItemCount());
  const profile = useUser((s) => s.profile);
  const setMode = useUser((s) => s.setMode);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [demoControlsOpen, setDemoControlsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Promo Banner */}
        <div className="bg-[#cdcdcd] text-black text-center text-xs py-1.5 font-medium">
          20% Off Sitewide* | Earn Hot Cash Every $40 Spent* &nbsp;
          <span className="underline cursor-pointer">Shop Now</span>
        </div>

        {/* Main Header */}
        <div className="bg-black text-white">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-xl font-black tracking-tight shrink-0">
              HOT TOPIC
            </Link>

            {/* Center Nav */}
            <nav className="hidden lg:flex items-center gap-1 mx-4">
              <Link
                href="/"
                className="text-xs font-bold tracking-wide px-3 py-2 hover:text-accent transition-colors"
              >
                SHOP
              </Link>
              <Link
                href="/configurator"
                className="text-xs font-bold tracking-wide px-3 py-2 hover:text-accent transition-colors"
              >
                CONFIGURATOR
              </Link>
              <Link
                href="/docs"
                className="text-xs font-bold tracking-wide px-3 py-2 hover:text-accent transition-colors"
              >
                DOCS
              </Link>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Demo Controls Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDemoControlsOpen(!demoControlsOpen)}
                  className="text-xs px-2.5 py-1 rounded border border-white/20 hover:border-white/40 transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Demo
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                    <path d="M0 0l5 6 5-6z" />
                  </svg>
                </button>
                {demoControlsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDemoControlsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white text-black rounded-lg shadow-xl border border-gray-200 z-50 p-3 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          User Mode
                        </label>
                        <select
                          value={profile.mode}
                          onChange={(e) =>
                            setMode(
                              e.target.value as 'guest' | 'first-time' | 'returning'
                            )
                          }
                          className="w-full mt-1 text-xs border border-gray-200 rounded px-2 py-1.5 bg-gray-50"
                        >
                          <option value="guest">Guest</option>
                          <option value="first-time">First-Time User</option>
                          <option value="returning">Returning User</option>
                        </select>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Apple Pay: {mounted ? (typeof window !== 'undefined' && 'ApplePaySession' in window ? 'Native' : 'Simulated') : '...'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sign In */}
              <button className="hidden sm:flex items-center gap-1.5 text-xs hover:text-accent transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M20 21a8 8 0 10-16 0" />
                </svg>
                Sign In
              </button>

              {/* Cart */}
              <button
                onClick={() => setMiniCartOpen(true)}
                className="relative hover:text-accent transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-accent text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Category Nav Bar */}
        <div className="bg-black border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 flex items-center overflow-x-auto scrollbar-hide">
            {NAV_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href="/"
                className="text-white text-[11px] font-bold tracking-wide px-4 py-2.5 hover:text-accent transition-colors whitespace-nowrap"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <MiniCart open={miniCartOpen} onClose={() => setMiniCartOpen(false)} />
    </>
  );
}
