'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, LayoutDashboard, Users, BookOpen, DollarSign, BarChart3, LogOut, ArrowLeft, Gift, HelpCircle } from 'lucide-react';
import { isAuthenticated, clearTokens } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setMounted(true);
      if (!isAuthenticated()) { router.push(ROUTES.LOGIN); return; }
      try {
        const userData = await authApi.getCurrentUser();
        if (userData.role !== 'ADMIN') { router.push('/dashboard'); return; }
        setUser(userData);
      } catch {
        router.push(ROUTES.LOGIN);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = () => { clearTokens(); router.push(ROUTES.HOME); };

  if (!mounted || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-400/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Vérification des accès...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard',      color: 'text-purple-400' },
    { href: '/admin/users',     icon: Users,           label: 'Utilisateurs',   color: 'text-cyan-400'   },
    { href: '/admin/exams',     icon: BookOpen,        label: 'Examens',        color: 'text-violet-400' },
    { href: '/admin/finance',   icon: DollarSign,      label: 'Finance',        color: 'text-emerald-400'},
    { href: '/admin/analytics', icon: BarChart3,       label: 'Analytics',      color: 'text-pink-400'   },
    { href: '/admin/promo',      icon: Gift,            label: 'Codes Promo',    color: 'text-yellow-400' },
    { href: '/admin/questions',  icon: HelpCircle,      label: 'Questions',      color: 'text-cyan-400'   },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Admin Sidebar */}
      <aside
        className="w-64 flex flex-col fixed top-0 left-0 h-full z-30"
        style={{
          background: '#e0e5ec',
          boxShadow: '4px 0 16px #a3b1c6',
          borderRight: '1px solid rgba(163, 177, 198, 0.3)',
        }}
      >
        {/* Admin logo */}
        <div className="p-5 pb-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-600 to-violet-800 shadow-glow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-none">Admin Panel</div>
              <div className="text-[10px] text-purple-400 uppercase tracking-widest">Pédja</div>
            </div>
          </Link>
          <div className="neo-divider mt-4" />
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="nav-item mb-2"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Retour au Dashboard</span>
          </Link>

          <div className="neo-divider my-2" />

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? item.color : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 pt-0">
          <div className="neo-divider mb-3" />
          <div className="px-3 py-2 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white bg-gradient-to-br from-purple-600 to-violet-800">
                {user.firstName?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white truncate">{user.firstName}</span>
                  <span className="neo-badge text-[9px] px-1.5 py-0">ADMIN</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-item w-full text-left group"
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
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
