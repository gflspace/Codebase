import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { href: '/procedures', label: 'Procedures' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'About Dr. Obeng' },
  { href: '/financing', label: 'Financing' },
];

export default function Navigation({ variant = 'default', onOpenChat }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const isTransparent = variant === 'transparent' && !isScrolled;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isTransparent
            ? 'bg-transparent'
            : 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E8E3DC]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_69487d2cd5b55089ee0d9113/ede5f8e54_image.png"
                alt="MiKO Plastic Surgery"
                className="h-12 object-contain"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === link.href
                      ? isTransparent
                        ? 'text-white'
                        : 'text-[#4A1515]'
                      : isTransparent
                      ? 'text-white/80 hover:text-white'
                      : 'text-[#6B5C4C] hover:text-[#4A1515]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <a href="tel:+13102752705">
                <Button
                  variant="ghost"
                  size="sm"
                  className={isTransparent ? 'text-white hover:bg-white/10' : 'text-[#4A1515]'}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  (310) 275-2705
                </Button>
              </a>
              <Button
                onClick={onOpenChat}
                className="bg-[#3D1010] hover:bg-[#4A1515] text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat Now
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg ${
                isTransparent ? 'text-white' : 'text-[#4A1515]'
              }`}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-20 z-40 bg-white border-b border-[#E8E3DC] shadow-lg md:hidden"
          >
            <div className="px-6 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`block py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === link.href
                      ? 'bg-[#FBF8F5] text-[#4A1515]'
                      : 'text-[#4A3628] hover:bg-[#F8F5F2]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 space-y-2 border-t border-[#E8E3DC]">
                <a href="tel:+13102752705" className="block">
                  <Button variant="outline" className="w-full border-[#E8E3DC]">
                    <Phone className="w-4 h-4 mr-2" />
                    Call (310) 275-2705
                  </Button>
                </a>
                <Button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenChat?.();
                  }}
                  className="w-full bg-[#3D1010] hover:bg-[#4A1515] text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat with Us
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer for fixed nav */}
      {variant !== 'transparent' && <div className="h-20" />}
    </>
  );
}
