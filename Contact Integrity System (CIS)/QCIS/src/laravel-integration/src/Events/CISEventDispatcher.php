<?php

declare(strict_types=1);

namespace QwickServices\CIS\Events;

use Illuminate\Support\Facades\Log;
use QwickServices\CIS\CISClient;
use QwickServices\CIS\Jobs\DispatchCISWebhook;

/**
 * Event dispatcher for CIS webhooks.
 *
 * Maps Laravel application events to CIS webhook events.
 */
class CISEventDispatcher
{
    private bool $enabled;
    private bool $async;

    public function __construct(
        private readonly CISClient $client,
    ) {
        $this->enabled = config('cis.enabled', true);
        $this->async = config('cis.async', true);
    }

    /**
     * Dispatch a booking.created event.
     *
     * @param object $booking Booking model instance
     */
    public function dispatchBookingCreated(object $booking): void
    {
        $this->dispatch('booking.created', [
            'booking_id' => $booking->id,
            'user_id' => $booking->user_id ?? $booking->customer_id ?? null,
            'provider_id' => $booking->provider_id ?? null,
            'service_type' => $booking->service_type ?? null,
            'amount' => $booking->amount ?? $booking->total ?? null,
            'scheduled_at' => $booking->scheduled_at ?? $booking->start_time ?? null,
            'created_at' => $booking->created_at,
        ]);
    }

    /**
     * Dispatch a booking.updated event.
     *
     * @param object $booking Booking model instance
     */
    public function dispatchBookingUpdated(object $booking): void
    {
        $this->dispatch('booking.updated', [
            'booking_id' => $booking->id,
            'user_id' => $booking->user_id ?? $booking->customer_id ?? null,
            'provider_id' => $booking->provider_id ?? null,
            'status' => $booking->status ?? null,
            'updated_at' => $booking->updated_at,
        ]);
    }

    /**
     * Dispatch a booking.cancelled event.
     *
     * @param object $booking Booking model instance
     */
    public function dispatchBookingCancelled(object $booking): void
    {
        $this->dispatch('booking.cancelled', [
            'booking_id' => $booking->id,
            'user_id' => $booking->user_id ?? $booking->customer_id ?? null,
            'provider_id' => $booking->provider_id ?? null,
            'cancellation_reason' => $booking->cancellation_reason ?? null,
            'cancelled_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Dispatch a booking.completed event.
     *
     * @param object $booking Booking model instance
     */
    public function dispatchBookingCompleted(object $booking): void
    {
        $this->dispatch('booking.completed', [
            'booking_id' => $booking->id,
            'user_id' => $booking->user_id ?? $booking->customer_id ?? null,
            'provider_id' => $booking->provider_id ?? null,
            'completed_at' => $booking->completed_at ?? now()->toIso8601String(),
        ]);
    }

    /**
     * Dispatch a payment.initiated event.
     *
     * @param object $payment Payment model instance
     */
    public function dispatchPaymentInitiated(object $payment): void
    {
        $this->dispatch('payment.initiated', [
            'payment_id' => $payment->id,
            'user_id' => $payment->user_id ?? $payment->customer_id ?? null,
            'booking_id' => $payment->booking_id ?? null,
            'amount' => $payment->amount ?? null,
            'currency' => $payment->currency ?? 'USD',
            'payment_method' => $payment->payment_method ?? null,
            'created_at' => $payment->created_at,
        ]);
    }

    /**
     * Dispatch a payment.completed event.
     *
     * @param object $payment Payment model instance
     */
    public function dispatchPaymentCompleted(object $payment): void
    {
        $this->dispatch('payment.completed', [
            'payment_id' => $payment->id,
            'user_id' => $payment->user_id ?? $payment->customer_id ?? null,
            'booking_id' => $payment->booking_id ?? null,
            'amount' => $payment->amount ?? null,
            'status' => $payment->status ?? 'completed',
            'completed_at' => $payment->completed_at ?? now()->toIso8601String(),
        ]);
    }

    /**
     * Dispatch a payment.failed event.
     *
     * @param object $payment Payment model instance
     */
    public function dispatchPaymentFailed(object $payment): void
    {
        $this->dispatch('payment.failed', [
            'payment_id' => $payment->id,
            'user_id' => $payment->user_id ?? $payment->customer_id ?? null,
            'booking_id' => $payment->booking_id ?? null,
            'amount' => $payment->amount ?? null,
            'failure_reason' => $payment->failure_reason ?? $payment->error_message ?? null,
            'failed_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Dispatch a chat.message_sent event.
     *
     * @param object $message Message model instance
     */
    public function dispatchMessageSent(object $message): void
    {
        $this->dispatch('chat.message_sent', [
            'message_id' => $message->id,
            'sender_id' => $message->sender_id ?? $message->user_id ?? null,
            'recipient_id' => $message->recipient_id ?? $message->receiver_id ?? null,
            'conversation_id' => $message->conversation_id ?? null,
            'content' => $message->content ?? $message->body ?? null,
            'sent_at' => $message->created_at,
        ]);
    }

    /**
     * Dispatch a chat.message_edited event.
     *
     * @param object $message Message model instance
     */
    public function dispatchMessageEdited(object $message): void
    {
        $this->dispatch('chat.message_edited', [
            'message_id' => $message->id,
            'sender_id' => $message->sender_id ?? $message->user_id ?? null,
            'content' => $message->content ?? $message->body ?? null,
            'edited_at' => $message->updated_at,
        ]);
    }

    /**
     * Dispatch a provider.registered event.
     *
     * @param object $provider User/Provider model instance
     */
    public function dispatchProviderRegistered(object $provider): void
    {
        $this->dispatch('provider.registered', [
            'provider_id' => $provider->id,
            'email' => $provider->email ?? null,
            'phone' => $provider->phone ?? $provider->phone_number ?? null,
            'name' => $provider->name ?? ($provider->first_name . ' ' . $provider->last_name ?? null),
            'registered_at' => $provider->created_at,
        ]);
    }

    /**
     * Dispatch a provider.verified event.
     *
     * @param object $provider User/Provider model instance
     */
    public function dispatchProviderVerified(object $provider): void
    {
        $this->dispatch('provider.verified', [
            'provider_id' => $provider->id,
            'verification_type' => $provider->verification_type ?? 'identity',
            'verified_at' => $provider->verified_at ?? now()->toIso8601String(),
        ]);
    }

    /**
     * Dispatch a provider.profile_updated event.
     *
     * @param object $provider User/Provider model instance
     */
    public function dispatchProviderProfileUpdated(object $provider): void
    {
        $this->dispatch('provider.profile_updated', [
            'provider_id' => $provider->id,
            'email' => $provider->email ?? null,
            'phone' => $provider->phone ?? $provider->phone_number ?? null,
            'updated_at' => $provider->updated_at,
        ]);
    }

    /**
     * Dispatch a rating.submitted event.
     *
     * @param object $rating Rating model instance
     */
    public function dispatchRatingSubmitted(object $rating): void
    {
        $this->dispatch('rating.submitted', [
            'rating_id' => $rating->id,
            'booking_id' => $rating->booking_id ?? null,
            'reviewer_id' => $rating->reviewer_id ?? $rating->user_id ?? null,
            'reviewee_id' => $rating->reviewee_id ?? $rating->provider_id ?? null,
            'rating' => $rating->rating ?? $rating->score ?? null,
            'comment' => $rating->comment ?? $rating->review ?? null,
            'submitted_at' => $rating->created_at,
        ]);
    }

    /**
     * Dispatch a dispute.filed event.
     *
     * @param object $dispute Dispute model instance
     */
    public function dispatchDisputeFiled(object $dispute): void
    {
        $this->dispatch('dispute.filed', [
            'dispute_id' => $dispute->id,
            'booking_id' => $dispute->booking_id ?? null,
            'complainant_id' => $dispute->complainant_id ?? $dispute->user_id ?? null,
            'respondent_id' => $dispute->respondent_id ?? $dispute->provider_id ?? null,
            'reason' => $dispute->reason ?? null,
            'filed_at' => $dispute->created_at,
        ]);
    }

    /**
     * Dispatch a dispute.resolved event.
     *
     * @param object $dispute Dispute model instance
     */
    public function dispatchDisputeResolved(object $dispute): void
    {
        $this->dispatch('dispute.resolved', [
            'dispute_id' => $dispute->id,
            'resolution' => $dispute->resolution ?? null,
            'resolved_by' => $dispute->resolved_by ?? null,
            'resolved_at' => $dispute->resolved_at ?? now()->toIso8601String(),
        ]);
    }

    /**
     * Dispatch a contact.field_changed event.
     *
     * @param object $user User model instance
     * @param string $field Changed field name
     * @param mixed $oldValue Previous value
     * @param mixed $newValue New value
     */
    public function dispatchContactFieldChanged(
        object $user,
        string $field,
        mixed $oldValue,
        mixed $newValue,
    ): void {
        $this->dispatch('contact.field_changed', [
            'user_id' => $user->id,
            'field' => $field,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'changed_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Dispatch a generic event to CIS.
     *
     * @param string $eventType CIS event type
     * @param array<string, mixed> $payload Event payload
     */
    private function dispatch(string $eventType, array $payload): void
    {
        if (!$this->enabled) {
            Log::debug('CIS is disabled, skipping webhook dispatch', [
                'event_type' => $eventType,
            ]);
            return;
        }

        try {
            if ($this->async) {
                // Dispatch via queue
                $queueConnection = config('cis.queue.connection');
                $queueName = config('cis.queue.name');
                $retryAttempts = config('cis.retry.attempts', 3);

                DispatchCISWebhook::dispatch($eventType, $payload, $retryAttempts)
                    ->onConnection($queueConnection)
                    ->onQueue($queueName);

                Log::debug('CIS webhook queued', ['event_type' => $eventType]);
            } else {
                // Send synchronously
                $response = $this->client->sendWebhook($eventType, $payload);

                if (!$response->isSuccessful()) {
                    Log::warning('CIS webhook failed', [
                        'event_type' => $eventType,
                        'error' => $response->error,
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::error('Failed to dispatch CIS webhook', [
                'event_type' => $eventType,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
