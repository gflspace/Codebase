<?php

declare(strict_types=1);

namespace QwickServices\CIS\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use QwickServices\CIS\CISClient;
use QwickServices\CIS\Exceptions\CISConnectionException;

/**
 * Queue job for asynchronous CIS webhook dispatch.
 *
 * Dispatched when cis.async is enabled. Provides retry logic and graceful failure handling.
 */
class DispatchCISWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times to retry the job.
     */
    public int $tries;

    /**
     * Number of seconds to wait before retrying.
     */
    public int $backoff;

    /**
     * Delete the job if it fails after max retries.
     */
    public bool $deleteWhenMissingModels = true;

    /**
     * @param string $eventType CIS event type
     * @param array<string, mixed> $payload Event payload
     * @param int $tries Number of retry attempts
     * @param int $backoff Seconds to wait between retries
     */
    public function __construct(
        private readonly string $eventType,
        private readonly array $payload,
        int $tries = 3,
        int $backoff = 5,
    ) {
        $this->tries = $tries;
        $this->backoff = $backoff;
    }

    /**
     * Execute the job.
     */
    public function handle(CISClient $client): void
    {
        try {
            Log::info('Dispatching CIS webhook', [
                'event_type' => $this->eventType,
                'attempt' => $this->attempts(),
            ]);

            $response = $client->sendWebhook($this->eventType, $this->payload);

            if ($response->isSuccessful()) {
                Log::info('CIS webhook dispatched successfully', [
                    'event_type' => $this->eventType,
                    'status_code' => $response->statusCode,
                ]);
            } else {
                Log::warning('CIS webhook failed', [
                    'event_type' => $this->eventType,
                    'status_code' => $response->statusCode,
                    'error' => $response->error,
                ]);

                // Retry on server errors
                if ($response->isServerError()) {
                    $this->release($this->backoff * $this->attempts());
                }
            }
        } catch (CISConnectionException $e) {
            Log::error('CIS connection error in webhook dispatch', [
                'event_type' => $this->eventType,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            // Retry on connection errors
            $this->release($this->backoff * $this->attempts());
        } catch (\Throwable $e) {
            Log::error('Unexpected error in CIS webhook dispatch', [
                'event_type' => $this->eventType,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Don't retry on unexpected errors
            $this->fail($e);
        }
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('CIS webhook job failed permanently', [
            'event_type' => $this->eventType,
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Get tags for queue monitoring.
     *
     * @return array<string>
     */
    public function tags(): array
    {
        return ['cis-webhook', $this->eventType];
    }
}
