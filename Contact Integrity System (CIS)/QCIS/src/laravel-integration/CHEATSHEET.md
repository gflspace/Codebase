# CIS Laravel Integration Cheat Sheet

Quick reference for common CIS operations.

## Artisan Commands

```bash
# Check CIS health and connectivity
php artisan cis:health

# Send test webhook
php artisan cis:test-webhook
php artisan cis:test-webhook --type=payment.completed

# Test evaluate endpoint
php artisan cis:evaluate --user=123 --action=booking.create
php artisan cis:evaluate --user=123 --action=payment.initiate --amount=150

# Show integration status
php artisan cis:status
```

## Environment Variables

```env
CIS_ENABLED=true
CIS_BASE_URL=http://localhost:3001
CIS_WEBHOOK_SECRET=your-secret-here
CIS_ASYNC=true
CIS_FAIL_OPEN=true
CIS_DEBUG=false
CIS_QUEUE_CONNECTION=redis
CIS_QUEUE_NAME=cis-webhooks
```

## Route Middleware

```php
// Using middleware class
Route::post('/bookings', [BookingController::class, 'store'])
    ->middleware(CISEvaluateBooking::class);

// Using route macros
Route::post('/bookings', [...])->cisBooking();
Route::post('/payments', [...])->cisPayment();
Route::post('/action', [...])->cisEvaluate('booking');
```

## Facade Usage

```php
use QwickServices\CIS\Facades\CIS;

// Evaluate action
$evaluation = CIS::evaluate(
    actionType: 'booking.create',
    userId: '123',
    counterpartyId: '456',
    metadata: ['amount' => 150.00]
);

// Send webhook
CIS::sendWebhook('booking.created', [
    'booking_id' => $booking->id,
    'user_id' => $booking->user_id,
]);

// Health check
if (CIS::healthCheck()) {
    // CIS is healthy
}
```

## Evaluation Response

```php
// Decision checks
$evaluation->isAllowed();   // true if "allow"
$evaluation->isFlagged();   // true if "flag"
$evaluation->isBlocked();   // true if "block"

// Risk checks
$evaluation->isHighRisk();     // true if high/critical
$evaluation->isCriticalRisk(); // true if critical

// Signal checks
$evaluation->hasSignals();
$evaluation->hasSignal('OFF_PLATFORM_INTENT');
$evaluation->signalCount();

// Response data
$evaluation->decision;          // "allow", "flag", "block"
$evaluation->riskScore;         // 0-100
$evaluation->riskTier;          // "low", "medium", "high", "critical"
$evaluation->reason;            // Human-readable reason
$evaluation->signals;           // Array of signal types
$evaluation->enforcementId;     // UUID if action created
$evaluation->evaluationTimeMs;  // Latency in ms
```

## Event Dispatcher

```php
use QwickServices\CIS\Events\CISEventDispatcher;

$dispatcher = app(CISEventDispatcher::class);

// Booking events
$dispatcher->dispatchBookingCreated($booking);
$dispatcher->dispatchBookingCancelled($booking);
$dispatcher->dispatchBookingCompleted($booking);
$dispatcher->dispatchBookingUpdated($booking);

// Payment events
$dispatcher->dispatchPaymentInitiated($payment);
$dispatcher->dispatchPaymentCompleted($payment);
$dispatcher->dispatchPaymentFailed($payment);

// Message events
$dispatcher->dispatchMessageSent($message);
$dispatcher->dispatchMessageEdited($message);

// Provider events
$dispatcher->dispatchProviderRegistered($provider);
$dispatcher->dispatchProviderVerified($provider);
$dispatcher->dispatchProviderProfileUpdated($provider);

// Other events
$dispatcher->dispatchRatingSubmitted($rating);
$dispatcher->dispatchDisputeFiled($dispute);
$dispatcher->dispatchDisputeResolved($dispute);
$dispatcher->dispatchContactFieldChanged($user, 'email', $old, $new);
```

## Testing with CISFake

```php
use QwickServices\CIS\Facades\CIS;

// Setup fake
$fake = CIS::fake();

// Queue responses
$fake->fakeAllow();
$fake->fakeFlag('Suspicious pattern', ['RAPID_BOOKING']);
$fake->fakeBlock('High risk user');

// Custom response
$fake->fakeEvaluateResponse(
    decision: 'flag',
    score: 65,
    tier: 'medium',
    reason: 'Multiple signals',
    signals: ['SIGNAL_1', 'SIGNAL_2']
);

// Assertions
$fake->assertWebhookSent('booking.created');
$fake->assertWebhookSent('booking.created', fn($p) => $p['user_id'] === '123');
$fake->assertWebhookNotSent('booking.cancelled');
$fake->assertEvaluated('booking.create');
$fake->assertEvaluated('booking.create', 'user-123');
$fake->assertNotEvaluated();
$fake->assertNothingSent();

// Inspection
$fake->getSentWebhooks();
$fake->getSentWebhooksOfType('booking.created');
$fake->getEvaluations();
$fake->webhookCount();
$fake->evaluationCount();

// Reset
$fake->reset();
```

## Webhook Logging

```php
use QwickServices\CIS\Models\CISWebhookLog;

// Recent webhooks
CISWebhookLog::recent(50);

// Failed webhooks
CISWebhookLog::failed(50);

// By event type
CISWebhookLog::forEventType('booking.created', 100);

// By user
CISWebhookLog::forUser('user-123', 50);

// Metrics
CISWebhookLog::successRate(24);      // Last 24 hours (%)
CISWebhookLog::averageAttempts(24);  // Avg attempts

// Query builder
CISWebhookLog::where('event_type', 'booking.created')
    ->where('success', false)
    ->orderBy('dispatched_at', 'desc')
    ->get();
```

## Model Observer Pattern

```php
namespace App\Observers;

use QwickServices\CIS\Events\CISEventDispatcher;

class BookingObserver
{
    public function __construct(
        private CISEventDispatcher $dispatcher
    ) {}

    public function created(Booking $booking): void
    {
        $this->dispatcher->dispatchBookingCreated($booking);
    }
}

// Register in EventServiceProvider
Booking::observe(BookingObserver::class);
```

## Middleware Group Registration

```php
// app/Http/Kernel.php
use QwickServices\CIS\Http\CISMiddlewareGroup;

protected $middlewareAliases = [
    ...CISMiddlewareGroup::aliases(),
];

// Then in routes
Route::middleware('cis.evaluate.booking')->post('/bookings', [...]);
```

## Common Patterns

### Evaluate + Store Result

```php
$evaluation = CIS::evaluate('booking.create', $userId, $providerId);

if ($evaluation->isBlocked()) {
    abort(403, $evaluation->reason);
}

$booking = Booking::create([
    // ... booking data
    'cis_flagged' => $evaluation->isFlagged(),
    'cis_risk_score' => $evaluation->riskScore,
    'cis_risk_tier' => $evaluation->riskTier,
    'cis_signals' => $evaluation->signals,
]);
```

### Async Webhook Dispatch

```php
// CIS_ASYNC=true in .env
$dispatcher->dispatchBookingCreated($booking);
// Returns immediately, webhook sent via queue
```

### Sync Webhook Dispatch

```php
// CIS_ASYNC=false in .env
$dispatcher->dispatchBookingCreated($booking);
// Waits for webhook response
```

### Handle Flagged Bookings

```php
if ($evaluation->isFlagged()) {
    // Log for review
    Log::warning('Flagged booking', [
        'booking_id' => $booking->id,
        'risk_score' => $evaluation->riskScore,
        'signals' => $evaluation->signals,
    ]);

    // Notify admin
    NotifyRiskTeam::dispatch($booking, $evaluation);

    // Add extra monitoring
    $booking->update(['requires_manual_review' => true]);
}
```

## Troubleshooting Quick Fixes

```bash
# Connection issues
php artisan cis:health

# Queue not processing
sudo supervisorctl restart laravel-cis-worker:*

# Check webhook logs
php artisan tinker
>>> CISWebhookLog::failed(10);

# Clear failed jobs
php artisan queue:flush

# Test HMAC auth
php artisan cis:test-webhook

# Enable debug logging
# Set CIS_DEBUG=true in .env
php artisan config:clear
```

## Event Types Reference

**Bookings:**
- `booking.created`
- `booking.updated`
- `booking.cancelled`
- `booking.completed`

**Payments:**
- `payment.initiated`
- `payment.completed`
- `payment.failed`

**Messages:**
- `chat.message_sent`
- `chat.message_edited`

**Providers:**
- `provider.registered`
- `provider.verified`
- `provider.profile_updated`

**Other:**
- `rating.submitted`
- `dispute.filed`
- `dispute.resolved`
- `contact.field_changed`

## Action Types Reference

- `booking.create`
- `payment.initiate`
- `provider.register`
- `message.send`
- `review.submit`

## Response Headers

When using evaluation middleware, CIS adds these headers:

```
X-CIS-Decision: allow|flag|block
X-CIS-Score: 42
X-CIS-Tier: medium
X-CIS-Flagged: true|false
```

Access in controller:

```php
$flagged = $request->header('X-CIS-Flagged') === 'true';
$score = (int) $request->header('X-CIS-Score', 0);
```
