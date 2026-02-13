<?php

declare(strict_types=1);

namespace QwickServices\CIS\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Eloquent model for CIS webhook log entries.
 *
 * Tracks webhook dispatch history for monitoring and debugging.
 *
 * @property int $id
 * @property string $event_type
 * @property string $idempotency_key
 * @property string|null $user_id
 * @property array $payload
 * @property int|null $response_status
 * @property string|null $response_body
 * @property bool $success
 * @property int $attempts
 * @property \Illuminate\Support\Carbon $dispatched_at
 * @property \Illuminate\Support\Carbon|null $completed_at
 * @property string|null $error
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 */
class CISWebhookLog extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'cis_webhook_log';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'event_type',
        'idempotency_key',
        'user_id',
        'payload',
        'response_status',
        'response_body',
        'success',
        'attempts',
        'dispatched_at',
        'completed_at',
        'error',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'payload' => 'array',
        'success' => 'boolean',
        'attempts' => 'integer',
        'response_status' => 'integer',
        'dispatched_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Get recent webhook logs.
     *
     * @param int $limit
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function recent(int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return static::query()
            ->orderBy('dispatched_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get failed webhook logs.
     *
     * @param int $limit
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function failed(int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return static::query()
            ->where('success', false)
            ->orderBy('dispatched_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get webhook logs for a specific event type.
     *
     * @param string $eventType
     * @param int $limit
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function forEventType(string $eventType, int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return static::query()
            ->where('event_type', $eventType)
            ->orderBy('dispatched_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get webhook logs for a specific user.
     *
     * @param string $userId
     * @param int $limit
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function forUser(string $userId, int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return static::query()
            ->where('user_id', $userId)
            ->orderBy('dispatched_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Calculate success rate for a time period.
     *
     * @param int $hours
     * @return float Percentage (0-100)
     */
    public static function successRate(int $hours = 24): float
    {
        $since = now()->subHours($hours);

        $total = static::query()
            ->where('dispatched_at', '>=', $since)
            ->count();

        if ($total === 0) {
            return 100.0;
        }

        $successful = static::query()
            ->where('dispatched_at', '>=', $since)
            ->where('success', true)
            ->count();

        return round(($successful / $total) * 100, 2);
    }

    /**
     * Get average attempts for successful webhooks.
     *
     * @param int $hours
     * @return float
     */
    public static function averageAttempts(int $hours = 24): float
    {
        $since = now()->subHours($hours);

        $average = static::query()
            ->where('dispatched_at', '>=', $since)
            ->where('success', true)
            ->avg('attempts');

        return round((float) ($average ?? 1.0), 2);
    }
}
