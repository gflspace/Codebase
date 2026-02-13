<?php

declare(strict_types=1);

namespace QwickServices\CIS;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use QwickServices\CIS\DTOs\CISResponse;
use QwickServices\CIS\DTOs\EvaluateResponse;
use QwickServices\CIS\Exceptions\CISConfigurationException;
use QwickServices\CIS\Exceptions\CISConnectionException;

/**
 * Core HTTP client for CIS backend communication.
 *
 * Handles HMAC authentication, retry logic, and API endpoint interactions.
 */
class CISClient
{
    private Client $httpClient;
    private bool $debug;

    /**
     * @param string $baseUrl CIS backend base URL
     * @param string $webhookSecret Shared secret for HMAC signing
     * @param array<string, mixed> $options Client configuration options
     * @throws CISConfigurationException
     */
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $webhookSecret,
        private readonly array $options = [],
    ) {
        if (empty($this->webhookSecret)) {
            throw new CISConfigurationException('CIS webhook secret is not configured');
        }

        if (empty($this->baseUrl)) {
            throw new CISConfigurationException('CIS base URL is not configured');
        }

        $this->debug = $options['debug'] ?? false;

        $this->httpClient = new Client([
            'base_uri' => rtrim($this->baseUrl, '/'),
            'headers' => [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'User-Agent' => 'QwickServices-CIS-Laravel/1.0',
            ],
            'http_errors' => false, // We handle errors manually
        ]);
    }

    /**
     * Send a webhook event to CIS backend.
     *
     * @param string $eventType Event type (e.g., "booking.created")
     * @param array<string, mixed> $payload Event payload
     * @return CISResponse
     */
    public function sendWebhook(string $eventType, array $payload): CISResponse
    {
        $this->logDebug('Sending webhook', ['event_type' => $eventType]);

        $body = [
            'event_type' => $eventType,
            'payload' => $payload,
            'timestamp' => now()->toIso8601String(),
        ];

        $bodyJson = json_encode($body, JSON_THROW_ON_ERROR);

        $timeout = $this->options['timeout']['webhook'] ?? 5.0;
        $retryAttempts = $this->options['retry']['attempts'] ?? 3;
        $retryDelay = $this->options['retry']['delay_ms'] ?? 1000;

        return $this->sendWithRetry(
            method: 'POST',
            uri: '/api/webhooks/ingest',
            body: $bodyJson,
            timeout: $timeout,
            retryAttempts: $retryAttempts,
            retryDelay: $retryDelay,
        );
    }

    /**
     * Evaluate a pre-transaction action.
     *
     * @param string $actionType Action type (e.g., "booking.create")
     * @param string $userId Laravel user ID
     * @param string|null $counterpartyId Laravel counterparty ID (provider, customer)
     * @param array<string, mixed> $metadata Additional context data
     * @return EvaluateResponse
     * @throws CISConnectionException
     */
    public function evaluate(
        string $actionType,
        string $userId,
        ?string $counterpartyId = null,
        array $metadata = [],
    ): EvaluateResponse {
        $this->logDebug('Evaluating action', [
            'action_type' => $actionType,
            'user_id' => $userId,
        ]);

        $body = [
            'action_type' => $actionType,
            'user_id' => $userId,
            'counterparty_id' => $counterpartyId,
            'metadata' => $metadata,
        ];

        $bodyJson = json_encode($body, JSON_THROW_ON_ERROR);

        $timeout = $this->options['timeout']['evaluate'] ?? 0.2;

        // Evaluate endpoint must be fast - no retries
        $response = $this->send(
            method: 'POST',
            uri: '/api/evaluate',
            body: $bodyJson,
            timeout: $timeout,
        );

        if (!$response->isSuccessful()) {
            throw new CISConnectionException(
                "CIS evaluation failed: {$response->error}",
                $response->statusCode,
            );
        }

        return EvaluateResponse::fromArray($response->body);
    }

    /**
     * Check CIS backend health.
     *
     * @return bool True if CIS is healthy
     */
    public function healthCheck(): bool
    {
        try {
            $timeout = $this->options['timeout']['health'] ?? 2.0;

            $response = $this->httpClient->request('GET', '/api/health', [
                'timeout' => $timeout,
            ]);

            $statusCode = $response->getStatusCode();

            $this->logDebug('Health check', ['status_code' => $statusCode]);

            return $statusCode === 200;
        } catch (GuzzleException $e) {
            Log::warning('CIS health check failed', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Send HTTP request with retry logic.
     *
     * @param string $method HTTP method
     * @param string $uri Request URI
     * @param string $body Request body
     * @param float $timeout Request timeout in seconds
     * @param int $retryAttempts Number of retry attempts
     * @param int $retryDelay Delay between retries in milliseconds
     * @return CISResponse
     */
    private function sendWithRetry(
        string $method,
        string $uri,
        string $body,
        float $timeout,
        int $retryAttempts,
        int $retryDelay,
    ): CISResponse {
        $attempt = 0;
        $lastError = null;

        while ($attempt < $retryAttempts) {
            $attempt++;

            try {
                $response = $this->send($method, $uri, $body, $timeout);

                // Success - return immediately
                if ($response->isSuccessful()) {
                    return $response;
                }

                // Client error (4xx) - don't retry
                if ($response->isClientError()) {
                    $this->logDebug('Client error, not retrying', [
                        'status_code' => $response->statusCode,
                    ]);
                    return $response;
                }

                // Server error (5xx) - retry
                $lastError = "HTTP {$response->statusCode}: {$response->error}";
            } catch (CISConnectionException $e) {
                $lastError = $e->getMessage();
            }

            // Don't sleep after last attempt
            if ($attempt < $retryAttempts) {
                $delay = $retryDelay * (2 ** ($attempt - 1)); // Exponential backoff
                $this->logDebug('Retrying request', [
                    'attempt' => $attempt,
                    'delay_ms' => $delay,
                ]);
                usleep($delay * 1000); // Convert to microseconds
            }
        }

        // All retries exhausted
        return new CISResponse(
            success: false,
            statusCode: 0,
            body: [],
            error: "All retry attempts exhausted. Last error: {$lastError}",
        );
    }

    /**
     * Send HTTP request to CIS backend.
     *
     * @param string $method HTTP method
     * @param string $uri Request URI
     * @param string $body Request body
     * @param float $timeout Request timeout in seconds
     * @return CISResponse
     * @throws CISConnectionException
     */
    private function send(
        string $method,
        string $uri,
        string $body,
        float $timeout,
    ): CISResponse {
        try {
            $headers = $this->sign($body);

            $response = $this->httpClient->request($method, $uri, [
                'body' => $body,
                'headers' => $headers,
                'timeout' => $timeout,
            ]);

            $statusCode = $response->getStatusCode();
            $responseBody = (string) $response->getBody();

            $decoded = [];
            if (!empty($responseBody)) {
                $decoded = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR) ?? [];
            }

            $success = $statusCode >= 200 && $statusCode < 300;

            return new CISResponse(
                success: $success,
                statusCode: $statusCode,
                body: $decoded,
                error: $success ? null : ($decoded['error'] ?? 'Unknown error'),
            );
        } catch (ConnectException $e) {
            throw new CISConnectionException(
                "Failed to connect to CIS backend: {$e->getMessage()}",
                0,
                $e,
            );
        } catch (RequestException $e) {
            throw new CISConnectionException(
                "CIS request failed: {$e->getMessage()}",
                $e->getCode(),
                $e,
            );
        } catch (GuzzleException $e) {
            throw new CISConnectionException(
                "CIS HTTP error: {$e->getMessage()}",
                0,
                $e,
            );
        }
    }

    /**
     * Generate HMAC signature headers for request authentication.
     *
     * @param string $body Request body
     * @return array<string, string> Headers to add to request
     */
    private function sign(string $body): array
    {
        $timestamp = (int) (microtime(true) * 1000); // Unix timestamp in milliseconds
        $idempotencyKey = (string) Str::uuid();

        // Signature message: timestamp + "." + body
        $message = $timestamp . '.' . $body;

        // HMAC-SHA256 signature
        $signature = hash_hmac('sha256', $message, $this->webhookSecret);

        $source = $this->options['source'] ?? 'qwickservices';

        return [
            'X-CIS-Signature' => 'sha256=' . $signature,
            'X-CIS-Timestamp' => (string) $timestamp,
            'X-CIS-Source' => $source,
            'X-CIS-Idempotency-Key' => $idempotencyKey,
        ];
    }

    /**
     * Log debug message if debug mode is enabled.
     *
     * @param string $message
     * @param array<string, mixed> $context
     */
    private function logDebug(string $message, array $context = []): void
    {
        if ($this->debug) {
            Log::debug("[CIS Client] {$message}", $context);
        }
    }
}
