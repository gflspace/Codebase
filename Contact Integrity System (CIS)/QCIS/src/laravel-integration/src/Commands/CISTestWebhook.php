<?php

declare(strict_types=1);

namespace QwickServices\CIS\Commands;

use Illuminate\Console\Command;
use QwickServices\CIS\CISClient;

/**
 * Artisan command to send a test webhook to CIS backend.
 *
 * Verifies webhook dispatch, HMAC authentication, and response handling.
 */
class CISTestWebhook extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cis:test-webhook
                            {--type=booking.created : Event type to test}
                            {--user-id=test-user-123 : User ID for test payload}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a test webhook to CIS backend';

    /**
     * Execute the console command.
     */
    public function handle(CISClient $client): int
    {
        $eventType = $this->option('type');
        $userId = $this->option('user-id');

        if (!config('cis.enabled')) {
            $this->warn('CIS is disabled (CIS_ENABLED=false)');
            $this->line('Set CIS_ENABLED=true to send webhooks');
            return Command::FAILURE;
        }

        if (empty(config('cis.webhook_secret'))) {
            $this->error('CIS_WEBHOOK_SECRET is not configured');
            return Command::FAILURE;
        }

        $this->info("Sending test webhook: {$eventType}");
        $this->line('');

        $payload = $this->buildTestPayload($eventType, $userId);

        $this->line('Payload:');
        $this->line(json_encode($payload, JSON_PRETTY_PRINT));
        $this->line('');

        try {
            $startTime = microtime(true);
            $response = $client->sendWebhook($eventType, $payload);
            $elapsedMs = round((microtime(true) - $startTime) * 1000, 2);

            $this->line('Response Time: ' . $elapsedMs . 'ms');
            $this->line('Status Code: ' . $response->statusCode);
            $this->line('');

            if ($response->isSuccessful()) {
                $this->info('✓ Webhook sent successfully');
                $this->line('');

                if (!empty($response->body)) {
                    $this->line('Response Body:');
                    $this->line(json_encode($response->body, JSON_PRETTY_PRINT));
                }

                return Command::SUCCESS;
            } else {
                $this->error('✗ Webhook failed');
                $this->line('Error: ' . ($response->error ?? 'Unknown error'));

                if (!empty($response->body)) {
                    $this->line('');
                    $this->line('Response Body:');
                    $this->line(json_encode($response->body, JSON_PRETTY_PRINT));
                }

                return Command::FAILURE;
            }
        } catch (\Exception $e) {
            $this->error('✗ Exception occurred');
            $this->line('Error: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * Build test payload based on event type.
     *
     * @param string $eventType
     * @param string $userId
     * @return array<string, mixed>
     */
    private function buildTestPayload(string $eventType, string $userId): array
    {
        $basePayload = [
            'user_id' => $userId,
            'created_at' => now()->toIso8601String(),
        ];

        return match ($eventType) {
            'booking.created' => array_merge($basePayload, [
                'booking_id' => 'test-booking-' . time(),
                'provider_id' => 'test-provider-456',
                'service_type' => 'cleaning',
                'amount' => 150.00,
                'scheduled_at' => now()->addDays(2)->toIso8601String(),
            ]),
            'booking.cancelled' => array_merge($basePayload, [
                'booking_id' => 'test-booking-' . time(),
                'provider_id' => 'test-provider-456',
                'cancellation_reason' => 'Test cancellation',
                'cancelled_at' => now()->toIso8601String(),
            ]),
            'booking.completed' => array_merge($basePayload, [
                'booking_id' => 'test-booking-' . time(),
                'provider_id' => 'test-provider-456',
                'completed_at' => now()->toIso8601String(),
            ]),
            'payment.initiated' => array_merge($basePayload, [
                'payment_id' => 'test-payment-' . time(),
                'booking_id' => 'test-booking-123',
                'amount' => 150.00,
                'currency' => 'USD',
                'payment_method' => 'card',
            ]),
            'payment.completed' => array_merge($basePayload, [
                'payment_id' => 'test-payment-' . time(),
                'booking_id' => 'test-booking-123',
                'amount' => 150.00,
                'status' => 'completed',
                'completed_at' => now()->toIso8601String(),
            ]),
            'payment.failed' => array_merge($basePayload, [
                'payment_id' => 'test-payment-' . time(),
                'booking_id' => 'test-booking-123',
                'amount' => 150.00,
                'failure_reason' => 'Test failure',
                'failed_at' => now()->toIso8601String(),
            ]),
            'chat.message_sent' => array_merge($basePayload, [
                'message_id' => 'test-message-' . time(),
                'sender_id' => $userId,
                'recipient_id' => 'test-recipient-789',
                'content' => 'Test message content',
                'sent_at' => now()->toIso8601String(),
            ]),
            'provider.registered' => array_merge($basePayload, [
                'provider_id' => 'test-provider-' . time(),
                'email' => 'test@example.com',
                'phone' => '+1234567890',
                'name' => 'Test Provider',
                'registered_at' => now()->toIso8601String(),
            ]),
            'rating.submitted' => array_merge($basePayload, [
                'rating_id' => 'test-rating-' . time(),
                'booking_id' => 'test-booking-123',
                'reviewer_id' => $userId,
                'reviewee_id' => 'test-provider-456',
                'rating' => 4,
                'comment' => 'Test review comment',
                'submitted_at' => now()->toIso8601String(),
            ]),
            'dispute.filed' => array_merge($basePayload, [
                'dispute_id' => 'test-dispute-' . time(),
                'booking_id' => 'test-booking-123',
                'complainant_id' => $userId,
                'respondent_id' => 'test-provider-456',
                'reason' => 'Test dispute reason',
                'filed_at' => now()->toIso8601String(),
            ]),
            default => $basePayload,
        };
    }
}
