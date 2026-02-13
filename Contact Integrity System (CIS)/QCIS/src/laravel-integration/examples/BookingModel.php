<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use QwickServices\CIS\Traits\HasCISEvaluation;

/**
 * Example Booking model with CIS evaluation trait.
 *
 * Migration should include:
 * - cis_risk_score (integer, nullable)
 * - cis_risk_tier (string, nullable)
 * - cis_enforcement_id (string, nullable)
 */
class Booking extends Model
{
    use HasCISEvaluation;

    protected $fillable = [
        'user_id',
        'provider_id',
        'service_type',
        'amount',
        'scheduled_at',
        'status',
        'cancellation_reason',
        'cancelled_at',
        'completed_at',
        'cis_risk_score',
        'cis_risk_tier',
        'cis_enforcement_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'scheduled_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
        'cis_risk_score' => 'integer',
    ];

    /**
     * Provide booking-specific metadata for CIS evaluation.
     *
     * @return array<string, mixed>
     */
    protected function getMetadataForCIS(): array
    {
        return [
            'booking_amount' => $this->amount,
            'service_type' => $this->service_type,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'location' => $this->location ?? null,
            'is_first_booking' => $this->isFirstBooking(),
        ];
    }

    /**
     * Get counterparty (provider) ID for CIS evaluation.
     */
    protected function getCounterpartyIdForCIS(): ?string
    {
        return $this->provider_id ? (string) $this->provider_id : null;
    }

    /**
     * Check if this is the user's first booking.
     */
    private function isFirstBooking(): bool
    {
        return !self::where('user_id', $this->user_id)
            ->where('id', '!=', $this->id)
            ->exists();
    }

    /**
     * Relationships
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function provider()
    {
        return $this->belongsTo(User::class, 'provider_id');
    }
}
