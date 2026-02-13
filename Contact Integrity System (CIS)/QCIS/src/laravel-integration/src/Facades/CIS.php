<?php

declare(strict_types=1);

namespace QwickServices\CIS\Facades;

use Illuminate\Support\Facades\Facade;
use QwickServices\CIS\CISClient;
use QwickServices\CIS\DTOs\CISResponse;
use QwickServices\CIS\DTOs\EvaluateResponse;
use QwickServices\CIS\Testing\CISFake;

/**
 * Laravel facade for CIS client.
 *
 * @method static CISResponse sendWebhook(string $eventType, array $payload)
 * @method static EvaluateResponse evaluate(string $actionType, string $userId, ?string $counterpartyId = null, array $metadata = [])
 * @method static bool healthCheck()
 *
 * @see CISClient
 */
class CIS extends Facade
{
    /**
     * Replace the CIS client with a fake for testing.
     *
     * @return CISFake
     */
    public static function fake(): CISFake
    {
        $fake = new CISFake();

        static::swap($fake);

        return $fake;
    }

    /**
     * Get the registered name of the component.
     */
    protected static function getFacadeAccessor(): string
    {
        return CISClient::class;
    }
}
