import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle, User, Mail, FileText, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { submitInquiry } from '@/api/mikoAI';

const procedures = [
  'Facelift',
  'Rhinoplasty',
  'Eyelid Surgery',
  'Breast Augmentation',
  'Breast Lift',
  'Breast Reduction',
  'Liposuction',
  'Tummy Tuck',
  'Brazilian Butt Lift',
  'Mommy Makeover',
  'Body Contouring',
  'Other / Multiple Procedures',
];

export default function EmailView() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inquiryId, setInquiryId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    procedure: '',
    message: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await submitInquiry({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        procedure: formData.procedure,
        message: formData.message,
      });

      if (response.success) {
        setInquiryId(response.inquiryId);
        setIsSubmitted(true);
      } else {
        setError(response.message || 'Unable to send your message. Please try again.');
      }
    } catch (err) {
      console.error('Inquiry submission error:', err);
      setError('Unable to send your message. Please try again or contact us directly at office@mikoplasticsurgery.com');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }));
    }
    setError(null);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setFormData({ name: '', email: '', phone: '', procedure: '', message: '' });
    setValidationErrors({});
    setError(null);
    setInquiryId(null);
  };

  if (isSubmitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-[#FDFCFB]">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3D1010] to-[#4A1515] flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-medium text-[#2D0A0A] mb-3 text-center"
        >
          Message Received
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[#6B5C4C] text-center text-sm max-w-xs mb-4"
        >
          Thank you for reaching out, {formData.name.split(' ')[0]}! Our patient coordination team will respond to {formData.email} within 24 hours.
        </motion.p>
        {inquiryId && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-xs text-[#8B7355] mb-6"
          >
            Reference: {inquiryId}
          </motion.p>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#FBF8F5] rounded-xl p-4 max-w-xs mb-8"
        >
          <p className="text-xs text-[#6B5C4C] text-center">
            <strong className="text-[#4A1515]">In the meantime:</strong><br />
            Feel free to explore our services or start a chat with our AI assistant for immediate answers.
          </p>
        </motion.div>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleReset}
          className="text-[#4A1515] text-sm font-medium hover:underline"
        >
          Send another message
        </motion.button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#FDFCFB]">
      <div className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium text-[#2D0A0A] mb-2">Contact Our Team</h3>
          <p className="text-sm text-[#6B5C4C]">
            We&apos;ll respond within 24 hours
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-red-50 rounded-xl mb-4"
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#4A3628] text-sm font-medium">
              Full Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your name"
                className={`pl-10 bg-white border-[#E8E3DC] focus:border-[#4A1515] focus:ring-[#4A1515] rounded-xl h-12 ${
                  validationErrors.name ? 'border-red-400' : ''
                }`}
              />
            </div>
            {validationErrors.name && (
              <p className="text-xs text-red-500">{validationErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#4A3628] text-sm font-medium">
              Email Address *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="your@email.com"
                className={`pl-10 bg-white border-[#E8E3DC] focus:border-[#4A1515] focus:ring-[#4A1515] rounded-xl h-12 ${
                  validationErrors.email ? 'border-red-400' : ''
                }`}
              />
            </div>
            {validationErrors.email && (
              <p className="text-xs text-red-500">{validationErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-[#4A3628] text-sm font-medium">
              Phone Number (Optional)
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="pl-10 bg-white border-[#E8E3DC] focus:border-[#4A1515] focus:ring-[#4A1515] rounded-xl h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="procedure" className="text-[#4A3628] text-sm font-medium">
              Procedure of Interest
            </Label>
            <Select
              value={formData.procedure}
              onValueChange={(value) => handleChange('procedure', value)}
            >
              <SelectTrigger className="bg-white border-[#E8E3DC] focus:border-[#4A1515] focus:ring-[#4A1515] rounded-xl h-12">
                <SelectValue placeholder="Select a procedure" />
              </SelectTrigger>
              <SelectContent>
                {procedures.map((procedure) => (
                  <SelectItem key={procedure} value={procedure}>
                    {procedure}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-[#4A3628] text-sm font-medium">
              Your Message *
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-[#8B7355]" />
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                placeholder="Tell us about your goals and any questions you have..."
                rows={4}
                className={`pl-10 bg-white border-[#E8E3DC] focus:border-[#4A1515] focus:ring-[#4A1515] rounded-xl resize-none ${
                  validationErrors.message ? 'border-red-400' : ''
                }`}
              />
            </div>
            {validationErrors.message && (
              <p className="text-xs text-red-500">{validationErrors.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#3D1010] to-[#4A1515] hover:from-[#4A1515] hover:to-[#5A2020] text-white rounded-xl h-12 font-medium disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send Message
              </span>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-[#8B7355] mt-6">
          By submitting, you agree to our privacy policy.<br />
          All communications are HIPAA compliant.
        </p>
      </div>
    </div>
  );
}
