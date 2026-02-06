'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { ClientInfo } from '@/store/bookingStore'

const clientInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
})

interface ClientInfoFormProps {
  defaultValues?: Partial<ClientInfo>
  onSubmit: (data: ClientInfo) => void
  onBack: () => void
  loading?: boolean
}

export function ClientInfoForm({ defaultValues, onSubmit, onBack, loading }: ClientInfoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ClientInfo>({
    resolver: zodResolver(clientInfoSchema),
    defaultValues: {
      firstName: defaultValues?.firstName || '',
      lastName: defaultValues?.lastName || '',
      phone: defaultValues?.phone || '',
      email: defaultValues?.email || '',
      notes: defaultValues?.notes || '',
    },
    mode: 'onChange',
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-body font-medium text-brand-black">Your Details</h3>
        <span className="text-micro text-brand-silver">* Required</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First Name *"
          {...register('firstName')}
          error={errors.firstName?.message}
          placeholder="Jane"
          autoComplete="given-name"
        />
        <Input
          label="Last Name *"
          {...register('lastName')}
          error={errors.lastName?.message}
          placeholder="Doe"
          autoComplete="family-name"
        />
      </div>

      <Input
        label="Phone Number *"
        type="tel"
        {...register('phone')}
        error={errors.phone?.message}
        placeholder="(555) 123-4567"
        autoComplete="tel"
        hint="We'll send you a confirmation text"
      />

      <Input
        label="Email (Optional)"
        type="email"
        {...register('email')}
        error={errors.email?.message}
        placeholder="jane@example.com"
        autoComplete="email"
        hint="For appointment reminders"
      />

      <Textarea
        label="Notes (Optional)"
        {...register('notes')}
        placeholder="Any special requests or hair details..."
        rows={3}
      />

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid}
          isLoading={loading}
          className="flex-1"
          hapticFeedback
        >
          Continue
        </Button>
      </div>
    </form>
  )
}

export default ClientInfoForm
