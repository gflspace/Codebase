import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Menu, X, Phone } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/procedures', label: 'Procedures' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'About Dr. Obeng' },
  { href: '/financing', label: 'Financing' },
];

export default function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/' || location.pathname === '/Home';

  // Don't show the header on home page (it has its own)
  if (isHomePage) {
    return <div>{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      {/* Navigation Header */}
      <header className="bg-gradient-to-r from-[#2D0A0A] to-[#4A1515] sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Home Button */}
            <Link
              to="/"
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <Home className="w-5 h-5 text-white" />
              </div>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_69487d2cd5b55089ee0d9113/ede5f8e54_image.png"
                alt="MiKO Plastic Surgery"
                className="h-10 object-contain hidden sm:block"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href ||
                  (link.href !== '/' && location.pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`text-sm tracking-wide transition-colors flex items-center gap-2 ${
                      isActive
                        ? 'text-[#C4A484] font-medium'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {link.icon && <link.icon className="w-4 h-4" />}
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Phone & Mobile Menu */}
            <div className="flex items-center gap-4">
              <a
                href="tel:+13102752705"
                className="hidden sm:flex items-center gap-2 text-white/80 hover:text-white text-sm"
              >
                <Phone className="w-4 h-4" />
                (310) 275-2705
              </a>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#2D0A0A]/95 border-t border-white/10"
            >
              <div className="px-6 py-4 space-y-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#C4A484]/20 text-[#C4A484]'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {link.icon && <link.icon className="w-5 h-5" />}
                      {link.label}
                    </Link>
                  );
                })}
                <a
                  href="tel:+13102752705"
                  className="flex items-center gap-3 py-3 px-4 text-[#C4A484] mt-2"
                >
                  <Phone className="w-5 h-5" />
                  Call: (310) 275-2705
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Page Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
