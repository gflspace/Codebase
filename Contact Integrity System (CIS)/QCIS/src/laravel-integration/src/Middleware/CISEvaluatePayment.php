<?php

declare(strict_types=1);

namespace QwickServices\CIS\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use QwickServices\CIS\CISClient;
use QwickServices\CIS\Exceptions\CISConnectionException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware for pre-payment CIS evaluation.
 *
 * Evaluates payment initiation requests before processing.
 * Blocks, flags, or allows based on CIS decision.
 */
class CISEvaluatePayment
{
    public function __construct(
        private readonly CISClient $client,
    ) {
    }

    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if CIS is enabled
        if (!config('cis.enabled', true)) {
            return $next($request);
        }

        // Extract payment parameters from request
        $userId = $this->extractUserId($request);
        $providerId = $this->extractProviderId($request);
        $metadata = $this->extractMetadata($request);

        // Skip evaluation if required data is missing
        if (empty($userId)) {
            Log::warning('CIS evaluation skipped: missing user_id');
            return $next($request);
        }

        try {
            // Call CIS evaluate endpoint
            $evaluation = $this->client->evaluate(
                actionType: 'payment.initiate',
                userId: $userId,
                counterpartyId: $providerId,
                metadata: $metadata,
            );

            Log::info('CIS payment evaluation completed', [
                'user_id' => $userId,
                'provider_id' => $providerId,
                'decision' => $evaluation->decision,
                'risk_score' => $evaluation->riskScore,
                'risk_tier' => $evaluation->riskTier,
                'signals' => $evaluation->signals,
                'evaluation_time_ms' => $evaluation->evaluationTimeMs,
            ]);

            // Handle BLOCK decision
            if ($evaluation->isBlocked()) {
                return new JsonResponse([
                    'error' => 'Payment request denied',
                    'reason' => $evaluation->reason,
                    'risk_tier' => $evaluation->riskTier,
                    'enforcement_id' => $evaluation->enforcementId,
                ], 403);
            }

            // Handle FLAG decision - proceed but add headers
            if ($evaluation->isFlagged()) {
                $request->attributes->set('cis_evaluation', $evaluation);
                $request->attributes->set('cis_flagged', true);

                $response = $next($request);

                // Add CIS headers to response
                foreach ($evaluation->getHttpHeaders() as $key => $value) {
                    $response->headers->set($key, $value);
                }

                return $response;
            }

            // ALLOW decision - proceed normally with headers
            $request->attributes->set('cis_evaluation', $evaluation);

            $response = $next($request);

            // Add CIS headers to response
            foreach ($evaluation->getHttpHeaders() as $key => $value) {
                $response->headers->set($key, $value);
            }

            return $response;
        } catch (CISConnectionException $e) {
            // Fail-open: allow request if CIS is unreachable
            $failOpen = config('cis.fail_open', true);

            Log::warning('CIS evaluation failed, fail-open=' . ($failOpen ? 'true' : 'false'), [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            if ($failOpen) {
                $response = $next($request);
                $response->headers->set('X-CIS-Unavailable', 'true');
                return $response;
            }

            return new JsonResponse([
                'error' => 'Unable to process request',
                'reason' => 'Contact integrity service unavailable',
            ], 503);
        } catch (\Throwable $e) {
            Log::error('Unexpected error in CIS evaluation middleware', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Fail-open on unexpected errors
            return $next($request);
        }
    }

    /**
     * Extract user ID from request.
     */
    private function extractUserId(Request $request): ?string
    {
        // Try authenticated user first
        $user = $request->user();
        if ($user) {
            return (string) $user->id;
        }

        // Try request body/query
        return $request->input('user_id')
            ?? $request->input('customer_id')
            ?? $request->input('payer_id')
            ?? null;
    }

    /**
     * Extract provider/recipient ID from request.
     */
    private function extractProviderId(Request $request): ?string
    {
        return $request->input('provider_id')
            ?? $request->input('recipient_id')
            ?? $request->input('payee_id')
            ?? null;
    }

    /**
     * Extract metadata from request.
     *
     * @return array<string, mixed>
     */
    private function extractMetadata(Request $request): array
    {
        return [
            'payment_amount' => $request->input('amount') ?? null,
            'currency' => $request->input('currency') ?? 'USD',
            'payment_method' => $request->input('payment_method') ?? $request->input('method') ?? null,
            'booking_id' => $request->input('booking_id') ?? null,
            'description' => $request->input('description') ?? $request->input('note') ?? null,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ];
    }
}
