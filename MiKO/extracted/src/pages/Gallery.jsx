import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Eye,
  Lock,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Gallery categories and sample cases
// Note: In production, these would be real before/after photos with proper consent
const galleryCategories = [
  { id: 'all', label: 'All Procedures' },
  { id: 'face', label: 'Face & Neck' },
  { id: 'breast', label: 'Breast' },
  { id: 'body', label: 'Body' },
];

const galleryCases = [
  {
    id: '1',
    category: 'face',
    procedure: 'Facelift',
    description: 'Comprehensive facial rejuvenation with natural results',
    before: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
    after: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80',
    details: {
      age: '55',
      gender: 'Female',
      procedure: 'Full Facelift with Neck Lift',
      recovery: '3 weeks',
    },
  },
  {
    id: '2',
    category: 'face',
    procedure: 'Rhinoplasty',
    description: 'Refined nasal profile with improved breathing',
    before: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    after: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80',
    details: {
      age: '32',
      gender: 'Male',
      procedure: 'Open Rhinoplasty',
      recovery: '2 weeks',
    },
  },
  {
    id: '3',
    category: 'breast',
    procedure: 'Breast Augmentation',
    description: 'Natural enhancement with silicone implants',
    before: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600&q=80',
    after: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    details: {
      age: '28',
      gender: 'Female',
      procedure: 'Breast Augmentation - 350cc Silicone',
      recovery: '1 week',
    },
  },
  {
    id: '4',
    category: 'body',
    procedure: 'Tummy Tuck',
    description: 'Dramatic abdominal transformation post-weight loss',
    before: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
    after: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
    details: {
      age: '42',
      gender: 'Female',
      procedure: 'Full Abdominoplasty with Muscle Repair',
      recovery: '4 weeks',
    },
  },
  {
    id: '5',
    category: 'body',
    procedure: 'Liposuction',
    description: 'Sculpted midsection with 360 liposuction',
    before: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80',
    after: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=600&q=80',
    details: {
      age: '35',
      gender: 'Female',
      procedure: '360 Liposuction - Abdomen, Flanks, Back',
      recovery: '2 weeks',
    },
  },
  {
    id: '6',
    category: 'body',
    procedure: 'Brazilian Butt Lift',
    description: 'Enhanced curves with natural fat transfer',
    before: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80',
    after: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80',
    details: {
      age: '29',
      gender: 'Female',
      procedure: 'BBL with 360 Liposuction',
      recovery: '3 weeks',
    },
  },
];

export default function Gallery() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCase, setSelectedCase] = useState(null);
  const [showBefore, setShowBefore] = useState(true);

  const filteredCases = selectedCategory === 'all'
    ? galleryCases
    : galleryCases.filter(c => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      {/* Hero Section */}
      <header className="relative bg-gradient-to-b from-[#2D0A0A] to-[#4A1515] py-24">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-light text-white tracking-wide mb-6"
          >
            Before & After Gallery
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/80 text-lg max-w-2xl mx-auto"
          >
            View real results from Dr. Obeng's patients. Each transformation reflects our commitment
            to natural-looking, beautiful outcomes.
          </motion.p>
        </div>
      </header>

      {/* Privacy Notice */}
      <div className="bg-[#FBF8F5] border-b border-[#E8E3DC] py-4">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center gap-3 text-sm text-[#6B5C4C]">
            <Shield className="w-4 h-4 text-[#4A1515]" />
            <span>
              All photos shared with patient consent. Individual results may vary.
              Extended gallery available during consultation.
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E8E3DC] shadow-sm py-4">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              {galleryCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-[#3D1010] text-white'
                      : 'bg-[#F8F5F2] text-[#6B5C4C] hover:bg-[#F0EBE5]'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-[#8B7355]">
              {filteredCases.length} {filteredCases.length === 1 ? 'result' : 'results'}
            </span>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCases.map((caseItem, idx) => (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedCase(caseItem)}
              className="group cursor-pointer"
            >
              <div className="relative rounded-2xl overflow-hidden bg-white shadow-sm border border-[#E8E3DC] hover:shadow-lg transition-all">
                {/* Before/After Comparison */}
                <div className="relative h-72">
                  <img
                    src={caseItem.before}
                    alt={`${caseItem.procedure} - Before`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white">
                      <Eye className="w-5 h-5" />
                      <span className="font-medium">View Results</span>
                    </div>
                  </div>

                  {/* Category badge */}
                  <Badge className="absolute top-4 left-4 bg-white/90 text-[#4A1515] border-0">
                    {caseItem.procedure}
                  </Badge>
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="text-[#4A3628] text-sm">{caseItem.description}</p>
                  <p className="text-xs text-[#8B7355] mt-2">
                    {caseItem.details.age} y/o {caseItem.details.gender} • {caseItem.details.recovery} recovery
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Request More */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-[#FBF8F5] rounded-2xl border border-[#E8E3DC]">
            <Lock className="w-5 h-5 text-[#4A1515]" />
            <div className="text-left">
              <p className="text-sm font-medium text-[#2D0A0A]">Extended Gallery Available</p>
              <p className="text-xs text-[#6B5C4C]">
                View our complete before & after collection during your consultation
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedCase(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#E8E3DC]">
                <div>
                  <h3 className="text-xl font-medium text-[#2D0A0A]">{selectedCase.procedure}</h3>
                  <p className="text-sm text-[#6B5C4C]">{selectedCase.description}</p>
                </div>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="p-2 hover:bg-[#F8F5F2] rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[#6B5C4C]" />
                </button>
              </div>

              {/* Image Comparison */}
              <div className="relative">
                <div className="grid grid-cols-2">
                  <div className="relative">
                    <img
                      src={selectedCase.before}
                      alt="Before"
                      className="w-full h-96 object-cover"
                    />
                    <span className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                      Before
                    </span>
                  </div>
                  <div className="relative">
                    <img
                      src={selectedCase.after}
                      alt="After"
                      className="w-full h-96 object-cover"
                    />
                    <span className="absolute bottom-4 right-4 bg-[#4A1515] text-white px-3 py-1 rounded-full text-sm">
                      After
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 bg-[#FBF8F5]">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-[#8B7355]">Patient</p>
                    <p className="text-sm font-medium text-[#2D0A0A]">
                      {selectedCase.details.age} y/o {selectedCase.details.gender}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8B7355]">Procedure</p>
                    <p className="text-sm font-medium text-[#2D0A0A]">{selectedCase.details.procedure}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8B7355]">Recovery</p>
                    <p className="text-sm font-medium text-[#2D0A0A]">{selectedCase.details.recovery}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8B7355]">Surgeon</p>
                    <p className="text-sm font-medium text-[#2D0A0A]">Dr. Michael K. Obeng</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link to="/#support" className="flex-1">
                    <Button className="w-full bg-[#3D1010] hover:bg-[#4A1515] text-white">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Consultation
                    </Button>
                  </Link>
                  <Link to={`/procedures/${selectedCase.category}`}>
                    <Button variant="outline" className="border-[#E8E3DC]">
                      Learn About {selectedCase.procedure}
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA Section */}
      <section className="bg-[#2D0A0A] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light text-white mb-4">
            See What's Possible for You
          </h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">
            Every patient is unique. Schedule a consultation to discuss your goals and
            see results specific to your desired procedure.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/#support">
              <Button className="bg-white text-[#3D1010] hover:bg-[#F5F1ED] px-8 py-6 text-base">
                <Calendar className="w-5 h-5 mr-2" />
                Schedule Consultation
              </Button>
            </Link>
          </div>
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
    </div>
  );
}
