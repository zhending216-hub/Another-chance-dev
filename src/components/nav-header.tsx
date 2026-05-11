'use client';

import Link from 'next/link';

export default function NavHeader() {
  return (
    <nav className="sticky top-0 z-20 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.9)' }}>
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-[var(--ink)] tracking-widest hover:opacity-80 transition-opacity">
          古事
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/create" className="text-sm text-[var(--gold)] hover:underline">
            创建故事
          </Link>
        </div>
      </div>
    </nav>
  );
}
