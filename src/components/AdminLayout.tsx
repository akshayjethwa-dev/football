import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  Layers, 
  LogOut, 
  Menu, 
  X, 
  Settings, 
  Sparkles, 
  User as UserIcon,
  HelpCircle,
  TrendingUp,
  Inbox
} from 'lucide-react';

export default function AdminLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Clients (Tenants)', path: '/admin/clients', icon: Users },
    { name: 'Campaigns', path: '#', icon: Layers, disabled: true, tag: 'v2 coming' },
    { name: 'WhatsApp flows', path: '#', icon: Inbox, disabled: true, tag: 'v2 coming' },
    { name: 'Engine Analytics', path: '#', icon: TrendingUp, disabled: true, tag: 'v2 coming' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between hidden md:flex shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-emerald-500 p-2 rounded-xl text-slate-900 shadow-md shadow-emerald-500/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-md font-bold text-white block leading-none font-sans">
                Ashrey Systems
              </span>
              <span className="text-xxs text-slate-500 font-mono">
                Campaign Engine v1.0
              </span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return item.disabled ? (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-600 cursor-not-allowed select-none text-sm group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.tag && (
                    <span className="text-xxs px-2 py-0.5 rounded bg-slate-850 text-slate-500 font-mono uppercase tracking-wider scale-90 group-hover:bg-slate-800 transition">
                      {item.tag}
                    </span>
                  )}
                </div>
              ) : (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive(item.path)
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:bg-slate-850 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/20">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-xs">
              {profile?.email ? profile.email.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {profile?.role === 'superadmin' ? 'Super Admin' : 'Client Admin'}
              </p>
              <p className="text-xxs text-slate-500 truncate mt-0.5">
                {profile?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400/85 hover:text-white hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Slider */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 z-50 transform transition ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden flex flex-col justify-between`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500 p-1.5 rounded-lg text-slate-900 shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-white font-sans">Ashrey Campaign</span>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-400 hover:text-white focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return item.disabled ? (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 text-xs cursor-not-allowed select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.tag && (
                    <span className="text-mini px-1 py-0.5 rounded bg-slate-850 text-slate-500">
                      {item.tag}
                    </span>
                  )}
                </div>
              ) : (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    isActive(item.path)
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
              {profile?.email ? profile.email.charAt(0) : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {profile?.role === 'superadmin' ? 'Super Admin' : 'Client Admin'}
              </p>
              <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
                {profile?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-500/10 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header toolbar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between z-30">
          <div className="flex items-center gap-3 md:gap-0">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-400 hover:text-white md:hidden hover:bg-slate-800 rounded-lg focus:outline-none transition"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-slate-500 font-mono font-medium">Console</span>
              <span className="text-slate-700">/</span>
              <span className="text-xs font-medium text-slate-300 font-sans">
                {location.pathname.includes('/admin/clients/new') 
                  ? 'Provision Client'
                  : location.pathname.includes('/admin/clients/edit')
                  ? 'Modify Tenant Profile'
                  : location.pathname.includes('/campaigns')
                  ? 'Campaign Definition Center'
                  : 'Clients Directory'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 text-xxs text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10 font-mono uppercase tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected securely
            </div>
            
            <HeaderTimeWidget />
          </div>
        </header>

        {/* Content canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function HeaderTimeWidget() {
  const [time, setTime] = useState(new Date());
  
  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-xxs font-mono text-slate-400 shrink-0 hidden sm:block bg-slate-900 px-3 py-1.5 border border-slate-850 rounded-lg">
      UTC {time.toISOString().replace('T', ' ').substring(0, 16)}
    </div>
  );
}
