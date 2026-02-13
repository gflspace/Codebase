# QwickServices CIS Laravel Integration

Complete Laravel integration package for the QwickServices Contact Integrity System (CIS).

## Overview

This package provides seamless integration between Laravel applications and the CIS backend, enabling:

- **Pre-transaction evaluation** — Real-time risk assessment before bookings and payments (<200ms)
- **Async webhook dispatch** — Event streaming to CIS for signal detection
- **HMAC authentication** — Secure request signing with replay attack protection
- **Fail-open architecture** — Graceful degradation when CIS is unavailable
- **Queue support** — Asynchronous webhook dispatch with retry logic

## Installation

### 1. Add to Composer Autoload

Add the package to your Laravel application's `composer.json`:

```json
{
    "autoload": {
        "psr-4": {
            "QwickServices\\CIS\\": "path/to/laravel-integration/src/"
        }
    }
}
```

Then run:

```bash
composer dump-autoload
```

### 2. Register Service Provider

The service provider will be auto-discovered by Laravel. If auto-discovery is disabled, add to `config/app.php`:

```php
'providers' => [
    // ...
    QwickServices\CIS\CISServiceProvider::class,
],

'aliases' => [
    // ...
    'CIS' => QwickServices\CIS\Facades\CIS::class,
],
```

### 3. Publish Configuration

```bash
php artisan vendor:publish --tag=cis-config
```

This creates `config/cis.php`.

### 4. Configure Environment Variables

Add to your `.env` file:

```env
# CIS Backend Configuration
CIS_ENABLED=true
CIS_BASE_URL=http://localhost:3001
CIS_WEBHOOK_SECRET=your-shared-secret-here
CIS_SOURCE=qwickservices

# Timeout Settings (in seconds)
CIS_WEBHOOK_TIMEOUT=5.0
CIS_EVALUATE_TIMEOUT=0.2
CIS_HEALTH_TIMEOUT=2.0

# Async & Queue Configuration
CIS_ASYNC=true
CIS_QUEUE_CONNECTION=redis
CIS_QUEUE_NAME=cis-webhooks

# Retry Configuration
CIS_RETRY_ATTEMPTS=3
CIS_RETRY_DELAY_MS=1000

# Failure Handling
CIS_FAIL_OPEN=true

# Debug Mode
CIS_DEBUG=false
```

**Important:** The `CIS_WEBHOOK_SECRET` must match the `WEBHOOK_SECRET` configured in your CIS backend.

## Usage

### Pre-Transaction Evaluation

#### Using Middleware

Add to your route middleware to evaluate bookings or payments before processing:

```php
// routes/api.php

use QwickServices\CIS\Middleware\CISEvaluateBooking;
use QwickServices\CIS\Middleware\CISEvaluatePayment;

Route::post('/bookings', [BookingController::class, 'store'])
    ->middleware(CISEvaluateBooking::class);

Route::post('/payments', [PaymentController::class, 'store'])
    ->middleware(CISEvaluatePayment::class);
```

**Behavior:**
- **`allow`** — Request proceeds normally, CIS headers added to response
- **`flag`** — Request proceeds with warning, `X-CIS-Flagged: true` header added
- **`block`** — Request denied with 403 response

**Response Headers:**
```
X-CIS-Decision: allow|flag|block
X-CIS-Score: 42
X-CIS-Tier: medium
X-CIS-Flagged: true|false
```

#### Using Facade

Manual evaluation without middleware:

```php
use QwickServices\CIS\Facades\CIS;

$evaluation = CIS::evaluate(
    actionType: 'booking.create',
    userId: (string) $user->id,
    counterpartyId: (string) $provider->id,
    metadata: [
        'booking_amount' => 150.00,
        'service_type' => 'cleaning',
        'scheduled_at' => now()->addDays(2)->toIso8601String(),
    ]
);

if ($evaluation->isBlocked()) {
    return response()->json([
        'error' => 'Booking denied',
        'reason' => $evaluation->reason,
    ], 403);
}

if ($evaluation->isFlagged()) {
    // Proceed with extra monitoring
    Log::warning('Flagged booking', [
        'risk_score' => $evaluation->riskScore,
        'signals' => $evaluation->signals,
    ]);
}

// Proceed with booking creation
```

#### Using Model Trait

Add the `HasCISEvaluation` trait to your models:

```php
use QwickServices\CIS\Traits\HasCISEvaluation;

class Booking extends Model
{
    use HasCISEvaluation;

    protected function getMetadataForCIS(): array
    {
        return [
            'booking_amount' => $this->amount,
            'service_type' => $this->service_type,
            'scheduled_at' => $this->scheduled_at,
        ];
    }
}
```

Then evaluate directly on the model:

```php
$booking = new Booking([...]);

$evaluation = $booking->evaluateWithCIS('booking.create');

if ($evaluation->isBlocked()) {
    // Handle blocked booking
}
```

### Webhook Event Dispatch

#### Manual Dispatch

Send events to CIS using the event dispatcher:

```php
use QwickServices\CIS\Events\CISEventDispatcher;

$dispatcher = app(CISEventDispatcher::class);

// Booking events
$dispatcher->dispatchBookingCreated($booking);
$dispatcher->dispatchBookingCancelled($booking);
$dispatcher->dispatchBookingCompleted($booking);

// Payment events
$dispatcher->dispatchPaymentInitiated($payment);
$dispatcher->dispatchPaymentCompleted($payment);
$dispatcher->dispatchPaymentFailed($payment);

// Message events
$dispatcher->dispatchMessageSent($message);

// Provider events
$dispatcher->dispatchProviderRegistered($provider);
$dispatcher->dispatchProviderVerified($provider);

// Rating events
$dispatcher->dispatchRatingSubmitted($rating);

// Dispute events
$dispatcher->dispatchDisputeFiled($dispute);
$dispatcher->dispatchDisputeResolved($dispute);

// Contact field changes
$dispatcher->dispatchContactFieldChanged(
    user: $user,
    field: 'phone',
    oldValue: $user->getOriginal('phone'),
    newValue: $user->phone
);
```

#### Using Facade

```php
use QwickServices\CIS\Facades\CIS;

$response = CIS::sendWebhook('booking.created', [
    'booking_id' => $booking->id,
    'user_id' => $booking->user_id,
    'provider_id' => $booking->provider_id,
    'amount' => $booking->amount,
    'created_at' => $booking->created_at->toIso8601String(),
]);

if ($response->isSuccessful()) {
    Log::info('Webhook sent successfully');
}
```

#### Automatic Dispatch via Model Observers

Create a model observer to automatically dispatch events:

```php
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
        if ($booking->wasChanged('status') && $booking->status === 'cancelled') {
            $this->dispatcher->dispatchBookingCancelled($booking);
        }

        if ($booking->wasChanged('status') && $booking->status === 'completed') {
            $this->dispatcher->dispatchBookingCompleted($booking);
        }
    }
}
```

Register in `App\Providers\EventServiceProvider`:

```php
use App\Models\Booking;
use App\Observers\BookingObserver;

public function boot(): void
{
    Booking::observe(BookingObserver::class);
}
```

### Health Check

Check CIS backend health:

```php
use QwickServices\CIS\Facades\CIS;

if (CIS::healthCheck()) {
    Log::info('CIS is healthy');
} else {
    Log::warning('CIS is unavailable');
}
```

## Configuration Reference

### `config/cis.php`

```php
return [
    // CIS backend base URL
    'base_url' => env('CIS_BASE_URL', 'http://localhost:3001'),

    // Shared HMAC secret (must match CIS backend)
    'webhook_secret' => env('CIS_WEBHOOK_SECRET', ''),

    // Master enable/disable switch
    'enabled' => env('CIS_ENABLED', true),

    // HTTP timeouts (seconds)
    'timeout' => [
        'webhook' => (float) env('CIS_WEBHOOK_TIMEOUT', 5.0),
        'evaluate' => (float) env('CIS_EVALUATE_TIMEOUT', 0.2),
        'health' => (float) env('CIS_HEALTH_TIMEOUT', 2.0),
    ],

    // Use queue for async webhook dispatch
    'async' => env('CIS_ASYNC', true),

    // Queue configuration
    'queue' => [
        'connection' => env('CIS_QUEUE_CONNECTION', 'redis'),
        'name' => env('CIS_QUEUE_NAME', 'cis-webhooks'),
    ],

    // Retry configuration
    'retry' => [
        'attempts' => (int) env('CIS_RETRY_ATTEMPTS', 3),
        'delay_ms' => (int) env('CIS_RETRY_DELAY_MS', 1000),
    ],

    // Fail-open mode (allow requests when CIS unavailable)
    'fail_open' => env('CIS_FAIL_OPEN', true),

    // Enable debug logging
    'debug' => env('CIS_DEBUG', false),

    // Source identifier in webhook headers
    'source' => env('CIS_SOURCE', 'qwickservices'),
];
```

## Event Types

### Booking Events
- `booking.created` — New booking created
- `booking.updated` — Booking details changed
- `booking.cancelled` — Booking cancelled
- `booking.completed` — Booking marked complete

### Payment Events
- `payment.initiated` — Payment started
- `payment.completed` — Payment successful
- `payment.failed` — Payment failed

### Message Events
- `chat.message_sent` — New message sent
- `chat.message_edited` — Message edited

### Provider Events
- `provider.registered` — New provider signed up
- `provider.verified` — Provider identity verified
- `provider.profile_updated` — Provider profile changed

### Rating Events
- `rating.submitted` — New rating/review submitted

### Dispute Events
- `dispute.filed` — Dispute opened
- `dispute.resolved` — Dispute closed

### Contact Events
- `contact.field_changed` — Contact field (email, phone) changed

## Action Types (Evaluate Endpoint)

- `booking.create` — Evaluate before creating booking
- `payment.initiate` — Evaluate before processing payment
- `provider.register` — Evaluate before provider registration
- `message.send` — Evaluate before sending message

## Evaluation Response

```php
$evaluation = CIS::evaluate(...);

// Properties
$evaluation->decision;           // "allow", "flag", "block"
$evaluation->riskScore;          // 0-100
$evaluation->riskTier;           // "low", "medium", "high", "critical"
$evaluation->reason;             // Human-readable explanation
$evaluation->signals;            // Array of detected signal types
$evaluation->enforcementId;      // UUID if action created
$evaluation->evaluationTimeMs;   // Evaluation latency

// Helper methods
$evaluation->isAllowed();        // true if decision === "allow"
$evaluation->isFlagged();        // true if decision === "flag"
$evaluation->isBlocked();        // true if decision === "block"
$evaluation->hasSignals();       // true if signals detected
$evaluation->hasSignal('OFF_PLATFORM_INTENT');
$evaluation->signalCount();
$evaluation->isCriticalRisk();
$evaluation->isHighRisk();
$evaluation->getHttpStatusCode(); // 403 for block, 200 otherwise
$evaluation->getHttpHeaders();    // CIS response headers
```

## Error Handling

### Fail-Open Architecture

By default (`CIS_FAIL_OPEN=true`), the integration fails open:
- If CIS is unreachable, requests proceed normally
- Warning logged, `X-CIS-Unavailable: true` header added

Set `CIS_FAIL_OPEN=false` for fail-closed behavior (reject requests when CIS unavailable).

### Exception Handling

```php
use QwickServices\CIS\Exceptions\CISConnectionException;
use QwickServices\CIS\Exceptions\CISConfigurationException;

try {
    $evaluation = CIS::evaluate(...);
} catch (CISConnectionException $e) {
    // CIS backend unreachable
    Log::error('CIS connection failed', ['error' => $e->getMessage()]);
    // Fail open or return error
} catch (CISConfigurationException $e) {
    // Invalid configuration (missing secret, etc.)
    Log::error('CIS misconfigured', ['error' => $e->getMessage()]);
}
```

## Queue Configuration

### Worker Setup

Ensure queue workers are running:

```bash
php artisan queue:work redis --queue=cis-webhooks
```

### Supervisor Configuration

```ini
[program:laravel-cis-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/artisan queue:work redis --queue=cis-webhooks --sleep=3 --tries=3
autostart=true
autorestart=true
numprocs=2
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/laravel-cis-worker.log
```

## Performance Considerations

### Evaluate Endpoint Timeout

The evaluate endpoint is designed for <200ms response times. The default timeout is 200ms:

```env
CIS_EVALUATE_TIMEOUT=0.2
```

**Do not increase this timeout.** If evaluations consistently timeout, investigate CIS backend performance.

### Async Webhook Dispatch

For high-throughput applications, enable async mode:

```env
CIS_ASYNC=true
CIS_QUEUE_CONNECTION=redis
```

This dispatches webhooks via Laravel queue, preventing blocking on user requests.

### Retry Strategy

Default retry configuration:
- **3 attempts** with exponential backoff
- **1 second base delay** (1s, 2s, 4s)

Adjust based on your requirements:

```env
CIS_RETRY_ATTEMPTS=5
CIS_RETRY_DELAY_MS=2000
```

## Artisan Commands

The package provides several Artisan commands for testing and monitoring CIS integration.

### `cis:health`

Check CIS backend connectivity and health status.

```bash
php artisan cis:health
```

**Output:**
- Configuration summary
- Backend health status
- Connection test results
- Troubleshooting guidance

### `cis:test-webhook`

Send a test webhook to verify HMAC authentication and connectivity.

```bash
# Send default test webhook (booking.created)
php artisan cis:test-webhook

# Send specific event type
php artisan cis:test-webhook --type=payment.completed

# Specify user ID
php artisan cis:test-webhook --user-id=test-user-456
```

**Supported event types:**
- `booking.created`, `booking.cancelled`, `booking.completed`
- `payment.initiated`, `payment.completed`, `payment.failed`
- `chat.message_sent`
- `provider.registered`
- `rating.submitted`, `dispute.filed`

### `cis:evaluate`

Test the evaluate endpoint from the command line.

```bash
# Basic evaluation
php artisan cis:evaluate --user=123 --action=booking.create

# With counterparty and amount
php artisan cis:evaluate \
  --user=customer-123 \
  --action=payment.initiate \
  --counterparty=provider-456 \
  --amount=150.00
```

**Output:**
- Decision (allow/flag/block)
- Risk score and tier
- Detected signals
- Evaluation latency

### `cis:status`

Show overall CIS integration status and diagnostics.

```bash
php artisan cis:status
```

**Output:**
- Configuration check
- Backend health status
- Queue connection status
- Timeout settings
- Registered middleware
- Recent webhook activity
- Success rate metrics

## Event Subscriber

Auto-dispatch CIS webhooks when Laravel events fire.

### Setup

Enable auto-dispatch in `config/cis.php`:

```php
'auto_dispatch' => env('CIS_AUTO_DISPATCH', true),
```

Or in `.env`:

```env
CIS_AUTO_DISPATCH=true
```

The event subscriber will automatically listen for and forward these events:

- `App\Events\BookingCreated`, `BookingCancelled`, `BookingCompleted`, `BookingUpdated`
- `App\Events\PaymentInitiated`, `PaymentCompleted`, `PaymentFailed`
- `App\Events\MessageSent`, `MessageEdited`
- `App\Events\ProviderRegistered`, `ProviderVerified`, `ProviderProfileUpdated`
- `App\Events\RatingSubmitted`
- `App\Events\DisputeFiled`, `DisputeResolved`

### Custom Events

If your application uses different event names, you can manually register the subscriber or extend it:

```php
// In EventServiceProvider
use QwickServices\CIS\Listeners\CISEventSubscriber;

protected $subscribe = [
    CISEventSubscriber::class,
];
```

## Route Macros

Use fluent route macros for cleaner CIS middleware registration.

### Registration

Route macros are automatically registered by the service provider.

### Usage

```php
use Illuminate\Support\Facades\Route;

// Using cisBooking() macro
Route::post('/bookings', [BookingController::class, 'store'])
    ->cisBooking();

// Using cisPayment() macro
Route::post('/payments', [PaymentController::class, 'store'])
    ->cisPayment();

// Using cisEvaluate() macro
Route::post('/bookings', [BookingController::class, 'store'])
    ->cisEvaluate('booking');

Route::post('/payments', [PaymentController::class, 'store'])
    ->cisEvaluate('payment');
```

**Available macros:**
- `cisBooking()` — Add CISEvaluateBooking middleware
- `cisPayment()` — Add CISEvaluatePayment middleware
- `cisEvaluate(string $actionType)` — Generic evaluation middleware

## Middleware Groups

Register all CIS middleware at once using the helper class.

### In `app/Http/Kernel.php`:

```php
use QwickServices\CIS\Http\CISMiddlewareGroup;

protected $middlewareGroups = [
    'web' => [
        // ...
    ],
    'api' => [
        // ...
    ],
    'cis' => CISMiddlewareGroup::all(),
];
```

Or register middleware aliases:

```php
protected $middlewareAliases = [
    // ... existing aliases
    ...CISMiddlewareGroup::aliases(),
];
```

Then use in routes:

```php
Route::middleware('cis.evaluate.booking')->post('/bookings', [...]);
Route::middleware('cis.evaluate.payment')->post('/payments', [...]);
```

## Webhook Logging

Track webhook dispatches in the database for monitoring and debugging.

### Setup

Run the migration:

```bash
php artisan migrate
```

Or publish and customize:

```bash
php artisan vendor:publish --tag=cis-migrations
php artisan migrate
```

### Usage

Query webhook logs:

```php
use QwickServices\CIS\Models\CISWebhookLog;

// Get recent webhooks
$recent = CISWebhookLog::recent(50);

// Get failed webhooks
$failed = CISWebhookLog::failed(50);

// Get webhooks for specific event type
$bookingEvents = CISWebhookLog::forEventType('booking.created', 100);

// Get webhooks for specific user
$userEvents = CISWebhookLog::forUser('user-123', 50);

// Calculate success rate (last 24 hours)
$successRate = CISWebhookLog::successRate(24); // Returns percentage

// Average attempts for successful webhooks
$avgAttempts = CISWebhookLog::averageAttempts(24);
```

### Schema

The `cis_webhook_log` table tracks:
- Event type and idempotency key
- User ID
- Full payload (JSON)
- Response status and body
- Success/failure status
- Number of attempts
- Dispatch and completion timestamps
- Error messages

## Troubleshooting

### "CIS webhook secret is not configured"

**Cause:** `CIS_WEBHOOK_SECRET` is empty or missing.

**Solution:** Set `CIS_WEBHOOK_SECRET` in `.env` to match your CIS backend configuration.

### "Failed to connect to CIS backend"

**Cause:** CIS backend is not running or `CIS_BASE_URL` is incorrect.

**Solutions:**
1. Verify CIS backend is running: `curl http://localhost:3001/api/health`
2. Check `CIS_BASE_URL` in `.env`
3. Ensure network connectivity
4. Run `php artisan cis:health` for detailed diagnostics

### Webhooks not being sent

**Possible causes:**
1. **CIS disabled:** Check `CIS_ENABLED=true` in `.env`
2. **Queue not running:** Ensure `php artisan queue:work` is running
3. **Dispatch not called:** Verify dispatcher methods are being called

**Debug steps:**
1. Enable debug mode: `CIS_DEBUG=true`
2. Check logs: `tail -f storage/logs/laravel.log | grep CIS`
3. Test health check: `php artisan cis:health`
4. Test webhook: `php artisan cis:test-webhook`
5. Check webhook log table: `CISWebhookLog::recent(10)`

### Evaluation timeouts

**Cause:** CIS backend responding slowly (>200ms).

**Solutions:**
1. Optimize CIS backend performance
2. Scale CIS horizontally
3. Check database query performance in CIS
4. Run `php artisan cis:evaluate` to test latency

**Do not increase `CIS_EVALUATE_TIMEOUT` above 500ms** — this defeats the purpose of real-time evaluation.

### HMAC signature mismatch

**Cause:** `CIS_WEBHOOK_SECRET` doesn't match CIS backend configuration.

**Solution:** Ensure secrets match exactly. Check for:
- Leading/trailing whitespace
- Different secrets in different environments
- Secrets containing special characters (ensure proper escaping)

**Test:** Run `php artisan cis:test-webhook` to verify authentication.

### 503 errors in fail-closed mode

**Cause:** CIS backend unreachable and `CIS_FAIL_OPEN=false`.

**Solution:**
1. Fix CIS connectivity issue
2. Switch to fail-open mode temporarily: `CIS_FAIL_OPEN=true`
3. Run `php artisan cis:status` to diagnose

## Testing

### Using CISFake

The package provides a dedicated test fake for easy testing without mocking.

#### Basic Usage

```php
use QwickServices\CIS\Facades\CIS;
use Tests\TestCase;

class BookingTest extends TestCase
{
    public function test_booking_is_allowed()
    {
        $fake = CIS::fake();
        $fake->fakeAllow();

        // Perform booking action
        $response = $this->post('/bookings', [
            'user_id' => 123,
            'provider_id' => 456,
            'amount' => 150.00,
        ]);

        $response->assertSuccessful();

        // Assert evaluation was performed
        $fake->assertEvaluated('booking.create');
    }

    public function test_booking_is_blocked()
    {
        $fake = CIS::fake();
        $fake->fakeBlock('High risk user');

        $response = $this->post('/bookings', [
            'user_id' => 123,
            'provider_id' => 456,
        ]);

        $response->assertStatus(403);
        $fake->assertEvaluated('booking.create');
    }

    public function test_booking_is_flagged()
    {
        $fake = CIS::fake();
        $fake->fakeFlag('Suspicious pattern', ['RAPID_BOOKING']);

        $response = $this->post('/bookings', [
            'user_id' => 123,
            'provider_id' => 456,
        ]);

        $response->assertSuccessful();
        $response->assertHeader('X-CIS-Flagged', 'true');
        $fake->assertEvaluated('booking.create');
    }
}
```

#### Webhook Testing

```php
public function test_webhook_sent_on_booking_creation()
{
    $fake = CIS::fake();
    $fake->fakeAllow();

    // Create booking
    $booking = Booking::create([...]);

    // Manually dispatch (or use observer/event)
    app(CISEventDispatcher::class)->dispatchBookingCreated($booking);

    // Assert webhook was sent
    $fake->assertWebhookSent('booking.created');

    // Assert with payload verification
    $fake->assertWebhookSent('booking.created', function ($payload) use ($booking) {
        return $payload['booking_id'] === $booking->id;
    });
}

public function test_multiple_webhooks()
{
    $fake = CIS::fake();

    // Dispatch multiple events
    app(CISEventDispatcher::class)->dispatchBookingCreated($booking);
    app(CISEventDispatcher::class)->dispatchPaymentCompleted($payment);

    // Assert both webhooks sent
    $fake->assertWebhookSent('booking.created');
    $fake->assertWebhookSent('payment.completed');

    // Assert specific webhook not sent
    $fake->assertWebhookNotSent('booking.cancelled');
}
```

#### Custom Responses

```php
public function test_custom_evaluation_response()
{
    $fake = CIS::fake();

    $fake->fakeEvaluateResponse(
        decision: 'flag',
        score: 65,
        tier: 'medium',
        reason: 'Multiple signals detected',
        signals: ['RAPID_BOOKING', 'OFF_PLATFORM_INTENT'],
        enforcementId: 'enforcement-uuid-123',
    );

    $evaluation = CIS::evaluate(
        actionType: 'booking.create',
        userId: '123',
    );

    $this->assertEquals('flag', $evaluation->decision);
    $this->assertEquals(65, $evaluation->riskScore);
    $this->assertTrue($evaluation->hasSignal('RAPID_BOOKING'));
}
```

#### Multiple Responses (Queue)

```php
public function test_multiple_evaluations()
{
    $fake = CIS::fake();

    // Queue multiple responses
    $fake->fakeAllow('First evaluation');
    $fake->fakeFlag('Second evaluation');
    $fake->fakeBlock('Third evaluation');

    // Each evaluation consumes one queued response
    $eval1 = CIS::evaluate('booking.create', 'user-1');
    $this->assertTrue($eval1->isAllowed());

    $eval2 = CIS::evaluate('booking.create', 'user-2');
    $this->assertTrue($eval2->isFlagged());

    $eval3 = CIS::evaluate('booking.create', 'user-3');
    $this->assertTrue($eval3->isBlocked());
}
```

#### Assertions

**Available assertions:**
- `assertWebhookSent(string $eventType, ?callable $callback = null)` — Assert webhook sent
- `assertWebhookNotSent(string $eventType)` — Assert webhook not sent
- `assertEvaluated(string $actionType, ?string $userId = null)` — Assert evaluation performed
- `assertNotEvaluated()` — Assert no evaluations performed
- `assertNothingSent()` — Assert no webhooks sent

**Inspection methods:**
- `getSentWebhooks()` — Get all sent webhooks
- `getSentWebhooksOfType(string $eventType)` — Get webhooks of specific type
- `getEvaluations()` — Get all performed evaluations
- `webhookCount()` — Count sent webhooks
- `evaluationCount()` — Count performed evaluations

**Reset:**
```php
$fake->reset(); // Clear all recorded webhooks and evaluations
```

### Traditional Mocking

If you prefer mocking with Mockery:

```php
use QwickServices\CIS\CISClient;
use QwickServices\CIS\DTOs\EvaluateResponse;

public function test_booking_evaluation()
{
    $mockClient = Mockery::mock(CISClient::class);
    $this->app->instance(CISClient::class, $mockClient);

    $mockEvaluation = new EvaluateResponse(
        decision: 'allow',
        riskScore: 10,
        riskTier: 'low',
        reason: 'No risk detected',
        signals: [],
        evaluationTimeMs: 45.0,
    );

    $mockClient->shouldReceive('evaluate')
        ->once()
        ->with('booking.create', '123', '456', Mockery::any())
        ->andReturn($mockEvaluation);

    // Test your code
}
```

### Integration Testing

Test against a local CIS instance:

```php
/** @test */
public function test_real_cis_integration()
{
    if (!app(CISClient::class)->healthCheck()) {
        $this->markTestSkipped('CIS backend not available');
    }

    $evaluation = CIS::evaluate(
        actionType: 'booking.create',
        userId: 'test-user-123',
        counterpartyId: 'test-provider-456',
        metadata: ['test' => true],
    );

    $this->assertInstanceOf(EvaluateResponse::class, $evaluation);
    $this->assertContains($evaluation->decision, ['allow', 'flag', 'block']);
}
```

### Test Environment Configuration

In `phpunit.xml` or `.env.testing`:

```xml
<php>
    <env name="CIS_ENABLED" value="false"/>
    <!-- Or use a test CIS instance -->
    <env name="CIS_BASE_URL" value="http://localhost:3001"/>
    <env name="CIS_WEBHOOK_SECRET" value="test-secret"/>
    <env name="CIS_ASYNC" value="false"/>
    <env name="CIS_FAIL_OPEN" value="true"/>
</php>
```

## Security Considerations

1. **Protect webhook secret:** Never commit `CIS_WEBHOOK_SECRET` to version control
2. **Use HTTPS in production:** Set `CIS_BASE_URL=https://cis.yourdomain.com`
3. **Rotate secrets periodically:** Update both Laravel and CIS backend simultaneously
4. **Monitor failed authentications:** Watch for signature mismatch errors (potential attacks)
5. **Rate limit evaluation endpoints:** Prevent abuse of pre-transaction evaluation

## Production Deployment Checklist

- [ ] `CIS_BASE_URL` points to production CIS backend
- [ ] `CIS_WEBHOOK_SECRET` is set and matches CIS backend
- [ ] `CIS_ENABLED=true`
- [ ] `CIS_ASYNC=true` for high-throughput environments
- [ ] Queue workers running with supervisor
- [ ] `CIS_FAIL_OPEN=true` (recommended) or `false` (high-security)
- [ ] `CIS_DEBUG=false` in production
- [ ] HTTPS enabled for CIS backend
- [ ] Monitoring configured for CIS health checks
- [ ] Log aggregation configured for CIS events

## License

MIT

## Support

For issues or questions, contact dev@qwickservices.com or open an issue in the repository.
