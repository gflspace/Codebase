<?php

declare(strict_types=1);

namespace QwickServices\CIS\Commands;

use Illuminate\Console\Command;
use QwickServices\CIS\CISClient;
use QwickServices\CIS\Exceptions\CISConnectionException;

/**
 * Artisan command to test the CIS evaluate endpoint.
 *
 * Tests pre-transaction evaluation from the command line.
 */
class CISEvaluate extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cis:evaluate
                            {--user= : User ID to evaluate}
                            {--action=booking.create : Action type to evaluate}
                            {--counterparty= : Counterparty ID (provider, customer)}
                            {--amount= : Transaction amount}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the CIS evaluate endpoint';

    /**
     * Execute the console command.
     */
    public function handle(CISClient $client): int
    {
        if (!config('cis.enabled')) {
            $this->warn('CIS is disabled (CIS_ENABLED=false)');
            return Command::FAILURE;
        }

        if (empty(config('cis.webhook_secret'))) {
            $this->error('CIS_WEBHOOK_SECRET is not configured');
            return Command::FAILURE;
        }

        $userId = $this->option('user') ?? 'test-user-' . time();
        $actionType = $this->option('action');
        $counterpartyId = $this->option('counterparty');
        $amount = $this->option('amount');

        $metadata = [];
        if ($amount !== null) {
            $metadata['amount'] = (float) $amount;
        }

        $this->info("Evaluating action: {$actionType}");
        $this->line('');

        $this->table(
            ['Parameter', 'Value'],
            [
                ['User ID', $userId],
                ['Action Type', $actionType],
                ['Counterparty ID', $counterpartyId ?? '(none)'],
                ['Amount', $amount ?? '(none)'],
            ]
        );

        $this->line('');

        try {
            $startTime = microtime(true);

            $evaluation = $client->evaluate(
                actionType: $actionType,
                userId: $userId,
                counterpartyId: $counterpartyId,
                metadata: $metadata,
            );

            $elapsedMs = round((microtime(true) - $startTime) * 1000, 2);

            $this->line('');
            $this->info('Evaluation completed in ' . $elapsedMs . 'ms');
            $this->line('');

            $decisionColor = match ($evaluation->decision) {
                'allow' => 'info',
                'flag' => 'comment',
                'block' => 'error',
                default => 'line',
            };

            $this->table(
                ['Field', 'Value'],
                [
                    ['Decision', $evaluation->decision],
                    ['Risk Score', $evaluation->riskScore . '/100'],
                    ['Risk Tier', $evaluation->riskTier],
                    ['Reason', $evaluation->reason],
                    ['Signals Detected', count($evaluation->signals)],
                    ['Enforcement ID', $evaluation->enforcementId ?? '(none)'],
                    ['Evaluation Time', $evaluation->evaluationTimeMs . 'ms'],
                ]
            );

            if ($evaluation->hasSignals()) {
                $this->line('');
                $this->line('Detected Signals:');
                foreach ($evaluation->signals as $signal) {
                    $this->line('  - ' . $signal);
                }
            }

            $this->line('');

            if ($evaluation->isBlocked()) {
                $this->error('✗ ACTION BLOCKED');
                $this->line('  This action would be denied in production.');
                return Command::FAILURE;
            } elseif ($evaluation->isFlagged()) {
                $this->warn('⚠ ACTION FLAGGED');
                $this->line('  This action would proceed with monitoring in production.');
                return Command::SUCCESS;
            } else {
                $this->info('✓ ACTION ALLOWED');
                $this->line('  This action would proceed normally in production.');
                return Command::SUCCESS;
            }
        } catch (CISConnectionException $e) {
            $this->line('');
            $this->error('✗ Connection Error');
            $this->line('Error: ' . $e->getMessage());
            $this->line('');
            $this->line('Troubleshooting:');
            $this->line('  1. Run: php artisan cis:health');
            $this->line('  2. Verify CIS backend is running');
            $this->line('  3. Check network connectivity');
            return Command::FAILURE;
        } catch (\Exception $e) {
            $this->line('');
            $this->error('✗ Unexpected Error');
            $this->line('Error: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
