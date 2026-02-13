<?php

declare(strict_types=1);

namespace QwickServices\CIS\Commands;

use Illuminate\Console\Command;
use QwickServices\CIS\CISClient;

/**
 * Artisan command to verify CIS backend connectivity.
 *
 * Tests connection, authentication, and health status.
 */
class CISHealthCheck extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cis:health';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check CIS backend connectivity and health';

    /**
     * Execute the console command.
     */
    public function handle(CISClient $client): int
    {
        $this->info('Checking CIS backend health...');
        $this->line('');

        $baseUrl = config('cis.base_url');
        $enabled = config('cis.enabled');
        $async = config('cis.async');

        $this->table(
            ['Configuration', 'Value'],
            [
                ['Base URL', $baseUrl],
                ['Enabled', $enabled ? 'Yes' : 'No'],
                ['Async Mode', $async ? 'Yes' : 'No'],
                ['Queue Connection', config('cis.queue.connection')],
                ['Queue Name', config('cis.queue.name')],
                ['Webhook Secret', config('cis.webhook_secret') ? '(configured)' : '(missing)'],
            ]
        );

        $this->line('');

        if (!$enabled) {
            $this->warn('CIS is disabled (CIS_ENABLED=false)');
            return Command::SUCCESS;
        }

        if (empty(config('cis.webhook_secret'))) {
            $this->error('CIS_WEBHOOK_SECRET is not configured');
            return Command::FAILURE;
        }

        $this->info('Testing connection to: ' . $baseUrl);

        try {
            $healthy = $client->healthCheck();

            if ($healthy) {
                $this->line('');
                $this->info('✓ CIS backend is healthy and reachable');
                return Command::SUCCESS;
            } else {
                $this->line('');
                $this->error('✗ CIS backend returned unhealthy status');
                $this->line('  The backend is reachable but not functioning correctly.');
                return Command::FAILURE;
            }
        } catch (\Exception $e) {
            $this->line('');
            $this->error('✗ Cannot connect to CIS backend');
            $this->line('  Error: ' . $e->getMessage());
            $this->line('');
            $this->line('Troubleshooting steps:');
            $this->line('  1. Verify CIS backend is running');
            $this->line('  2. Check CIS_BASE_URL in .env');
            $this->line('  3. Ensure network connectivity');
            $this->line('  4. Check firewall rules');

            return Command::FAILURE;
        }
    }
}
