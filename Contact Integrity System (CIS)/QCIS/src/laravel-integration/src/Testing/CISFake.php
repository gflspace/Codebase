<?php

declare(strict_types=1);

namespace QwickServices\CIS\Testing;

use QwickServices\CIS\CISClient;
use QwickServices\CIS\DTOs\CISResponse;
use QwickServices\CIS\DTOs\EvaluateResponse;

/**
 * Test double for CIS client.
 *
 * Provides fake implementations and assertions for testing CIS integration.
 */
class CISFake extends CISClient
{
    /**
     * @var array<EvaluateResponse>
     */
    private array $evaluateResponses = [];

    /**
     * @var array<array{event_type: string, payload: array}>
     */
    private array $sentWebhooks = [];

    /**
     * @var array<array{action_type: string, user_id: string, counterparty_id: string|null, metadata: array}>
     */
    private array $evaluations = [];

    private string $defaultDecision = 'allow';
    private int $defaultScore = 25;
    private string $defaultTier = 'low';
    private string $defaultReason = 'No risk detected (test mode)';

    /**
     * Create a fake CIS client.
     *
     * Does not require actual configuration.
     */
    public function __construct()
    {
        // Intentionally skip parent constructor - no real HTTP client needed
    }

    /**
     * Queue a fake evaluation response.
     *
     * @param string $decision "allow", "flag", or "block"
     * @param int $score Risk score (0-100)
     * @param string $tier Risk tier
     * @param string $reason Human-readable reason
     * @param array<string> $signals Detected signals
     * @param string|null $enforcementId Enforcement action ID
     * @return self
     */
    public function fakeEvaluateResponse(
        string $decision,
        int $score = 25,
        string $tier = 'low',
        string $reason = 'Test response',
        array $signals = [],
        ?string $enforcementId = null,
    ): self {
        $this->evaluateResponses[] = new EvaluateResponse(
            decision: $decision,
            riskScore: $score,
            riskTier: $tier,
            reason: $reason,
            signals: $signals,
            enforcementId: $enforcementId,
            evaluationTimeMs: 45.0,
        );

        return $this;
    }

    /**
     * Fake a blocked evaluation response.
     *
     * @param string $reason
     * @param array<string> $signals
     * @return self
     */
    public function fakeBlock(string $reason = 'Blocked by test', array $signals = []): self
    {
        return $this->fakeEvaluateResponse(
            decision: 'block',
            score: 85,
            tier: 'critical',
            reason: $reason,
            signals: $signals,
        );
    }

    /**
     * Fake an allowed evaluation response.
     *
     * @param string $reason
     * @return self
     */
    public function fakeAllow(string $reason = 'Allowed by test'): self
    {
        return $this->fakeEvaluateResponse(
            decision: 'allow',
            score: 15,
            tier: 'low',
            reason: $reason,
        );
    }

    /**
     * Fake a flagged evaluation response.
     *
     * @param string $reason
     * @param array<string> $signals
     * @return self
     */
    public function fakeFlag(string $reason = 'Flagged by test', array $signals = []): self
    {
        return $this->fakeEvaluateResponse(
            decision: 'flag',
            score: 55,
            tier: 'medium',
            reason: $reason,
            signals: $signals,
        );
    }

    /**
     * Set default evaluation response when no queued responses exist.
     *
     * @param string $decision
     * @param int $score
     * @param string $tier
     * @return self
     */
    public function setDefaultResponse(string $decision = 'allow', int $score = 25, string $tier = 'low'): self
    {
        $this->defaultDecision = $decision;
        $this->defaultScore = $score;
        $this->defaultTier = $tier;

        return $this;
    }

    /**
     * Evaluate action (fake implementation).
     */
    public function evaluate(
        string $actionType,
        string $userId,
        ?string $counterpartyId = null,
        array $metadata = [],
    ): EvaluateResponse {
        // Record evaluation
        $this->evaluations[] = [
            'action_type' => $actionType,
            'user_id' => $userId,
            'counterparty_id' => $counterpartyId,
            'metadata' => $metadata,
        ];

        // Return queued response or default
        if (!empty($this->evaluateResponses)) {
            return array_shift($this->evaluateResponses);
        }

        return new EvaluateResponse(
            decision: $this->defaultDecision,
            riskScore: $this->defaultScore,
            riskTier: $this->defaultTier,
            reason: $this->defaultReason,
            signals: [],
            evaluationTimeMs: 45.0,
        );
    }

    /**
     * Send webhook (fake implementation).
     */
    public function sendWebhook(string $eventType, array $payload): CISResponse
    {
        $this->sentWebhooks[] = [
            'event_type' => $eventType,
            'payload' => $payload,
        ];

        return new CISResponse(
            success: true,
            statusCode: 200,
            body: ['status' => 'ok', 'message' => 'Webhook received (fake)'],
        );
    }

    /**
     * Health check (fake implementation).
     */
    public function healthCheck(): bool
    {
        return true;
    }

    /**
     * Assert that a webhook was sent.
     *
     * @param string $eventType
     * @param callable|null $callback Optional callback to verify payload
     * @return self
     */
    public function assertWebhookSent(string $eventType, ?callable $callback = null): self
    {
        $matching = array_filter($this->sentWebhooks, function ($webhook) use ($eventType, $callback) {
            if ($webhook['event_type'] !== $eventType) {
                return false;
            }

            if ($callback !== null) {
                return $callback($webhook['payload']);
            }

            return true;
        });

        if (empty($matching)) {
            $sent = array_map(fn($w) => $w['event_type'], $this->sentWebhooks);
            throw new \PHPUnit\Framework\AssertionFailedError(
                "Failed asserting that webhook '{$eventType}' was sent. Sent webhooks: " . implode(', ', $sent ?: ['(none)'])
            );
        }

        return $this;
    }

    /**
     * Assert that a webhook was not sent.
     *
     * @param string $eventType
     * @return self
     */
    public function assertWebhookNotSent(string $eventType): self
    {
        $matching = array_filter($this->sentWebhooks, fn($w) => $w['event_type'] === $eventType);

        if (!empty($matching)) {
            throw new \PHPUnit\Framework\AssertionFailedError(
                "Failed asserting that webhook '{$eventType}' was not sent. It was sent " . count($matching) . " time(s)."
            );
        }

        return $this;
    }

    /**
     * Assert that an evaluation was performed.
     *
     * @param string $actionType
     * @param string|null $userId
     * @return self
     */
    public function assertEvaluated(string $actionType, ?string $userId = null): self
    {
        $matching = array_filter($this->evaluations, function ($eval) use ($actionType, $userId) {
            if ($eval['action_type'] !== $actionType) {
                return false;
            }

            if ($userId !== null && $eval['user_id'] !== $userId) {
                return false;
            }

            return true;
        });

        if (empty($matching)) {
            $performed = array_map(fn($e) => $e['action_type'], $this->evaluations);
            throw new \PHPUnit\Framework\AssertionFailedError(
                "Failed asserting that evaluation '{$actionType}' was performed. Performed evaluations: " . implode(', ', $performed ?: ['(none)'])
            );
        }

        return $this;
    }

    /**
     * Assert that no evaluations were performed.
     *
     * @return self
     */
    public function assertNotEvaluated(): self
    {
        if (!empty($this->evaluations)) {
            $performed = array_map(fn($e) => $e['action_type'], $this->evaluations);
            throw new \PHPUnit\Framework\AssertionFailedError(
                "Failed asserting that no evaluations were performed. Performed: " . implode(', ', $performed)
            );
        }

        return $this;
    }

    /**
     * Assert that no webhooks were sent.
     *
     * @return self
     */
    public function assertNothingSent(): self
    {
        if (!empty($this->sentWebhooks)) {
            $sent = array_map(fn($w) => $w['event_type'], $this->sentWebhooks);
            throw new \PHPUnit\Framework\AssertionFailedError(
                "Failed asserting that no webhooks were sent. Sent: " . implode(', ', $sent)
            );
        }

        return $this;
    }

    /**
     * Get all sent webhooks.
     *
     * @return array<array{event_type: string, payload: array}>
     */
    public function getSentWebhooks(): array
    {
        return $this->sentWebhooks;
    }

    /**
     * Get all performed evaluations.
     *
     * @return array<array{action_type: string, user_id: string, counterparty_id: string|null, metadata: array}>
     */
    public function getEvaluations(): array
    {
        return $this->evaluations;
    }

    /**
     * Get sent webhooks matching event type.
     *
     * @param string $eventType
     * @return array<array>
     */
    public function getSentWebhooksOfType(string $eventType): array
    {
        return array_filter($this->sentWebhooks, fn($w) => $w['event_type'] === $eventType);
    }

    /**
     * Clear all recorded webhooks and evaluations.
     *
     * @return self
     */
    public function reset(): self
    {
        $this->sentWebhooks = [];
        $this->evaluations = [];
        $this->evaluateResponses = [];

        return $this;
    }

    /**
     * Get webhook count.
     *
     * @return int
     */
    public function webhookCount(): int
    {
        return count($this->sentWebhooks);
    }

    /**
     * Get evaluation count.
     *
     * @return int
     */
    public function evaluationCount(): int
    {
        return count($this->evaluations);
    }
}
