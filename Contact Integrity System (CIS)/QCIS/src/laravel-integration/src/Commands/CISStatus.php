<?php

declare(strict_types=1);

namespace QwickServices\CIS\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use QwickServices\CIS\CISClient;

/**
 * Artisan command to display CIS integration status.
 *
 * Shows configuration, health, queue status, and recent activity.
 */
class CISStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cis:status';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Show CIS integration status and diagnostics';

    /**
     * Execute the console command.
     */
    public function handle(CISClient $client): int
    {
        $this->info('CIS Integration Status');
        $this->line('');

        // Configuration Check
        $this->line('<fg=cyan>Configuration</>');
        $this->line(str_repeat('-', 60));

        $enabled = config('cis.enabled');
        $baseUrl = config('cis.base_url');
        $secretConfigured = !empty(config('cis.webhook_secret'));
        $async = config('cis.async');
        $failOpen = config('cis.fail_open');
        $debug = config('cis.debug');

        $configTable = [
            ['Enabled', $enabled ? '✓ Yes' : '✗ No'],
            ['Base URL', $baseUrl],
            ['Webhook Secret', $secretConfigured ? '✓ Configured' : '✗ Missing'],
            ['Async Mode', $async ? '✓ Enabled' : '✗ Disabled'],
            ['Fail-Open Mode', $failOpen ? '✓ Enabled' : '✗ Disabled'],
            ['Debug Mode', $debug ? '✓ Enabled' : '✗ Disabled'],
            ['Source Identifier', config('cis.source')],
        ];

        $this->table(['Setting', 'Value'], $configTable);
        $this->line('');

        // Health Check
        $this->line('<fg=cyan>Backend Health</>');
        $this->line(str_repeat('-', 60));

        if (!$enabled) {
            $this->warn('CIS is disabled - skipping health check');
        } elseif (!$secretConfigured) {
            $this->error('Webhook secret not configured - cannot connect');
        } else {
            try {
                $healthy = $client->healthCheck();
                if ($healthy) {
                    $this->info('✓ Backend is healthy and reachable');
                } else {
                    $this->error('✗ Backend returned unhealthy status');
                }
            } catch (\Exception $e) {
                $this->error('✗ Cannot connect: ' . $e->getMessage());
            }
        }

        $this->line('');

        // Timeout Configuration
        $this->line('<fg=cyan>Timeout Configuration</>');
        $this->line(str_repeat('-', 60));

        $this->table(
            ['Endpoint', 'Timeout'],
            [
                ['Evaluate', config('cis.timeout.evaluate') . 's'],
                ['Webhook', config('cis.timeout.webhook') . 's'],
                ['Health', config('cis.timeout.health') . 's'],
            ]
        );

        $this->line('');

        // Queue Configuration
        if ($async) {
            $this->line('<fg=cyan>Queue Configuration</>');
            $this->line(str_repeat('-', 60));

            $queueConnection = config('cis.queue.connection');
            $queueName = config('cis.queue.name');

            $this->table(
                ['Setting', 'Value'],
                [
                    ['Connection', $queueConnection],
                    ['Queue Name', $queueName],
                ]
            );

            // Check queue connectivity
            try {
                $queueSize = $this->getQueueSize($queueConnection, $queueName);
                if ($queueSize !== null) {
                    $this->info("✓ Queue connection OK ({$queueSize} jobs pending)");
                } else {
                    $this->warn('⚠ Could not determine queue size');
                }
            } catch (\Exception $e) {
                $this->error('✗ Queue connection failed: ' . $e->getMessage());
            }

            $this->line('');
        }

        // Retry Configuration
        $this->line('<fg=cyan>Retry Configuration</>');
        $this->line(str_repeat('-', 60));

        $this->table(
            ['Setting', 'Value'],
            [
                ['Attempts', config('cis.retry.attempts')],
                ['Base Delay', config('cis.retry.delay_ms') . 'ms'],
            ]
        );

        $this->line('');

        // Registered Middleware
        $this->line('<fg=cyan>Registered Middleware</>');
        $this->line(str_repeat('-', 60));

        $middleware = [
            'CISEvaluateBooking' => 'QwickServices\\CIS\\Middleware\\CISEvaluateBooking',
            'CISEvaluatePayment' => 'QwickServices\\CIS\\Middleware\\CISEvaluatePayment',
        ];

        foreach ($middleware as $name => $class) {
            $exists = class_exists($class);
            $status = $exists ? '✓' : '✗';
            $this->line("  {$status} {$name}");
        }

        $this->line('');

        // Recent Activity
        $this->line('<fg=cyan>Recent Activity</>');
        $this->line(str_repeat('-', 60));

        try {
            $recentLogs = $this->getRecentWebhookLogs();
            if (!empty($recentLogs)) {
                $this->table(
                    ['Event Type', 'Status', 'Timestamp'],
                    $recentLogs
                );
            } else {
                $this->line('No recent webhook logs found');
                $this->line('(Run migrations if webhook logging is enabled)');
            }
        } catch (\Exception $e) {
            $this->line('Webhook logging table not available');
        }

        $this->line('');

        // Overall Status
        $overallHealthy = $enabled && $secretConfigured;

        if ($overallHealthy) {
            $this->info('Overall Status: ✓ Ready');
        } else {
            $this->warn('Overall Status: ⚠ Configuration Required');
        }

        return Command::SUCCESS;
    }

    /**
     * Get queue size for monitoring.
     *
     * @param string $connection
     * @param string $queue
     * @return int|null
     */
    private function getQueueSize(string $connection, string $queue): ?int
    {
        try {
            // This is a simplified check - actual implementation depends on queue driver
            $queueConnection = app('queue')->connection($connection);

            // For Redis, we can check list length
            if ($connection === 'redis' && method_exists($queueConnection, 'size')) {
                return $queueConnection->size($queue);
            }

            return null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get recent webhook logs from database.
     *
     * @return array<array<string, mixed>>
     */
    private function getRecentWebhookLogs(): array
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('cis_webhook_log')) {
                return [];
            }

            $logs = DB::table('cis_webhook_log')
                ->select(['event_type', 'success', 'dispatched_at'])
                ->orderBy('dispatched_at', 'desc')
                ->limit(10)
                ->get();

            return $logs->map(function ($log) {
                return [
                    $log->event_type,
                    $log->success ? '✓ Success' : '✗ Failed',
                    $log->dispatched_at,
                ];
            })->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }
}
