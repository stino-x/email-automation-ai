'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, User, Menu, X } from 'lucide-react';
import { getUser, signOut, supabase } from '@/lib/auth';
import { toast } from 'sonner';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; email: string | undefined } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial check
    const checkUser = async () => {
      const currentUser = await getUser();
      setUser(currentUser);
      setIsLoading(false);
    };
    
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      toast.success('Logged out successfully');
      router.push('/');
    } catch {
      toast.error('Failed to log out');
    }
  };

  // Don't show navbar on login/signup pages
  if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
    return null;
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg" />
            <span className="text-xl font-bold text-white">EmailAI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/configuration"
              className={`text-sm font-medium transition-colors ${
                pathname === '/configuration'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Configuration
            </Link>
            <Link
              href="/activity"
              className={`text-sm font-medium transition-colors ${
                pathname === '/activity'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Activity Logs
            </Link>
            <Link
              href="/settings"
              className={`text-sm font-medium transition-colors ${
                pathname === '/settings'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Settings
            </Link>
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoading ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : user ? (
              <>
                <div className="flex items-center space-x-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{user.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-3">
            <Link
              href="/dashboard"
              className="block text-sm font-medium text-gray-300 hover:text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/configuration"
              className="block text-sm font-medium text-gray-300 hover:text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              Configuration
            </Link>
            <Link
              href="/activity"
              className="block text-sm font-medium text-gray-300 hover:text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              Activity Logs
            </Link>
            <Link
              href="/settings"
              className="block text-sm font-medium text-gray-300 hover:text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              Settings
            </Link>
            {isLoading ? (
              <div className="text-sm text-gray-400 pt-2">Loading...</div>
            ) : user ? (
              <>
                <div className="text-sm text-gray-400 pt-2 border-t border-gray-800">
                  {user.email}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white w-full justify-start"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  Login
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
