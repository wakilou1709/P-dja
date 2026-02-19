'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, BookOpen, Brain, User, LogOut, Shield, Zap, Gift } from 'lucide-react';
import { isAuthenticated, clearTokens } from '@/lib/auth';
import { authApi, subscriptionApi, promoApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [hasPromoCode, setHasPromoCode] = useState(false);

  // Auth + user + promo code : une seule fois au montage
  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push(ROUTES.LOGIN);
      return;
    }
    authApi.getCurrentUser()
      .then(setUser)
      .catch((error) => console.error('Failed to fetch user:', error));

    promoApi.getMyCode()
      .then((code) => setHasPromoCode(!!code))
      .catch(() => setHasPromoCode(false));
  }, [router]);

  // Statut abonnement : re-vérifié à chaque changement de page
  useEffect(() => {
    if (!isAuthenticated()) return;
    subscriptionApi.checkAccess()
      .then(({ hasAccess: access }) => setHasAccess(access))
      .catch(() => setHasAccess(false));
  }, [pathname]);

  const handleLogout = () => {
    clearTokens();
    router.push(ROUTES.HOME);
  };

  if (!mounted) return null;

  const navItems = [
    { href: '/dashboard',       icon: Home,     label: 'Dashboard'    },
    { href: '/exams',           icon: BookOpen, label: 'Examens'      },
    { href: '/quiz',            icon: Brain,    label: 'Quiz'         },
    { href: '/profile',         icon: User,     label: 'Profil'       },
    ...(hasPromoCode ? [{ href: '/promo-dashboard', icon: Gift, label: 'Espace Promo' }] : []),
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col fixed top-0 left-0 h-full z-30"
        style={{
          background: '#e0e5ec',
          boxShadow: '4px 0 16px #a3b1c6',
          borderRight: '1px solid rgba(163, 177, 198, 0.3)',
        }}
      >
        {/* Logo */}
        <div className="p-5 pb-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center shadow-glow-sm flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold grad-purple-cyan leading-none">Pédja</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Platform</div>
            </div>
          </Link>
          <div className="neo-divider mt-4" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user?.role === 'ADMIN' && (
            <>
              <div className="neo-divider my-3" />
              <Link
                href="/admin/dashboard"
                className="nav-item relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(109,40,217,0.1) 100%)',
                  boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.3), 0 0 15px rgba(139,92,246,0.1)',
                  color: '#c4b5fd',
                }}
              >
                <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="font-semibold">Panneau Admin</span>
                <span className="ml-auto neo-badge text-[10px] px-1.5 py-0.5">ADMIN</span>
              </Link>
            </>
          )}
        </nav>

        {/* User + Logout */}
        <div className="p-3 pt-0">
          <div className="neo-divider mb-3" />
          {user && (
            <div className="px-3 py-2 mb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                  {user.firstName?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{user.firstName} {user.lastName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="nav-item w-full text-left hover:bg-red-500/8 hover:border-red-500/20 group"
            style={{ boxShadow: 'none' }}
          >
            <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
            <span className="group-hover:text-red-400 transition-colors">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen overflow-auto">
        <div className="grid-bg-sm min-h-screen">
          <div className="container mx-auto px-6 py-8">
            {hasAccess === false && <SubscriptionBanner />}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
