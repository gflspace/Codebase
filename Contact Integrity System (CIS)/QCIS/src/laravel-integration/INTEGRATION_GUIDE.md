# CIS Laravel Integration Guide

Complete step-by-step guide for integrating CIS into your Laravel application.

## Quick Start (5 Minutes)

### 1. Install Package

Add to `composer.json`:

```json
{
    "autoload": {
        "psr-4": {
            "QwickServices\\CIS\\": "path/to/laravel-integration/src/"
        }
    }
}
```

Run:
```bash
composer dump-autoload
```

### 2. Publish Configuration

```bash
php artisan vendor:publish --tag=cis-config
```

### 3. Configure Environment

Add to `.env`:

```env
CIS_ENABLED=true
CIS_BASE_URL=http://localhost:3001
CIS_WEBHOOK_SECRET=your-shared-secret-here
CIS_ASYNC=true
CIS_FAIL_OPEN=true
```

### 4. Test Connection

```bash
php artisan cis:health
```

You're ready to integrate!

## Integration Patterns

### Pattern 1: Pre-Transaction Evaluation (Recommended)

Use middleware to evaluate bookings and payments before processing.

**Step 1:** Add middleware to routes

```php
// routes/api.php
use QwickServices\CIS\Middleware\CISEvaluateBooking;
use QwickServices\CIS\Middleware\CISEvaluatePayment;

Route::post('/bookings', [BookingController::class, 'store'])
    ->middleware(CISEvaluateBooking::class);

Route::post('/payments', [PaymentController::class, 'store'])
    ->middleware(CISEvaluatePayment::class);
```

Or using route macros:

```php
Route::post('/bookings', [BookingController::class, 'store'])->cisBooking();
Route::post('/payments', [PaymentController::class, 'store'])->cisPayment();
```

**Step 2:** Handle responses in controller

```php
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function store(Request $request)
    {
        // If we reach here, CIS allowed the booking
        // Check for flags in headers
        $flagged = $request->header('X-CIS-Flagged') === 'true';
        $riskScore = (int) $request->header('X-CIS-Score', 0);

        $booking = Booking::create([
            'user_id' => $request->user()->id,
            'provider_id' => $request->input('provider_id'),
            'amount' => $request->input('amount'),
            'cis_flagged' => $flagged,
            'cis_risk_score' => $riskScore,
        ]);

        if ($flagged) {
            // Send notification to admin/risk team
            NotifyRiskTeam::dispatch($booking);
        }

        return response()->json($booking, 201);
    }
}
```

**Step 3:** Add CIS fields to database

```bash
php artisan make:migration add_cis_fields_to_bookings
```

```php
Schema::table('bookings', function (Blueprint $table) {
    $table->boolean('cis_flagged')->default(false)->index();
    $table->integer('cis_risk_score')->default(0);
    $table->string('cis_risk_tier', 20)->nullable();
    $table->json('cis_signals')->nullable();
    $table->string('cis_enforcement_id', 36)->nullable();
});
```

### Pattern 2: Manual Evaluation

Evaluate within controller logic for custom handling.

```php
use QwickServices\CIS\Facades\CIS;

class BookingController extends Controller
{
    public function store(Request $request)
    {
        $evaluation = CIS::evaluate(
            actionType: 'booking.create',
            userId: (string) $request->user()->id,
            counterpartyId: (string) $request->input('provider_id'),
            metadata: [
                'booking_amount' => $request->input('amount'),
                'service_type' => $request->input('service_type'),
                'scheduled_at' => $request->input('scheduled_at'),
            ]
        );

        if ($evaluation->isBlocked()) {
            return response()->json([
                'error' => 'Booking denied',
                'reason' => $evaluation->reason,
            ], 403);
        }

        $booking = Booking::create([
            'user_id' => $request->user()->id,
            'provider_id' => $request->input('provider_id'),
            'amount' => $request->input('amount'),
            'cis_flagged' => $evaluation->isFlagged(),
            'cis_risk_score' => $evaluation->riskScore,
            'cis_risk_tier' => $evaluation->riskTier,
            'cis_signals' => $evaluation->signals,
        ]);

        if ($evaluation->isFlagged()) {
            Log::warning('Flagged booking created', [
                'booking_id' => $booking->id,
                'risk_score' => $evaluation->riskScore,
                'signals' => $evaluation->signals,
            ]);
        }

        return response()->json($booking, 201);
    }
}
```

### Pattern 3: Event-Based Webhook Dispatch

Auto-dispatch webhooks when models change.

**Step 1:** Enable auto-dispatch

```env
CIS_AUTO_DISPATCH=true
```

**Step 2:** Ensure events exist

```php
// app/Events/BookingCreated.php
namespace App\Events;

class BookingCreated
{
    public function __construct(
        public Booking $booking,
    ) {}
}
```

**Step 3:** Fire events from models

```php
class Booking extends Model
{
    protected $dispatchesEvents = [
        'created' => BookingCreated::class,
    ];
}
```

Or fire manually:

```php
event(new BookingCreated($booking));
```

**Alternative:** Use model observers for more control

```php
// app/Observers/BookingObserver.php
namespace App\Observers;

use App\Models\Booking;
use QwickServices\CIS\Events\CISEventDispatcher;

class BookingObserver
{
    public function __construct(
        private CISEventDispatcher $dispatcher,
    ) {}

    public function created(Booking $booking): void
    {
        $this->dispatcher->dispatchBookingCreated($booking);
    }

    public function updated(Booking $booking): void
    {
        if ($booking->wasChanged('status')) {
            match ($booking->status) {
                'cancelled' => $this->dispatcher->dispatchBookingCancelled($booking),
                'completed' => $this->dispatcher->dispatchBookingCompleted($booking),
                default => null,
            };
        }
    }
}
```

Register in `EventServiceProvider`:

```php
use App\Models\Booking;
use App\Observers\BookingObserver;

public function boot(): void
{
    Booking::observe(BookingObserver::class);
}
```

### Pattern 4: Manual Webhook Dispatch

Dispatch webhooks directly when needed.

```php
use QwickServices\CIS\Events\CISEventDispatcher;

class BookingService
{
    public function __construct(
        private CISEventDispatcher $dispatcher,
    ) {}

    public function createBooking(array $data): Booking
    {
        $booking = Booking::create($data);

        // Dispatch to CIS
        $this->dispatcher->dispatchBookingCreated($booking);

        return $booking;
    }

    public function cancelBooking(Booking $booking, string $reason): void
    {
        $booking->update([
            'status' => 'cancelled',
            'cancellation_reason' => $reason,
        ]);

        $this->dispatcher->dispatchBookingCancelled($booking);
    }
}
```

Or using facade:

```php
use QwickServices\CIS\Facades\CIS;

CIS::sendWebhook('booking.created', [
    'booking_id' => $booking->id,
    'user_id' => $booking->user_id,
    'provider_id' => $booking->provider_id,
    'amount' => $booking->amount,
    'created_at' => $booking->created_at->toIso8601String(),
]);
```

## Advanced Integration

### Custom Middleware

Create custom evaluation middleware for specific actions:

```php
// app/Http/Middleware/CISEvaluateReview.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use QwickServices\CIS\Facades\CIS;

class CISEvaluateReview
{
    public function handle(Request $request, Closure $next)
    {
        if (!config('cis.enabled')) {
            return $next($request);
        }

        $evaluation = CIS::evaluate(
            actionType: 'review.submit',
            userId: (string) $request->user()->id,
            counterpartyId: (string) $request->input('provider_id'),
            metadata: [
                'rating' => $request->input('rating'),
                'has_comment' => !empty($request->input('comment')),
                'comment_length' => strlen($request->input('comment', '')),
            ]
        );

        if ($evaluation->isBlocked()) {
            return response()->json([
                'error' => 'Review submission denied',
                'reason' => $evaluation->reason,
            ], 403);
        }

        // Add CIS data to request for controller access
        $request->merge([
            'cis_flagged' => $evaluation->isFlagged(),
            'cis_risk_score' => $evaluation->riskScore,
        ]);

        $response = $next($request);

        // Add CIS headers to response
        foreach ($evaluation->getHttpHeaders() as $key => $value) {
            $response->headers->set($key, $value);
        }

        return $response;
    }
}
```

### Track Contact Field Changes

Monitor when users change email/phone:

```php
// app/Observers/UserObserver.php
namespace App\Observers;

use App\Models\User;
use QwickServices\CIS\Events\CISEventDispatcher;

class UserObserver
{
    public function __construct(
        private CISEventDispatcher $dispatcher,
    ) {}

    public function updated(User $user): void
    {
        foreach (['email', 'phone'] as $field) {
            if ($user->wasChanged($field)) {
                $this->dispatcher->dispatchContactFieldChanged(
                    user: $user,
                    field: $field,
                    oldValue: $user->getOriginal($field),
                    newValue: $user->$field,
                );
            }
        }
    }
}
```

### Monitor Webhook Success Rate

Create admin dashboard widget:

```php
use QwickServices\CIS\Models\CISWebhookLog;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'success_rate_24h' => CISWebhookLog::successRate(24),
            'success_rate_7d' => CISWebhookLog::successRate(24 * 7),
            'avg_attempts' => CISWebhookLog::averageAttempts(24),
            'recent_failures' => CISWebhookLog::failed(10),
        ];

        return view('admin.dashboard', compact('stats'));
    }
}
```

## Production Deployment

### 1. Environment Configuration

```env
# Production values
CIS_ENABLED=true
CIS_BASE_URL=https://cis.yourdomain.com
CIS_WEBHOOK_SECRET=<strong-secret-here>
CIS_SOURCE=production

# Performance
CIS_ASYNC=true
CIS_QUEUE_CONNECTION=redis
CIS_QUEUE_NAME=cis-webhooks

# Reliability
CIS_FAIL_OPEN=true
CIS_RETRY_ATTEMPTS=3

# Monitoring
CIS_DEBUG=false
```

### 2. Queue Workers

Configure Supervisor:

```ini
[program:laravel-cis-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/artisan queue:work redis --queue=cis-webhooks --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/storage/logs/cis-worker.log
stopwaitsecs=3600
```

Reload Supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-cis-worker:*
```

### 3. Monitoring

**Health checks:**

```bash
# Add to cron
* * * * * php /var/www/artisan cis:health >> /var/log/cis-health.log 2>&1
```

**Log monitoring:**

```bash
# Watch for errors
tail -f storage/logs/laravel.log | grep "CIS"
```

**Metrics:**

```php
// Send to monitoring service
$successRate = CISWebhookLog::successRate(1); // Last hour
if ($successRate < 95) {
    AlertOpsTeam::dispatch('CIS webhook success rate low: ' . $successRate . '%');
}
```

### 4. Performance Optimization

**Redis queue configuration:**

```php
// config/queue.php
'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => 'cis-webhooks',
        'retry_after' => 90,
        'block_for' => null,
        'after_commit' => false, // Don't wait for DB commit
    ],
],
```

**Database indexes:**

```php
// Ensure indexes exist for webhook log queries
Schema::table('cis_webhook_log', function (Blueprint $table) {
    $table->index(['event_type', 'dispatched_at']);
    $table->index(['user_id', 'dispatched_at']);
    $table->index(['success', 'dispatched_at']);
});
```

## Troubleshooting Common Issues

### Queue Jobs Not Processing

**Check queue workers:**
```bash
ps aux | grep queue:work
```

**Check queue size:**
```bash
php artisan queue:monitor redis:cis-webhooks
```

**Restart workers:**
```bash
sudo supervisorctl restart laravel-cis-worker:*
```

### High Latency on Evaluate

**Check timeout:**
```bash
php artisan cis:evaluate --user=test
```

**Increase worker pool** (if CIS backend slow):
```ini
# Supervisor config
numprocs=4  # Increase from 2
```

**Check fail-open is enabled:**
```env
CIS_FAIL_OPEN=true  # Don't block requests if CIS slow
```

### Webhook Signature Failures

**Verify secret matches:**
```bash
# Laravel
grep CIS_WEBHOOK_SECRET .env

# CIS Backend
grep WEBHOOK_SECRET /path/to/cis/.env
```

**Test webhook:**
```bash
php artisan cis:test-webhook
```

## Migration from Manual Integration

If you were calling CIS manually, migrate to the package:

### Before (Manual HTTP):

```php
$client = new \GuzzleHttp\Client();
$response = $client->post('http://cis-backend/api/evaluate', [
    'json' => [
        'action_type' => 'booking.create',
        'user_id' => $userId,
    ],
]);
```

### After (Package):

```php
use QwickServices\CIS\Facades\CIS;

$evaluation = CIS::evaluate('booking.create', $userId);
```

Benefits:
- HMAC authentication handled automatically
- Retry logic built-in
- Type-safe response objects
- Middleware integration
- Queue support
- Webhook logging

## Support

For issues or questions:
- Check logs: `php artisan cis:status`
- Test connection: `php artisan cis:health`
- Review webhook logs: `CISWebhookLog::recent(50)`
- Enable debug mode: `CIS_DEBUG=true`

Contact: dev@qwickservices.com
