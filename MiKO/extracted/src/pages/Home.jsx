import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Menu, Phone } from 'lucide-react';
import SupportPanel from '@/components/support/SupportPanel';

export default function Home() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/procedures', label: 'Procedures' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/about', label: 'About Dr. Obeng' },
    { href: '/financing', label: 'Financing' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F5F2] via-[#FDFCFB] to-[#F5F1ED]">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background Image - Higher visibility */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920')] bg-cover bg-center" />
        {/* Gradient overlay - Subtle scrim for text readability while showing image */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2D0A0A]/85 via-[#3D1010]/60 to-[#4A1515]/75" />
        {/* Subtle vignette for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(45,10,10,0.4)_100%)]" />

        <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_69487d2cd5b55089ee0d9113/ede5f8e54_image.png"
                alt="MiKO Plastic Surgery"
                className="h-16 object-contain"
              />
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-8 text-white/90 text-sm tracking-wide">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a href="tel:+13102752705" className="text-white/80 hover:text-white text-sm flex items-center gap-2">
              <Phone className="w-4 h-4" />
              (310) 275-2705
            </a>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white p-2"
          >
            <Menu className="w-6 h-6" />
          </button>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-10 bg-[#2D0A0A]/95 md:hidden"
            >
              <div className="px-8 py-4 space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-white/90 hover:text-white py-2 text-sm"
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href="tel:+13102752705"
                  className="block text-[#C4A484] py-2 text-sm"
                >
                  Call: (310) 275-2705
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 text-center py-24 px-6 max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-6xl font-light text-white tracking-wide mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
          >
            Exceptional Care,<br />
            <span className="font-medium">Extraordinary Results</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-white/90 text-lg md:text-xl font-light max-w-2xl mx-auto mb-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
          >
            Beverly Hills' premier destination for transformative plastic surgery.
            Experience personalized care with Dr. Michael K. Obeng.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            onClick={() => setIsPanelOpen(true)}
            className="bg-white text-[#3D1010] px-8 py-4 rounded-full text-sm tracking-wide font-medium hover:bg-[#F5F1ED] transition-all duration-300 shadow-xl hover:shadow-2xl border border-white/20"
          >
            Schedule Your Consultation
          </motion.button>
        </div>
      </header>



      {/* Trust Section */}
      <section className="py-24 px-6 bg-[#2D0A0A]">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-light text-white mb-8">
              Your Journey to Confidence Begins Here
            </h2>
            <p className="text-white/70 text-lg font-light max-w-3xl mx-auto mb-12">
              With over 20 years of experience and a commitment to excellence, 
              Dr. Obeng combines artistry with medical expertise to deliver results 
              that exceed expectations.
            </p>
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                { number: '20+', label: 'Years Experience' },
                { number: '5000+', label: 'Procedures' },
                { number: '100%', label: 'Patient Focus' }
              ].map((stat, index) => (
                <div key={index}>
                  <div className="text-3xl md:text-4xl font-light text-[#C4A484] mb-2">{stat.number}</div>
                  <div className="text-white/60 text-sm tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#1A0505]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_69487d2cd5b55089ee0d9113/ede5f8e54_image.png" 
            alt="MiKO" 
            className="h-12 object-contain opacity-80"
          />
          <p className="text-white/40 text-sm">
            © 2024 MiKO Plastic Surgery. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Floating Support Button */}
      <AnimatePresence>
        {!isPanelOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsPanelOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-[#3D1010] to-[#4A1515] text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 group"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <span className="text-sm font-medium tracking-wide">24/7 Patient Support</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Support Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <SupportPanel onClose={() => setIsPanelOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}