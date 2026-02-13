<?php

declare(strict_types=1);

namespace QwickServices\CIS\Traits;

use QwickServices\CIS\CISClient;
use QwickServices\CIS\DTOs\EvaluateResponse;

/**
 * Trait for models that can be evaluated by CIS.
 *
 * Add to Booking, Payment, or other models that need pre-action evaluation.
 */
trait HasCISEvaluation
{
    /**
     * Evaluate this model's action with CIS.
     *
     * @param string $actionType CIS action type (e.g., "booking.create")
     * @param array<string, mixed> $metadata Additional context
     * @return EvaluateResponse
     */
    public function evaluateWithCIS(string $actionType, array $metadata = []): EvaluateResponse
    {
        /** @var CISClient $client */
        $client = app(CISClient::class);

        $userId = $this->getUserIdForCIS();
        $counterpartyId = $this->getCounterpartyIdForCIS();

        return $client->evaluate(
            actionType: $actionType,
            userId: $userId,
            counterpartyId: $counterpartyId,
            metadata: array_merge($this->getMetadataForCIS(), $metadata),
        );
    }

    /**
     * Get the user ID for CIS evaluation.
     *
     * Override in model if needed.
     */
    protected function getUserIdForCIS(): string
    {
        return (string) ($this->user_id ?? $this->customer_id ?? $this->id);
    }

    /**
     * Get the counterparty ID for CIS evaluation.
     *
     * Override in model if needed.
     */
    protected function getCounterpartyIdForCIS(): ?string
    {
        return isset($this->provider_id) ? (string) $this->provider_id : null;
    }

    /**
     * Get metadata for CIS evaluation.
     *
     * Override in model to provide model-specific context.
     *
     * @return array<string, mixed>
     */
    protected function getMetadataForCIS(): array
    {
        return [];
    }
}
