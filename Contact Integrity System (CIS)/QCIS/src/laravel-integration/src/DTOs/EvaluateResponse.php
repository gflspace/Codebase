<?php

declare(strict_types=1);

namespace QwickServices\CIS\DTOs;

/**
 * Value object representing a CIS evaluation response.
 *
 * Returned by the /api/evaluate endpoint to inform pre-transaction decisions.
 */
readonly class EvaluateResponse
{
    /**
     * @param string $decision "allow", "flag", or "block"
     * @param int $riskScore Numeric risk score (0-100)
     * @param string $riskTier Risk tier: "low", "medium", "high", "critical"
     * @param string $reason Human-readable explanation of the decision
     * @param array<string> $signals Array of detected signal types
     * @param string|null $enforcementId UUID of created enforcement action (if any)
     * @param float $evaluationTimeMs Time taken to evaluate (milliseconds)
     */
    public function __construct(
        public string $decision,
        public int $riskScore,
        public string $riskTier,
        public string $reason,
        public array $signals = [],
        public ?string $enforcementId = null,
        public float $evaluationTimeMs = 0.0,
    ) {
    }

    /**
     * Create from API response array.
     *
     * @param array<string, mixed> $data
     * @return self
     */
    public static function fromArray(array $data): self
    {
        return new self(
            decision: $data['decision'] ?? 'allow',
            riskScore: (int) ($data['risk_score'] ?? 0),
            riskTier: $data['risk_tier'] ?? 'low',
            reason: $data['reason'] ?? '',
            signals: $data['signals'] ?? [],
            enforcementId: $data['enforcement_id'] ?? null,
            evaluationTimeMs: (float) ($data['evaluation_time_ms'] ?? 0.0),
        );
    }

    /**
     * Check if the decision is "allow" (proceed normally).
     */
    public function isAllowed(): bool
    {
        return $this->decision === 'allow';
    }

    /**
     * Check if the decision is "flag" (proceed with warning).
     */
    public function isFlagged(): bool
    {
        return $this->decision === 'flag';
    }

    /**
     * Check if the decision is "block" (deny the action).
     */
    public function isBlocked(): bool
    {
        return $this->decision === 'block';
    }

    /**
     * Check if any signals were detected.
     */
    public function hasSignals(): bool
    {
        return !empty($this->signals);
    }

    /**
     * Check if a specific signal type was detected.
     */
    public function hasSignal(string $signalType): bool
    {
        return in_array($signalType, $this->signals, true);
    }

    /**
     * Get the count of detected signals.
     */
    public function signalCount(): int
    {
        return count($this->signals);
    }

    /**
     * Check if risk tier is critical.
     */
    public function isCriticalRisk(): bool
    {
        return $this->riskTier === 'critical';
    }

    /**
     * Check if risk tier is high or critical.
     */
    public function isHighRisk(): bool
    {
        return in_array($this->riskTier, ['high', 'critical'], true);
    }

    /**
     * Convert to array representation.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'decision' => $this->decision,
            'risk_score' => $this->riskScore,
            'risk_tier' => $this->riskTier,
            'reason' => $this->reason,
            'signals' => $this->signals,
            'enforcement_id' => $this->enforcementId,
            'evaluation_time_ms' => $this->evaluationTimeMs,
        ];
    }

    /**
     * Get HTTP status code that should be returned based on decision.
     */
    public function getHttpStatusCode(): int
    {
        return match ($this->decision) {
            'block' => 403,
            'flag' => 200,
            'allow' => 200,
            default => 200,
        };
    }

    /**
     * Get response headers that should be added to the HTTP response.
     *
     * @return array<string, string>
     */
    public function getHttpHeaders(): array
    {
        return [
            'X-CIS-Decision' => $this->decision,
            'X-CIS-Score' => (string) $this->riskScore,
            'X-CIS-Tier' => $this->riskTier,
            'X-CIS-Flagged' => $this->isFlagged() ? 'true' : 'false',
        ];
    }
}
