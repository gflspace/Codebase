import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MessageCircle,
  Calculator,
  CheckCircle,
  DollarSign,
  CreditCard,
  Shield,
  Clock,
  HelpCircle,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const financingPartners = [
  {
    name: 'CareCredit',
    description: 'Healthcare credit card with promotional financing options',
    features: [
      '0% APR for 6-24 months on qualifying purchases',
      'Low monthly payments',
      'Quick online application',
      'Widely accepted',
    ],
    logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&q=80',
  },
  {
    name: 'Prosper Healthcare Lending',
    description: 'Flexible financing with fixed rates and terms',
    features: [
      'Fixed interest rates',
      'Terms from 24-84 months',
      'No prepayment penalties',
      'Same-day approval',
    ],
    logo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&q=80',
  },
  {
    name: 'Alphaeon Credit',
    description: 'Designed specifically for aesthetic procedures',
    features: [
      'Special promotional offers',
      'Competitive rates',
      'Easy application process',
      'Dedicated customer support',
    ],
    logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&q=80',
  },
];

const faqs = [
  {
    question: 'What financing options are available?',
    answer: 'We partner with CareCredit, Prosper Healthcare Lending, and Alphaeon Credit to offer a variety of financing options. These include promotional 0% APR periods, low fixed-rate loans, and flexible payment terms ranging from 6 to 84 months.',
  },
  {
    question: 'How do I apply for financing?',
    answer: 'You can apply online through any of our financing partners before or during your consultation. The application process is quick and typically takes just a few minutes. Approval decisions are often instant.',
  },
  {
    question: 'What is included in the procedure cost?',
    answer: 'Our quotes include surgeon fees, anesthesia, facility fees, and standard post-operative care. We provide comprehensive quotes during your consultation so you know exactly what to expect.',
  },
  {
    question: 'Do you offer payment plans directly?',
    answer: 'We work primarily with third-party financing partners to offer you the best rates and terms. However, we can discuss customized payment arrangements for qualified patients during your consultation.',
  },
  {
    question: 'Is a deposit required?',
    answer: 'Yes, a deposit is typically required to secure your surgery date. The deposit amount varies by procedure and is applied toward your total cost. We will provide specific details during your consultation.',
  },
  {
    question: 'Does insurance cover plastic surgery?',
    answer: 'Most cosmetic procedures are not covered by insurance. However, some reconstructive procedures may be partially covered. Our team can help you determine if any portion of your procedure may qualify for insurance coverage.',
  },
];

export default function Financing() {
  const [loanAmount, setLoanAmount] = useState(10000);
  const [loanTerm, setLoanTerm] = useState(36);
  const monthlyPayment = (loanAmount * (0.0999/12) * Math.pow(1 + 0.0999/12, loanTerm)) / (Math.pow(1 + 0.0999/12, loanTerm) - 1);

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
            Financing Options
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/80 text-lg max-w-2xl mx-auto"
          >
            Investing in yourself is one of the most important decisions you can make.
            We offer flexible financing options to help make your goals achievable.
          </motion.p>
        </div>
      </header>

      {/* Key Benefits */}
      <section className="py-16 bg-white border-b border-[#E8E3DC]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: CreditCard, title: '0% APR Options', desc: 'Promotional financing available' },
              { icon: Clock, title: 'Quick Approval', desc: 'Same-day decisions' },
              { icon: DollarSign, title: 'Flexible Terms', desc: '6 to 84 month options' },
              { icon: Shield, title: 'No Hidden Fees', desc: 'Transparent pricing' },
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-full bg-[#FBF8F5] flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-7 h-7 text-[#4A1515]" />
                </div>
                <h3 className="font-medium text-[#2D0A0A] mb-1">{benefit.title}</h3>
                <p className="text-sm text-[#6B5C4C]">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Calculator */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-light text-[#2D0A0A] mb-4">
                Payment Calculator
              </h2>
              <p className="text-[#6B5C4C] mb-8">
                Estimate your monthly payments with our simple calculator.
                Final rates and terms will be determined during your consultation.
              </p>

              <Card className="border-[#E8E3DC]">
                <CardContent className="p-6 space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-[#4A3628]">Procedure Cost</Label>
                      <span className="text-lg font-semibold text-[#2D0A0A]">
                        ${loanAmount.toLocaleString()}
                      </span>
                    </div>
                    <Slider
                      value={[loanAmount]}
                      onValueChange={(value) => setLoanAmount(value[0])}
                      min={3000}
                      max={50000}
                      step={500}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-[#8B7355] mt-1">
                      <span>$3,000</span>
                      <span>$50,000</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-[#4A3628]">Loan Term</Label>
                      <span className="text-lg font-semibold text-[#2D0A0A]">
                        {loanTerm} months
                      </span>
                    </div>
                    <Slider
                      value={[loanTerm]}
                      onValueChange={(value) => setLoanTerm(value[0])}
                      min={6}
                      max={84}
                      step={6}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-[#8B7355] mt-1">
                      <span>6 mo</span>
                      <span>84 mo</span>
                    </div>
                  </div>

                  <div className="bg-[#FBF8F5] rounded-xl p-6 text-center">
                    <p className="text-sm text-[#6B5C4C] mb-2">Estimated Monthly Payment</p>
                    <p className="text-4xl font-light text-[#4A1515]">
                      ${monthlyPayment.toFixed(0)}
                      <span className="text-lg text-[#8B7355]">/mo</span>
                    </p>
                    <p className="text-xs text-[#8B7355] mt-2">
                      *Based on 9.99% APR. Actual rates may vary.
                    </p>
                  </div>

                  <Link to="/#support">
                    <Button className="w-full bg-[#3D1010] hover:bg-[#4A1515] text-white">
                      Discuss Financing Options
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-light text-[#2D0A0A] mb-4">
                Our Financing Partners
              </h2>
              <p className="text-[#6B5C4C] mb-8">
                We've partnered with leading healthcare financing companies to offer you
                competitive rates and flexible terms.
              </p>

              <div className="space-y-4">
                {financingPartners.map((partner, idx) => (
                  <Card key={idx} className="border-[#E8E3DC]">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium text-[#2D0A0A] mb-2">
                        {partner.name}
                      </h3>
                      <p className="text-sm text-[#6B5C4C] mb-4">{partner.description}</p>
                      <ul className="space-y-2">
                        {partner.features.map((feature, fidx) => (
                          <li key={fidx} className="flex items-center gap-2 text-sm text-[#4A3628]">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-[#2D0A0A]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-light text-white text-center mb-12">
            Simple Financing Process
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Consultation', desc: 'Discuss your goals and receive a personalized quote' },
              { step: '2', title: 'Apply Online', desc: 'Quick application with instant decisions' },
              { step: '3', title: 'Get Approved', desc: 'Review your terms and finalize financing' },
              { step: '4', title: 'Schedule', desc: 'Book your procedure date and begin your journey' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#C4A484] text-[#2D0A0A] flex items-center justify-center mx-auto mb-4 text-xl font-medium">
                  {item.step}
                </div>
                <h3 className="text-white font-medium mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-8">
            <HelpCircle className="w-6 h-6 text-[#4A1515]" />
            <h2 className="text-3xl font-light text-[#2D0A0A]">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                className="border border-[#E8E3DC] rounded-xl px-6 bg-white"
              >
                <AccordionTrigger className="text-left text-[#2D0A0A] hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[#6B5C4C]">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-[#FBF8F5]">
        <div className="max-w-4xl mx-auto px-6">
          <Card className="border-[#E8E3DC] overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-light text-[#2D0A0A] mb-4">
                    Have Questions About Financing?
                  </h3>
                  <p className="text-[#6B5C4C] mb-6">
                    Our financial coordinator is here to help you understand your options
                    and find the best solution for your budget.
                  </p>
                  <div className="flex items-center gap-4">
                    <Link to="/#support">
                      <Button className="bg-[#3D1010] hover:bg-[#4A1515] text-white">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat Now
                      </Button>
                    </Link>
                    <a href="tel:+13102752705">
                      <Button variant="outline" className="border-[#E8E3DC]">
                        <Phone className="w-4 h-4 mr-2" />
                        (310) 275-2705
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="hidden md:flex justify-center">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#3D1010] to-[#4A1515] flex items-center justify-center">
                    <Calculator className="w-16 h-16 text-[#C4A484]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#3D1010] to-[#4A1515] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">
            Schedule a consultation to discuss your goals and receive a personalized
            treatment plan with detailed pricing.
          </p>
          <Link to="/#support">
            <Button className="bg-white text-[#3D1010] hover:bg-[#F5F1ED] px-8 py-6 text-base">
              <Calendar className="w-5 h-5 mr-2" />
              Schedule Consultation
            </Button>
          </Link>
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
