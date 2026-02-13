<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Booking;
use QwickServices\CIS\Events\CISEventDispatcher;

/**
 * Example Eloquent observer for automatic CIS webhook dispatch.
 *
 * Register in App\Providers\EventServiceProvider:
 *
 * use App\Models\Booking;
 * use App\Observers\BookingObserver;
 *
 * public function boot(): void
 * {
 *     Booking::observe(BookingObserver::class);
 * }
 */
class BookingObserver
{
    public function __construct(
        private readonly CISEventDispatcher $cisDispatcher,
    ) {
    }

    /**
     * Handle the Booking "created" event.
     */
    public function created(Booking $booking): void
    {
        $this->cisDispatcher->dispatchBookingCreated($booking);
    }

    /**
     * Handle the Booking "updated" event.
     */
    public function updated(Booking $booking): void
    {
        // Dispatch specific events based on status changes
        if ($booking->wasChanged('status')) {
            match ($booking->status) {
                'cancelled' => $this->cisDispatcher->dispatchBookingCancelled($booking),
                'completed' => $this->cisDispatcher->dispatchBookingCompleted($booking),
                default => $this->cisDispatcher->dispatchBookingUpdated($booking),
            };
        } else {
            // Generic update event
            $this->cisDispatcher->dispatchBookingUpdated($booking);
        }
    }
}
