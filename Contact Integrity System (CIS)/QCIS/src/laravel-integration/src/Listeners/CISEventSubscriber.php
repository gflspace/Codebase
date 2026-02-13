<?php

declare(strict_types=1);

namespace QwickServices\CIS\Listeners;

use Illuminate\Events\Dispatcher;
use QwickServices\CIS\Events\CISEventDispatcher;

/**
 * Event subscriber that auto-dispatches CIS webhooks when Laravel events fire.
 *
 * Subscribes to application events and forwards them to CIS backend.
 * Only active when CIS is enabled.
 */
class CISEventSubscriber
{
    public function __construct(
        private readonly CISEventDispatcher $dispatcher,
    ) {
    }

    /**
     * Register the listeners for the subscriber.
     *
     * @param Dispatcher $events
     * @return array<string, string>
     */
    public function subscribe(Dispatcher $events): array
    {
        if (!config('cis.enabled')) {
            return [];
        }

        return [
            // Booking events
            'App\Events\BookingCreated' => 'handleBookingCreated',
            'App\Events\BookingCancelled' => 'handleBookingCancelled',
            'App\Events\BookingCompleted' => 'handleBookingCompleted',
            'App\Events\BookingUpdated' => 'handleBookingUpdated',

            // Payment events
            'App\Events\PaymentInitiated' => 'handlePaymentInitiated',
            'App\Events\PaymentCompleted' => 'handlePaymentCompleted',
            'App\Events\PaymentFailed' => 'handlePaymentFailed',

            // Message events
            'App\Events\MessageSent' => 'handleMessageSent',
            'App\Events\MessageEdited' => 'handleMessageEdited',

            // Provider events
            'App\Events\ProviderRegistered' => 'handleProviderRegistered',
            'App\Events\ProviderVerified' => 'handleProviderVerified',
            'App\Events\ProviderProfileUpdated' => 'handleProviderProfileUpdated',

            // Rating events
            'App\Events\RatingSubmitted' => 'handleRatingSubmitted',

            // Dispute events
            'App\Events\DisputeFiled' => 'handleDisputeFiled',
            'App\Events\DisputeResolved' => 'handleDisputeResolved',
        ];
    }

    /**
     * Handle booking created event.
     */
    public function handleBookingCreated(object $event): void
    {
        $booking = $event->booking ?? $event;
        $this->dispatcher->dispatchBookingCreated($booking);
    }

    /**
     * Handle booking cancelled event.
     */
    public function handleBookingCancelled(object $event): void
    {
        $booking = $event->booking ?? $event;
        $this->dispatcher->dispatchBookingCancelled($booking);
    }

    /**
     * Handle booking completed event.
     */
    public function handleBookingCompleted(object $event): void
    {
        $booking = $event->booking ?? $event;
        $this->dispatcher->dispatchBookingCompleted($booking);
    }

    /**
     * Handle booking updated event.
     */
    public function handleBookingUpdated(object $event): void
    {
        $booking = $event->booking ?? $event;
        $this->dispatcher->dispatchBookingUpdated($booking);
    }

    /**
     * Handle payment initiated event.
     */
    public function handlePaymentInitiated(object $event): void
    {
        $payment = $event->payment ?? $event;
        $this->dispatcher->dispatchPaymentInitiated($payment);
    }

    /**
     * Handle payment completed event.
     */
    public function handlePaymentCompleted(object $event): void
    {
        $payment = $event->payment ?? $event;
        $this->dispatcher->dispatchPaymentCompleted($payment);
    }

    /**
     * Handle payment failed event.
     */
    public function handlePaymentFailed(object $event): void
    {
        $payment = $event->payment ?? $event;
        $this->dispatcher->dispatchPaymentFailed($payment);
    }

    /**
     * Handle message sent event.
     */
    public function handleMessageSent(object $event): void
    {
        $message = $event->message ?? $event;
        $this->dispatcher->dispatchMessageSent($message);
    }

    /**
     * Handle message edited event.
     */
    public function handleMessageEdited(object $event): void
    {
        $message = $event->message ?? $event;
        $this->dispatcher->dispatchMessageEdited($message);
    }

    /**
     * Handle provider registered event.
     */
    public function handleProviderRegistered(object $event): void
    {
        $provider = $event->provider ?? $event->user ?? $event;
        $this->dispatcher->dispatchProviderRegistered($provider);
    }

    /**
     * Handle provider verified event.
     */
    public function handleProviderVerified(object $event): void
    {
        $provider = $event->provider ?? $event->user ?? $event;
        $this->dispatcher->dispatchProviderVerified($provider);
    }

    /**
     * Handle provider profile updated event.
     */
    public function handleProviderProfileUpdated(object $event): void
    {
        $provider = $event->provider ?? $event->user ?? $event;
        $this->dispatcher->dispatchProviderProfileUpdated($provider);
    }

    /**
     * Handle rating submitted event.
     */
    public function handleRatingSubmitted(object $event): void
    {
        $rating = $event->rating ?? $event;
        $this->dispatcher->dispatchRatingSubmitted($rating);
    }

    /**
     * Handle dispute filed event.
     */
    public function handleDisputeFiled(object $event): void
    {
        $dispute = $event->dispute ?? $event;
        $this->dispatcher->dispatchDisputeFiled($dispute);
    }

    /**
     * Handle dispute resolved event.
     */
    public function handleDisputeResolved(object $event): void
    {
        $dispute = $event->dispute ?? $event;
        $this->dispatcher->dispatchDisputeResolved($dispute);
    }
}
