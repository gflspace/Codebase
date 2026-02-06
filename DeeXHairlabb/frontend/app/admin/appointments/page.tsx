'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cn, formatPrice } from '@/lib/utils'

interface Client {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
}

interface Hairstyle {
  id: string
  name: string
  price: number
  duration: number
}

interface Appointment {
  id: string
  startTime: string
  endTime: string
  status: string
  hairstyleName: string
  price: number
  duration: number
  notes?: string
  depositAmount?: number
  client: Client
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [hairstyles, setHairstyles] = useState<Hairstyle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all')

  // Form state
  const [isNewClient, setIsNewClient] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  })
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
    hairstyleId: '',
    customStyleName: '',
    price: '',
    duration: '',
    notes: '',
    depositAmount: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [aptsRes, clientsRes, stylesRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/clients'),
        api.get('/admin/hairstyles'),
      ])
      setAppointments(aptsRes.data.appointments || [])
      setClients(clientsRes.data.clients || [])
      setHairstyles(stylesRes.data.hairstyles || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}`, { status })
      fetchData()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleHairstyleSelect = (hairstyleId: string) => {
    const style = hairstyles.find(s => s.id === hairstyleId)
    if (style) {
      setAppointmentData(prev => ({
        ...prev,
        hairstyleId,
        customStyleName: '',
        price: String(style.price || ''),
        duration: String(style.duration || ''),
      }))
    }
  }

  const resetForm = () => {
    setIsNewClient(true)
    setSelectedClientId('')
    setNewClient({ firstName: '', lastName: '', phone: '', email: '' })
    setAppointmentData({
      date: '',
      time: '',
      hairstyleId: '',
      customStyleName: '',
      price: '',
      duration: '',
      notes: '',
      depositAmount: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let clientId = selectedClientId

      // Create new client if needed
      if (isNewClient) {
        const clientRes = await api.post('/clients', {
          firstName: newClient.firstName,
          lastName: newClient.lastName,
          phone: newClient.phone,
          email: newClient.email || undefined,
        })
        clientId = clientRes.data.client.id
      }

      // Calculate start and end times
      const startTime = new Date(`${appointmentData.date}T${appointmentData.time}`)
      const duration = parseInt(appointmentData.duration) || 120
      const endTime = new Date(startTime.getTime() + duration * 60000)

      // Get hairstyle name
      const selectedStyle = hairstyles.find(s => s.id === appointmentData.hairstyleId)
      const hairstyleName = appointmentData.customStyleName || selectedStyle?.name || 'Custom Style'

      // Create appointment
      await api.post('/appointments', {
        clientId,
        hairstyleName,
        price: parseFloat(appointmentData.price) || 0,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        notes: appointmentData.notes || undefined,
        depositAmount: appointmentData.depositAmount ? parseFloat(appointmentData.depositAmount) : undefined,
        status: 'CONFIRMED',
      })

      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error: any) {
      console.error('Failed to create appointment:', error)
      alert(error.response?.data?.error || 'Failed to create appointment')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return apt.status === 'CONFIRMED' && new Date(apt.startTime) > new Date()
    if (filter === 'completed') return apt.status === 'COMPLETED'
    if (filter === 'cancelled') return apt.status === 'CANCELLED' || apt.status === 'NO_SHOW'
    return true
  }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display text-brand-black">Appointments</h1>
          <p className="text-caption text-brand-silver mt-1">
            Manage all bookings and add walk-in clients
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <span className="text-lg">+</span>
          Add Appointment
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All', count: appointments.length },
          { key: 'upcoming', label: 'Upcoming', count: appointments.filter(a => a.status === 'CONFIRMED' && new Date(a.startTime) > new Date()).length },
          { key: 'completed', label: 'Completed', count: appointments.filter(a => a.status === 'COMPLETED').length },
          { key: 'cancelled', label: 'Cancelled/No-Show', count: appointments.filter(a => a.status === 'CANCELLED' || a.status === 'NO_SHOW').length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-caption font-medium transition-all',
              filter === tab.key
                ? 'bg-accent-gold text-white'
                : 'bg-brand-pearl text-brand-charcoal hover:bg-accent-gold/10'
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <Card variant="elevated">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brand-pearl border-b border-brand-pearl">
                <tr>
                  <th className="px-6 py-4 text-left text-caption font-medium text-brand-silver uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-left text-caption font-medium text-brand-silver uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-caption font-medium text-brand-silver uppercase tracking-wider">Service</th>
                  <th className="px-6 py-4 text-left text-caption font-medium text-brand-silver uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-left text-caption font-medium text-brand-silver uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-caption font-medium text-brand-silver uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-pearl">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <span className="text-4xl block mb-4">📅</span>
                      <p className="text-body text-brand-silver">No appointments found</p>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-brand-pearl/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-body font-medium text-brand-black">
                          {new Date(apt.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-caption text-brand-silver">
                          {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(apt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold-dark font-medium text-caption">
                            {apt.client.firstName.charAt(0)}{apt.client.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-body font-medium text-brand-black">{apt.client.firstName} {apt.client.lastName}</div>
                            <div className="text-caption text-brand-silver">{apt.client.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-body text-brand-black">{apt.hairstyleName}</div>
                        <div className="text-caption text-brand-silver">{apt.duration} min</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-body font-display text-accent-gold">{formatPrice(apt.price)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={apt.status}
                          onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                          className={cn(
                            'px-3 py-1.5 text-caption font-medium rounded-full border cursor-pointer transition-colors',
                            apt.status === 'COMPLETED' && 'bg-status-available/10 text-status-available border-status-available/30',
                            apt.status === 'CONFIRMED' && 'bg-blue-50 text-blue-600 border-blue-200',
                            apt.status === 'PENDING' && 'bg-amber-50 text-amber-600 border-amber-200',
                            apt.status === 'CANCELLED' && 'bg-status-booked/10 text-status-booked border-status-booked/30',
                            apt.status === 'NO_SHOW' && 'bg-gray-100 text-gray-600 border-gray-300',
                          )}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="NO_SHOW">No-Show</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {apt.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                              className="text-status-available hover:bg-status-available/10"
                            >
                              Complete
                            </Button>
                          )}
                          {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(apt.id, 'CANCELLED')}
                              className="text-status-booked hover:bg-status-booked/10"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-brand-pearl">
            {filteredAppointments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="text-4xl block mb-4">📅</span>
                <p className="text-body text-brand-silver">No appointments found</p>
              </div>
            ) : (
              filteredAppointments.map((apt) => (
                <div key={apt.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold-dark font-medium">
                        {apt.client.firstName.charAt(0)}{apt.client.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-body font-medium text-brand-black">{apt.client.firstName} {apt.client.lastName}</div>
                        <div className="text-caption text-brand-silver">{apt.client.phone}</div>
                      </div>
                    </div>
                    <StatusBadge status={apt.status as any} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-caption">
                    <div>
                      <span className="text-brand-silver">Date:</span>
                      <span className="ml-1 text-brand-black">{new Date(apt.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="text-brand-silver">Time:</span>
                      <span className="ml-1 text-brand-black">{new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div>
                      <span className="text-brand-silver">Service:</span>
                      <span className="ml-1 text-brand-black">{apt.hairstyleName}</span>
                    </div>
                    <div>
                      <span className="text-brand-silver">Price:</span>
                      <span className="ml-1 text-accent-gold font-display">{formatPrice(apt.price)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <select
                      value={apt.status}
                      onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                      className="flex-1 px-3 py-2 text-caption rounded-lg border border-brand-pearl bg-brand-white"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="NO_SHOW">No-Show</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Appointment Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title="Add New Appointment"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-body font-medium text-brand-black">Client Information</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewClient(true)}
                  className={cn(
                    'px-3 py-1.5 text-caption rounded-full transition-colors',
                    isNewClient ? 'bg-accent-gold text-white' : 'bg-brand-pearl text-brand-charcoal'
                  )}
                >
                  New Client
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewClient(false)}
                  className={cn(
                    'px-3 py-1.5 text-caption rounded-full transition-colors',
                    !isNewClient ? 'bg-accent-gold text-white' : 'bg-brand-pearl text-brand-charcoal'
                  )}
                >
                  Existing Client
                </button>
              </div>
            </div>

            {isNewClient ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  value={newClient.firstName}
                  onChange={(e) => setNewClient(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Jane"
                  required
                />
                <Input
                  label="Last Name *"
                  value={newClient.lastName}
                  onChange={(e) => setNewClient(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  required
                />
                <Input
                  label="Phone *"
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="jane@example.com"
                />
              </div>
            ) : (
              <div>
                <label className="block text-caption font-medium text-brand-charcoal mb-2">
                  Select Client *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-brand-pearl bg-brand-white text-body focus:outline-none focus:ring-2 focus:ring-accent-gold/50"
                  required={!isNewClient}
                >
                  <option value="">Choose a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} - {client.phone}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div className="space-y-4 pt-4 border-t border-brand-pearl">
            <h3 className="text-body font-medium text-brand-black">Appointment Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date *"
                type="date"
                value={appointmentData.date}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
              <Input
                label="Time *"
                type="time"
                value={appointmentData.time}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, time: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-caption font-medium text-brand-charcoal mb-2">
                Hairstyle
              </label>
              <select
                value={appointmentData.hairstyleId}
                onChange={(e) => handleHairstyleSelect(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-pearl bg-brand-white text-body focus:outline-none focus:ring-2 focus:ring-accent-gold/50"
              >
                <option value="">Select a hairstyle or enter custom below...</option>
                {hairstyles.map(style => (
                  <option key={style.id} value={style.id}>
                    {style.name} - {formatPrice(style.price)} ({style.duration} min)
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Custom Style Name"
              value={appointmentData.customStyleName}
              onChange={(e) => setAppointmentData(prev => ({ ...prev, customStyleName: e.target.value, hairstyleId: '' }))}
              placeholder="Or enter a custom style name..."
              hint="Use this if the style isn't in the list"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Price ($) *"
                type="number"
                step="0.01"
                value={appointmentData.price}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="85.00"
                required
              />
              <Input
                label="Duration (min) *"
                type="number"
                value={appointmentData.duration}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="180"
                required
              />
              <Input
                label="Deposit ($)"
                type="number"
                step="0.01"
                value={appointmentData.depositAmount}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, depositAmount: e.target.value }))}
                placeholder="10.00"
              />
            </div>

            <Textarea
              label="Notes"
              value={appointmentData.notes}
              onChange={(e) => setAppointmentData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special requests, hair details, or instructions..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-brand-pearl">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
              className="flex-1"
            >
              Create Appointment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
