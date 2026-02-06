import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Award,
  GraduationCap,
  Heart,
  Globe,
  Calendar,
  MessageCircle,
  Star,
  Users,
  Building2,
  Stethoscope,
  Quote,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Dr. Michael K. Obeng - Official Profile Image
const DR_OBENG_PHOTO = '/dr-obeng-profile.jpg';

const credentials = [
  {
    icon: GraduationCap,
    title: 'Harvard-Educated & Elite-Trained',
    description: 'Trained at top institutions including Massachusetts General Hospital and Boston Children\'s Hospital',
  },
  {
    icon: Award,
    title: 'A Leader in His Field',
    description: 'Former Chief of Plastic Surgery, Fellow of the American College of Surgeons',
  },
  {
    icon: Stethoscope,
    title: 'Precision Artistry',
    description: 'Background in micro-neurovascular surgery for unparalleled precision and attention to detail',
  },
  {
    icon: Heart,
    title: 'Comfort & Safety',
    description: 'Prioritizes advanced pain management and recovery protocols for a smoother patient experience',
  },
];

const stats = [
  { number: '20+', label: 'Years Experience' },
  { number: '1,500+', label: 'Free Surgeries Given' },
  { number: '7', label: 'Countries Worldwide' },
  { number: '$75M+', label: 'In Pro Bono Care' },
];

const awards = [
  "U.S. President's Volunteer Service Lifetime Achievement Award",
  "NAACP Humanitarian Award",
  "Ebony Magazine 75th Anniversary Power 100 Honoree",
  "UN Peace Ambassador",
  "America's Top Plastic Surgeons (Consumer's Research Council) - 2x",
];

const education = [
  { degree: 'Elite Training', institution: 'Massachusetts General Hospital', field: 'Harvard Medical School Affiliate' },
  { degree: 'Pediatric Training', institution: 'Boston Children\'s Hospital', field: 'Harvard Medical School Affiliate' },
  { degree: 'Fellowship', institution: 'Harvard Medical School', field: 'Micro-Neurovascular Surgery' },
  { degree: 'Board Certified', institution: 'American Board of Plastic Surgery', field: 'FACS - Fellow, American College of Surgeons' },
];

const testimonials = [
  {
    quote: "Dr. Obeng's artistry and attention to detail exceeded my expectations. He truly listened to what I wanted and delivered results that look completely natural.",
    author: "Sarah M.",
    procedure: "Facelift Patient",
  },
  {
    quote: "From consultation to recovery, the entire experience was exceptional. Dr. Obeng and his team made me feel comfortable and cared for every step of the way.",
    author: "Jennifer L.",
    procedure: "Rhinoplasty Patient",
  },
  {
    quote: "I traveled from abroad for my procedure and it was absolutely worth it. Dr. Obeng's expertise and genuine care for his patients is unmatched.",
    author: "Maria K.",
    procedure: "Mommy Makeover Patient",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      {/* Hero Section */}
      <header className="relative bg-gradient-to-b from-[#2D0A0A] to-[#4A1515] py-24">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-4xl md:text-5xl font-light text-white tracking-wide mb-6">
                Michael K. Obeng, MD, FACS
              </h1>
              <p className="text-white/80 text-lg mb-4">
                The Surgeon's Surgeon
              </p>
              <p className="text-white/60 leading-relaxed">
                World-Renowned Aesthetic & Reconstructive Surgeon | Director, MiKO Surgery | Founder, RESTORE Worldwide
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="w-72 h-72 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-[#C4A484]">
                  <img
                    src={DR_OBENG_PHOTO}
                    alt="Dr. Michael K. Obeng"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-6 h-6 text-[#4A1515]" />
                    <div>
                      <p className="text-xs text-[#8B7355]">Experience</p>
                      <p className="font-semibold text-[#2D0A0A]">20+ Years</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b border-[#E8E3DC]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl font-light text-[#4A1515] mb-2">{stat.number}</p>
                <p className="text-sm text-[#6B5C4C]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Biography Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-light text-[#2D0A0A] mb-8 text-center">
              A Legacy of Excellence
            </h2>
            <div className="prose prose-lg max-w-none text-[#4A3628]">
              <p className="mb-6">
                Dr. Michael K. Obeng is a Harvard-trained, board-certified plastic surgeon renowned for
                his exceptional skill in both aesthetic enhancement and complex reconstruction. Trusted
                by colleagues and patients alike, he has earned the moniker, "The Surgeon's Surgeon"
                for his ability to masterfully address the most challenging cases, often deemed
                "impossible" by others.
              </p>
              <p className="mb-6">
                His practice, MiKO Surgery, is built on a foundation of unparalleled expertise and a
                commitment to delivering natural, aesthetic results. Dr. Obeng is one of the few global
                pioneers in advanced contouring, including cosmetic rib removal, and is highly
                sought-after for his artistry in procedures such as:
              </p>
              <ul className="mb-6 list-disc pl-6 space-y-2">
                <li>Mommy Makeovers & Tummy Tucks</li>
                <li>Brazilian Butt Lifts (BBL) & Liposuction</li>
                <li>Breast Augmentation, Reduction, & Lifts</li>
                <li>Complex Body Contouring</li>
              </ul>
              <p className="mb-6">
                Beyond his Beverly Hills practice, Dr. Obeng is a dedicated humanitarian. Through his
                non-profit, <strong>RESTORE Worldwide</strong>, he provides life-changing pro-bono
                reconstructive surgery to those in need across the globe, transforming lives affected
                by birth defects and traumatic accidents.
              </p>
              <p>
                Dr. Obeng is the preferred choice for other physicians and their families seeking
                plastic surgery — a testament to his reputation for excellence and trusted expertise
                in the medical community.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Education Section */}
      <section className="py-16 bg-white border-b border-[#E8E3DC]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-light text-[#2D0A0A] text-center mb-12">
            Education & Training
          </h2>
          <div className="max-w-3xl mx-auto">
            {education.map((edu, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-4 mb-6 last:mb-0"
              >
                <div className="w-3 h-3 rounded-full bg-[#4A1515] mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-[#2D0A0A]">{edu.degree} — {edu.institution}</p>
                  <p className="text-sm text-[#6B5C4C]">{edu.field}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Awards Section */}
      <section className="py-16 bg-[#FBF8F5]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-light text-[#2D0A0A] text-center mb-12">
            Awards & Recognition
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {awards.map((award, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white px-6 py-3 rounded-full border border-[#E8E3DC] shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#C4A484]" />
                  <span className="text-sm text-[#4A3628]">{award}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Credentials Section */}
      <section className="py-20 bg-[#2D0A0A]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-light text-white text-center mb-12">
            Credentials & Recognition
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {credentials.map((credential, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="bg-white/10 border-white/20 h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#C4A484]/20 flex items-center justify-center mx-auto mb-4">
                      <credential.icon className="w-7 h-7 text-[#C4A484]" />
                    </div>
                    <h3 className="text-white font-medium mb-2">{credential.title}</h3>
                    <p className="text-white/60 text-sm">{credential.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Humanitarian Work */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 bg-[#FBF8F5] px-4 py-2 rounded-full mb-6">
                <Heart className="w-4 h-4 text-[#4A1515]" />
                <span className="text-sm text-[#4A1515] font-medium">Giving Back</span>
              </div>
              <h2 className="text-3xl font-light text-[#2D0A0A] mb-6">
                R.E.S.T.O.R.E Worldwide
              </h2>
              <p className="text-[#4A3628] mb-4">
                Founded in 2008, R.E.S.T.O.R.E Worldwide provides free reconstructive surgery and
                medical services to children and adults in developing countries with disfiguring
                deformities from birth, accidents, and diseases. Dr. Obeng has performed over 1,500
                free surgeries across 7 countries and 3 continents, totaling over $75 million in care.
              </p>
              <p className="text-[#6B5C4C] mb-6">
                In 2024, Dr. Obeng helped break ground on a $50 million WHO-certified pharmaceutical
                facility in Ghana, furthering his mission to improve global health outcomes. As President
                & CEO of Global Health Solution, he continues consulting on international health initiatives.
              </p>
              <Button variant="outline" className="border-[#4A1515] text-[#4A1515]">
                Learn More About R.E.S.T.O.R.E
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <img
                src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&q=80"
                alt="Humanitarian mission"
                className="rounded-2xl h-48 object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&q=80"
                alt="Medical mission"
                className="rounded-2xl h-48 object-cover mt-8"
              />
              <img
                src="https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&q=80"
                alt="Surgery mission"
                className="rounded-2xl h-48 object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1584515933487-779824d29309?w=400&q=80"
                alt="Global outreach"
                className="rounded-2xl h-48 object-cover mt-8"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-[#FBF8F5]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-light text-[#2D0A0A] text-center mb-12">
            Patient Testimonials
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full border-[#E8E3DC]">
                  <CardContent className="p-6">
                    <Quote className="w-8 h-8 text-[#C4A484] mb-4" />
                    <p className="text-[#4A3628] mb-6 italic">"{testimonial.quote}"</p>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-[#C4A484] text-[#C4A484]" />
                      ))}
                    </div>
                    <p className="font-medium text-[#2D0A0A]">{testimonial.author}</p>
                    <p className="text-sm text-[#8B7355]">{testimonial.procedure}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#3D1010] to-[#4A1515] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light text-white mb-4">
            Meet Dr. Obeng in Person
          </h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">
            Schedule a private consultation to discuss your goals and learn how Dr. Obeng can help
            you achieve the results you've always wanted.
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
                Ask a Question
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
