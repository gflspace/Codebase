# QwickServices CIS Laravel Integration — Package Summary

## Overview

Complete Laravel integration package for the QwickServices Contact Integrity System (CIS). Provides production-grade pre-transaction evaluation and event streaming with HMAC authentication, fail-open architecture, and queue-based async dispatch.

**Version:** 1.0.0
**License:** MIT
**PHP:** ^8.1
**Laravel:** ^10.0 | ^11.0

## Quick Stats

- **13 PHP classes** organized in 7 namespaces
- **2 middleware** for booking and payment evaluation
- **1 queueable job** for async webhook dispatch
- **2 DTOs** for type-safe responses
- **1 trait** for model-level evaluation
- **1 facade** for convenient access
- **3 exceptions** for error handling
- **Fully typed** with PHP 8.1+ strict types
- **Zero external dependencies** beyond Laravel + Guzzle

## Core Features

### 1. Pre-Transaction Evaluation (<200ms)
Real-time risk assessment before bookings, payments, or other high-value actions.

```php
$evaluation = CIS::evaluate('booking.create', $userId, $providerId, $metadata);

if ($evaluation->isBlocked()) {
    return response()->json(['error' => $evaluation->reason], 403);
}
```

**Returns:**
- Decision: allow | flag | block
- Risk score: 0-100
- Risk tier: low | medium | high | critical
- Detected signals
- Enforcement ID (if action created)
- Latency in milliseconds

### 2. Async Webhook Dispatch
Queue-based event streaming to CIS for signal detection.

```php
$dispatcher->dispatchBookingCreated($booking);
$dispatcher->dispatchPaymentCompleted($payment);
$dispatcher->dispatchMessageSent($message);
```

**Supported Events:**
- Booking lifecycle (created, updated, cancelled, completed)
- Payment lifecycle (initiated, completed, failed)
- Messages (sent, edited)
- Providers (registered, verified, profile updated)
- Ratings (submitted)
- Disputes (filed, resolved)
- Contact field changes

### 3. HMAC Authentication
Secure request signing with replay attack protection.

```
X-CIS-Signature: sha256=<hex_digest>
X-CIS-Timestamp: <unix_ms>
X-CIS-Source: qwickservices
X-CIS-Idempotency-Key: <uuid>

Signature = HMAC-SHA256(timestamp + "." + body, webhook_secret)
```

### 4. Fail-Open Architecture
Graceful degradation when CIS is unavailable.

```php
config(['cis.fail_open' => true]);

// If CIS unreachable, request proceeds with X-CIS-Unavailable header
```

## Integration Patterns

### Pattern 1: Middleware (Recommended)

```php
Route::post('/bookings', [BookingController::class, 'store'])
    ->middleware(CISEvaluateBooking::class);
```

**Pros:**
- Zero code changes in controller
- Automatic evaluation before request processing
- Consistent across all routes

**Cons:**
- Less control over decision handling

### Pattern 2: Manual Evaluation

```php
$evaluation = CIS::evaluate('booking.create', $userId, $providerId, $metadata);

if ($evaluation->isBlocked()) {
    // Custom logic for blocked requests
}
```

**Pros:**
- Full control over evaluation logic
- Custom response formatting
- Can add conditional logic

**Cons:**
- More boilerplate code

### Pattern 3: Model Trait

```php
class Booking extends Model
{
    use HasCISEvaluation;
}

$evaluation = $booking->evaluateWithCIS('booking.create');
```

**Pros:**
- Encapsulated in model
- Easy to reuse
- Clean controller code

**Cons:**
- Requires trait on every model

## Configuration Summary

```env
# Required
CIS_ENABLED=true
CIS_BASE_URL=http://localhost:3001
CIS_WEBHOOK_SECRET=your-secret-here

# Timeouts (seconds)
CIS_EVALUATE_TIMEOUT=0.2
CIS_WEBHOOK_TIMEOUT=5.0
CIS_HEALTH_TIMEOUT=2.0

# Queue
CIS_ASYNC=true
CIS_QUEUE_CONNECTION=redis
CIS_QUEUE_NAME=cis-webhooks

# Retry
CIS_RETRY_ATTEMPTS=3
CIS_RETRY_DELAY_MS=1000

# Behavior
CIS_FAIL_OPEN=true
CIS_DEBUG=false
```

## API Reference

### CISClient

```php
class CISClient
{
    public function sendWebhook(string $eventType, array $payload): CISResponse;

    public function evaluate(
        string $actionType,
        string $userId,
        ?string $counterpartyId,
        array $metadata
    ): EvaluateResponse;

    public function healthCheck(): bool;
}
```

### CIS Facade

```php
use QwickServices\CIS\Facades\CIS;

CIS::evaluate(...);
CIS::sendWebhook(...);
CIS::healthCheck();
```

### EvaluateResponse

```php
readonly class EvaluateResponse
{
    public string $decision;
    public int $riskScore;
    public string $riskTier;
    public string $reason;
    public array $signals;
    public ?string $enforcementId;
    public float $evaluationTimeMs;

    public function isAllowed(): bool;
    public function isFlagged(): bool;
    public function isBlocked(): bool;
    public function hasSignal(string $signalType): bool;
    public function isCriticalRisk(): bool;
    public function getHttpHeaders(): array;
}
```

### CISEventDispatcher

```php
class CISEventDispatcher
{
    public function dispatchBookingCreated(object $booking): void;
    public function dispatchBookingCancelled(object $booking): void;
    public function dispatchBookingCompleted(object $booking): void;
    public function dispatchPaymentInitiated(object $payment): void;
    public function dispatchPaymentCompleted(object $payment): void;
    public function dispatchPaymentFailed(object $payment): void;
    public function dispatchMessageSent(object $message): void;
    public function dispatchProviderRegistered(object $provider): void;
    public function dispatchProviderVerified(object $provider): void;
    public function dispatchRatingSubmitted(object $rating): void;
    public function dispatchDisputeFiled(object $dispute): void;
    public function dispatchDisputeResolved(object $dispute): void;
    public function dispatchContactFieldChanged(
        object $user,
        string $field,
        mixed $oldValue,
        mixed $newValue
    ): void;
}
```

### HasCISEvaluation Trait

```php
trait HasCISEvaluation
{
    public function evaluateWithCIS(
        string $actionType,
        array $metadata = []
    ): EvaluateResponse;

    protected function getUserIdForCIS(): string;
    protected function getCounterpartyIdForCIS(): ?string;
    protected function getMetadataForCIS(): array;
}
```

## File Structure

```
src/laravel-integration/
├── composer.json
├── README.md (complete docs)
├── QUICKSTART.md (5-min guide)
├── STRUCTURE.md (architecture)
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
├── .env.example
│
├── config/
│   └── cis.php
│
├── src/
│   ├── CISClient.php
│   ├── CISServiceProvider.php
│   ├── DTOs/
│   │   ├── CISResponse.php
│   │   └── EvaluateResponse.php
│   ├── Events/
│   │   └── CISEventDispatcher.php
│   ├── Exceptions/
│   │   ├── CISException.php
│   │   ├── CISConfigurationException.php
│   │   └── CISConnectionException.php
│   ├── Facades/
│   │   └── CIS.php
│   ├── Jobs/
│   │   └── DispatchCISWebhook.php
│   ├── Middleware/
│   │   ├── CISEvaluateBooking.php
│   │   └── CISEvaluatePayment.php
│   └── Traits/
│       └── HasCISEvaluation.php
│
└── examples/
    ├── BookingController.php
    ├── BookingModel.php
    ├── BookingObserver.php
    ├── CISIntegrationTest.php
    └── add_cis_fields_to_bookings_migration.php
```

## Installation (5 Steps)

```bash
# 1. Add to composer autoload
# Edit composer.json, add to autoload.psr-4

# 2. Dump autoload
composer dump-autoload

# 3. Publish config
php artisan vendor:publish --tag=cis-config

# 4. Configure .env
# Add CIS_* variables

# 5. Test connection
php artisan tinker
>>> CIS::healthCheck();
=> true
```

## Testing

```php
// Mock in tests
$mockClient = Mockery::mock(CISClient::class);
$this->app->instance(CISClient::class, $mockClient);

$mockEvaluation = new EvaluateResponse(
    decision: 'allow',
    riskScore: 10,
    riskTier: 'low',
    reason: 'Low risk',
    signals: [],
    evaluationTimeMs: 45.0
);

$mockClient->shouldReceive('evaluate')->andReturn($mockEvaluation);
```

## Production Checklist

- [ ] `CIS_WEBHOOK_SECRET` set and matches backend
- [ ] `CIS_BASE_URL` points to production (HTTPS)
- [ ] Queue workers running with supervisor
- [ ] `CIS_ASYNC=true`
- [ ] `CIS_DEBUG=false`
- [ ] `CIS_FAIL_OPEN=true` (recommended)
- [ ] Health check monitoring configured
- [ ] Log aggregation configured

## Performance Characteristics

- **Evaluation latency:** <200ms (P99)
- **Webhook dispatch:** Async via queue (non-blocking)
- **Retry strategy:** 3 attempts with exponential backoff
- **Timeout handling:** Configurable per endpoint
- **Connection pooling:** HTTP client reused via singleton
- **Memory footprint:** Minimal (DTOs are readonly)

## Security Features

- HMAC-SHA256 request signing
- Millisecond timestamp validation
- 5-minute replay attack window
- UUID idempotency keys
- Secure secret management (env vars)
- HTTPS recommended for production

## Error Handling

```php
try {
    $evaluation = CIS::evaluate(...);
} catch (CISConnectionException $e) {
    // CIS backend unreachable
    Log::error('CIS unavailable', ['error' => $e->getMessage()]);

    if (config('cis.fail_open')) {
        // Proceed with caution
    } else {
        return response()->json(['error' => 'Service unavailable'], 503);
    }
} catch (CISConfigurationException $e) {
    // Invalid configuration
    Log::error('CIS misconfigured', ['error' => $e->getMessage()]);
}
```

## Monitoring & Observability

### Logs
- Debug: Verbose logging when `CIS_DEBUG=true`
- Info: Successful evaluations and webhooks
- Warning: Fail-open scenarios, retry attempts
- Error: Connection failures, configuration errors

### Recommended Metrics
- CIS evaluation latency (P50, P95, P99)
- Webhook dispatch success rate
- Queue depth for `cis-webhooks`
- Fail-open occurrence rate
- CIS backend health check status

### Health Checks
```php
// Add to monitoring
if (!CIS::healthCheck()) {
    alert('CIS backend unhealthy');
}
```

## Dependencies

```json
{
    "php": "^8.1",
    "guzzlehttp/guzzle": "^7.5",
    "illuminate/support": "^10.0|^11.0",
    "illuminate/http": "^10.0|^11.0",
    "illuminate/contracts": "^10.0|^11.0"
}
```

## Roadmap

### v1.1
- Rate limiting integration
- Metrics collection
- Advanced retry strategies (jitter, circuit breaker)

### v1.2
- Laravel Nova widgets
- Batch evaluation support
- Prometheus exporter

### v2.0
- Webhook receiver (for callbacks from CIS)
- Real-time WebSocket integration
- GraphQL support

## Support

- **Documentation:** [README.md](README.md)
- **Quick Start:** [QUICKSTART.md](QUICKSTART.md)
- **Examples:** `examples/` directory
- **Issues:** GitHub Issues
- **Email:** dev@qwickservices.com

## License

MIT License - see [LICENSE](LICENSE) file.

## Credits

Built with ❤️ by the QwickServices team for the Contact Integrity System (CIS).
