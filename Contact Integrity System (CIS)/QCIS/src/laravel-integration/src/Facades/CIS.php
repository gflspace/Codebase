<?php

declare(strict_types=1);

namespace QwickServices\CIS\Facades;

use Illuminate\Support\Facades\Facade;
use QwickServices\CIS\CISClient;
use QwickServices\CIS\DTOs\CISResponse;
use QwickServices\CIS\DTOs\EvaluateResponse;

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
     * Get the registered name of the component.
     */
    protected static function getFacadeAccessor(): string
    {
        return CISClient::class;
    }
}
