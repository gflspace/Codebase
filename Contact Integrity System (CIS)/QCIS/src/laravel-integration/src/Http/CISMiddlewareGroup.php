<?php

declare(strict_types=1);

namespace QwickServices\CIS\Http;

use QwickServices\CIS\Middleware\CISEvaluateBooking;
use QwickServices\CIS\Middleware\CISEvaluatePayment;

/**
 * Helper class for registering CIS middleware groups.
 *
 * Provides convenient middleware group registration in Http/Kernel.php.
 */
class CISMiddlewareGroup
{
    /**
     * Get all CIS middleware classes.
     *
     * Usage in Http/Kernel.php:
     * ```php
     * protected $middlewareGroups = [
     *     'cis' => CISMiddlewareGroup::all(),
     * ];
     * ```
     *
     * @return array<string>
     */
    public static function all(): array
    {
        return [
            CISEvaluateBooking::class,
            CISEvaluatePayment::class,
        ];
    }

    /**
     * Get booking evaluation middleware.
     *
     * @return string
     */
    public static function booking(): string
    {
        return CISEvaluateBooking::class;
    }

    /**
     * Get payment evaluation middleware.
     *
     * @return string
     */
    public static function payment(): string
    {
        return CISEvaluatePayment::class;
    }

    /**
     * Get middleware aliases for registration.
     *
     * Usage in Http/Kernel.php:
     * ```php
     * protected $middlewareAliases = [
     *     // ... other aliases
     *     ...CISMiddlewareGroup::aliases(),
     * ];
     * ```
     *
     * @return array<string, string>
     */
    public static function aliases(): array
    {
        return [
            'cis.evaluate.booking' => CISEvaluateBooking::class,
            'cis.evaluate.payment' => CISEvaluatePayment::class,
        ];
    }
}
