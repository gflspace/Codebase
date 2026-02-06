import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle,
  ChevronDown,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Procedure data with real, high-quality information
const procedureCategories = [
  {
    id: 'face',
    name: 'Face & Neck',
    description: 'Restore youthful contours and refine facial features',
    procedures: [
      {
        id: 'facelift',
        name: 'Facelift',
        subtitle: 'Rhytidectomy',
        description: 'A comprehensive facial rejuvenation procedure that addresses sagging skin, deep creases, and jowls to restore a naturally youthful appearance.',
        benefits: ['Natural-looking results', 'Long-lasting improvement', 'Addresses multiple concerns'],
        recoveryTime: '2-3 weeks',
        procedureTime: '3-5 hours',
        image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=80',
        popular: true,
      },
      {
        id: 'rhinoplasty',
        name: 'Rhinoplasty',
        subtitle: 'Nose Reshaping',
        description: 'Refine the shape, size, and proportion of your nose to achieve facial harmony while maintaining natural breathing function.',
        benefits: ['Improved facial balance', 'Enhanced profile', 'Functional improvements'],
        recoveryTime: '1-2 weeks',
        procedureTime: '2-3 hours',
        image: 'https://images.unsplash.com/photo-1598300188904-6287d52746ad?w=800&q=80',
        popular: true,
      },
      {
        id: 'blepharoplasty',
        name: 'Eyelid Surgery',
        subtitle: 'Blepharoplasty',
        description: 'Remove excess skin and fat from the upper and/or lower eyelids to achieve a refreshed, more alert appearance.',
        benefits: ['Brighter, more youthful eyes', 'Improved vision (upper)', 'Minimal scarring'],
        recoveryTime: '1-2 weeks',
        procedureTime: '1-2 hours',
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
      },
      {
        id: 'necklift',
        name: 'Neck Lift',
        subtitle: 'Platysmaplasty',
        description: 'Address loose skin, muscle banding, and excess fat in the neck for a more defined, youthful neck and jawline.',
        benefits: ['Defined jawline', 'Reduced neck bands', 'Smoother contour'],
        recoveryTime: '2 weeks',
        procedureTime: '2-3 hours',
        image: 'https://images.unsplash.com/photo-1588776814546-ec7c2e6b8a47?w=800&q=80',
      },
    ],
  },
  {
    id: 'breast',
    name: 'Breast',
    description: 'Enhance, lift, or reduce for your ideal silhouette',
    procedures: [
      {
        id: 'breast-augmentation',
        name: 'Breast Augmentation',
        subtitle: 'Implants or Fat Transfer',
        description: 'Enhance breast size and shape using implants or natural fat transfer for beautiful, proportionate results.',
        benefits: ['Customized sizing', 'Natural or enhanced look', 'Improved symmetry'],
        recoveryTime: '1-2 weeks',
        procedureTime: '1-2 hours',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
        popular: true,
      },
      {
        id: 'breast-lift',
        name: 'Breast Lift',
        subtitle: 'Mastopexy',
        description: 'Restore youthful breast position and shape by removing excess skin and reshaping breast tissue.',
        benefits: ['Lifted, perkier breasts', 'Improved nipple position', 'More youthful shape'],
        recoveryTime: '1-2 weeks',
        procedureTime: '2-3 hours',
        image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80',
      },
      {
        id: 'breast-reduction',
        name: 'Breast Reduction',
        subtitle: 'Reduction Mammaplasty',
        description: 'Reduce breast size to alleviate discomfort and achieve a more proportionate figure.',
        benefits: ['Relief from back/neck pain', 'Better posture', 'More active lifestyle'],
        recoveryTime: '2-3 weeks',
        procedureTime: '3-4 hours',
        image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
      },
    ],
  },
  {
    id: 'body',
    name: 'Body Contouring',
    description: 'Sculpt and define your ideal body shape',
    procedures: [
      {
        id: 'liposuction',
        name: 'Liposuction',
        subtitle: 'Body Sculpting',
        description: 'Remove stubborn fat deposits to contour and sculpt various areas of the body including abdomen, flanks, thighs, and arms.',
        benefits: ['Targeted fat removal', 'Improved contours', 'Permanent results'],
        recoveryTime: '1-2 weeks',
        procedureTime: '1-3 hours',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
        popular: true,
      },
      {
        id: 'tummy-tuck',
        name: 'Tummy Tuck',
        subtitle: 'Abdominoplasty',
        description: 'Remove excess skin and fat while tightening abdominal muscles for a flatter, more toned midsection.',
        benefits: ['Flatter abdomen', 'Tighter muscles', 'Improved waistline'],
        recoveryTime: '2-4 weeks',
        procedureTime: '2-4 hours',
        image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
        popular: true,
      },
      {
        id: 'bbl',
        name: 'Brazilian Butt Lift',
        subtitle: 'BBL',
        description: 'Enhance buttock size and shape using your own fat for natural-looking, beautiful curves.',
        benefits: ['Natural enhancement', 'Improved contours', 'Dual benefit of liposuction'],
        recoveryTime: '2-3 weeks',
        procedureTime: '3-4 hours',
        image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=800&q=80',
        popular: true,
      },
      {
        id: 'mommy-makeover',
        name: 'Mommy Makeover',
        subtitle: 'Combined Procedures',
        description: 'A customized combination of procedures to address post-pregnancy changes, typically including breast and abdominal procedures.',
        benefits: ['Comprehensive restoration', 'Single recovery period', 'Customized approach'],
        recoveryTime: '3-4 weeks',
        procedureTime: '4-6 hours',
        image: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800&q=80',
        popular: true,
      },
    ],
  },
];

export default function Procedures() {
  const [expandedCategory, setExpandedCategory] = useState('face');
  const [selectedProcedure, setSelectedProcedure] = useState(null);

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
            Our Procedures
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/80 text-lg max-w-2xl mx-auto"
          >
            Dr. Michael K. Obeng offers a comprehensive range of surgical and non-surgical procedures,
            each tailored to your unique goals and anatomy.
          </motion.p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-0 z-30 bg-white border-b border-[#E8E3DC] shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-8 overflow-x-auto py-4">
            {procedureCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setExpandedCategory(category.id)}
                className={`whitespace-nowrap text-sm font-medium transition-colors ${
                  expandedCategory === category.id
                    ? 'text-[#4A1515] border-b-2 border-[#4A1515] pb-3 -mb-4'
                    : 'text-[#6B5C4C] hover:text-[#4A1515]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Procedure Categories */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        {procedureCategories.map((category) => (
          <motion.section
            key={category.id}
            initial={false}
            animate={{
              height: expandedCategory === category.id ? 'auto' : 0,
              opacity: expandedCategory === category.id ? 1 : 0,
            }}
            className="overflow-hidden"
          >
            {expandedCategory === category.id && (
              <div>
                <div className="mb-12">
                  <h2 className="text-3xl font-light text-[#2D0A0A] mb-3">{category.name}</h2>
                  <p className="text-[#6B5C4C]">{category.description}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {category.procedures.map((procedure, idx) => (
                    <motion.div
                      key={procedure.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Card className="overflow-hidden border-[#E8E3DC] hover:border-[#C4A484] transition-all duration-300 group cursor-pointer h-full">
                        <div className="relative h-56 overflow-hidden">
                          <img
                            src={procedure.image}
                            alt={procedure.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          {procedure.popular && (
                            <Badge className="absolute top-4 left-4 bg-[#C4A484] text-white border-0">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-xl font-medium text-white">{procedure.name}</h3>
                            <p className="text-white/70 text-sm">{procedure.subtitle}</p>
                          </div>
                        </div>
                        <CardContent className="p-6">
                          <p className="text-[#4A3628] text-sm leading-relaxed mb-4">
                            {procedure.description}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {procedure.benefits.map((benefit, bidx) => (
                              <span
                                key={bidx}
                                className="inline-flex items-center gap-1 text-xs text-[#4A1515] bg-[#FBF8F5] px-2 py-1 rounded-full"
                              >
                                <CheckCircle className="w-3 h-3" />
                                {benefit}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-[#8B7355] pt-4 border-t border-[#F0EBE5]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {procedure.procedureTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Recovery: {procedure.recoveryTime}
                            </span>
                          </div>

                          <Link to={`/procedures/${procedure.id}`}>
                            <Button className="w-full mt-4 bg-[#3D1010] hover:bg-[#4A1515] text-white">
                              Learn More
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        ))}
      </main>

      {/* CTA Section */}
      <section className="bg-[#2D0A0A] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light text-white mb-4">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">
            Schedule a personalized consultation with Dr. Obeng to discuss your goals
            and create a customized treatment plan.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/#support">
              <Button className="bg-white text-[#3D1010] hover:bg-[#F5F1ED] px-8 py-6 text-base">
                <Calendar className="w-5 h-5 mr-2" />
                Schedule Consultation
              </Button>
            </Link>
            <Link to="/#support">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-base">
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat with AI Assistant
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
