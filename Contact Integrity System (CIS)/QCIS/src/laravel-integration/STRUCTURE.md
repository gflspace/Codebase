# Package Structure

Complete file structure and organization of the CIS Laravel Integration package.

```
src/laravel-integration/
├── .env.example                    # Environment variables example
├── CHANGELOG.md                    # Version history and changes
├── CONTRIBUTING.md                 # Contribution guidelines
├── LICENSE                         # MIT License
├── README.md                       # Complete documentation
├── QUICKSTART.md                   # 5-minute quick start guide
├── STRUCTURE.md                    # This file
├── composer.json                   # Package metadata and dependencies
│
├── config/
│   └── cis.php                     # Laravel configuration file
│
├── src/                            # Main source code
│   ├── CISClient.php               # Core HTTP client with HMAC auth
│   ├── CISServiceProvider.php     # Laravel service provider
│   │
│   ├── DTOs/                       # Data Transfer Objects
│   │   ├── CISResponse.php         # Webhook response VO
│   │   └── EvaluateResponse.php    # Evaluation response VO
│   │
│   ├── Events/
│   │   └── CISEventDispatcher.php  # Event dispatcher for webhooks
│   │
│   ├── Exceptions/
│   │   ├── CISException.php        # Base exception
│   │   ├── CISConfigurationException.php
│   │   └── CISConnectionException.php
│   │
│   ├── Facades/
│   │   └── CIS.php                 # Laravel facade
│   │
│   ├── Jobs/
│   │   └── DispatchCISWebhook.php  # Queueable webhook job
│   │
│   ├── Middleware/
│   │   ├── CISEvaluateBooking.php  # Booking evaluation middleware
│   │   └── CISEvaluatePayment.php  # Payment evaluation middleware
│   │
│   └── Traits/
│       └── HasCISEvaluation.php    # Model trait for evaluation
│
└── examples/                       # Usage examples
    ├── BookingController.php       # Example controller
    ├── BookingModel.php            # Example model with trait
    ├── BookingObserver.php         # Example observer
    ├── CISIntegrationTest.php      # Example tests
    └── add_cis_fields_to_bookings_migration.php
```

## File Descriptions

### Core Files

#### `src/CISClient.php`
**Purpose:** Core HTTP client for CIS backend communication.

**Responsibilities:**
- HMAC-SHA256 request signing
- HTTP request/response handling
- Retry logic with exponential backoff
- Timeout management
- Error handling

**Key Methods:**
- `sendWebhook(string $eventType, array $payload): CISResponse`
- `evaluate(string $actionType, string $userId, ?string $counterpartyId, array $metadata): EvaluateResponse`
- `healthCheck(): bool`

#### `src/CISServiceProvider.php`
**Purpose:** Laravel service provider for package registration.

**Responsibilities:**
- Register CISClient as singleton
- Merge package configuration
- Publish configuration file
- Register facade alias

### DTOs (Data Transfer Objects)

#### `src/DTOs/CISResponse.php`
**Purpose:** Immutable value object for webhook responses.

**Properties:**
- `bool $success` - Request success status
- `int $statusCode` - HTTP status code
- `array $body` - Response body
- `?string $error` - Error message

**Methods:**
- `isSuccessful(): bool`
- `isClientError(): bool`
- `isServerError(): bool`
- `get(string $key, mixed $default): mixed`

#### `src/DTOs/EvaluateResponse.php`
**Purpose:** Immutable value object for evaluation responses.

**Properties:**
- `string $decision` - "allow", "flag", or "block"
- `int $riskScore` - 0-100
- `string $riskTier` - "low", "medium", "high", "critical"
- `string $reason` - Human-readable explanation
- `array $signals` - Detected signal types
- `?string $enforcementId` - UUID if action created
- `float $evaluationTimeMs` - Evaluation latency

**Methods:**
- `isAllowed(): bool`
- `isFlagged(): bool`
- `isBlocked(): bool`
- `hasSignal(string $signalType): bool`
- `isCriticalRisk(): bool`
- `getHttpHeaders(): array`

### Events

#### `src/Events/CISEventDispatcher.php`
**Purpose:** Dispatch CIS webhook events for Laravel models.

**Key Methods:**
- `dispatchBookingCreated(object $booking): void`
- `dispatchBookingCancelled(object $booking): void`
- `dispatchPaymentInitiated(object $payment): void`
- `dispatchPaymentCompleted(object $payment): void`
- `dispatchMessageSent(object $message): void`
- `dispatchProviderRegistered(object $provider): void`
- `dispatchRatingSubmitted(object $rating): void`
- `dispatchDisputeFiled(object $dispute): void`
- `dispatchContactFieldChanged(object $user, string $field, $oldValue, $newValue): void`

**Behavior:**
- Respects `cis.enabled` config
- Uses queue if `cis.async` is true
- Falls back to sync dispatch if queue unavailable

### Exceptions

#### `src/Exceptions/CISException.php`
Base exception for all CIS-related errors.

#### `src/Exceptions/CISConfigurationException.php`
Thrown when configuration is invalid (missing secret, invalid URL, etc.).

#### `src/Exceptions/CISConnectionException.php`
Thrown when unable to connect to CIS backend.

### Facades

#### `src/Facades/CIS.php`
**Purpose:** Laravel facade for convenient CIS access.

**Usage:**
```php
use QwickServices\CIS\Facades\CIS;

$evaluation = CIS::evaluate(...);
$response = CIS::sendWebhook(...);
$healthy = CIS::healthCheck();
```

### Jobs

#### `src/Jobs/DispatchCISWebhook.php`
**Purpose:** Queueable job for async webhook dispatch.

**Features:**
- Implements `ShouldQueue`
- Configurable retry attempts
- Exponential backoff
- Error logging
- Job tagging for monitoring

**Configuration:**
- Uses `cis.queue.connection` for queue driver
- Uses `cis.queue.name` for queue name
- Respects `cis.retry.*` configuration

### Middleware

#### `src/Middleware/CISEvaluateBooking.php`
**Purpose:** Evaluate booking requests before processing.

**Behavior:**
- Extracts user_id, provider_id, metadata from request
- Calls `CISClient::evaluate('booking.create', ...)`
- Returns 403 if blocked
- Adds headers if flagged
- Proceeds normally if allowed
- Fails open if CIS unavailable (configurable)

**Response Headers:**
- `X-CIS-Decision`
- `X-CIS-Score`
- `X-CIS-Tier`
- `X-CIS-Flagged`
- `X-CIS-Unavailable` (if fail-open)

#### `src/Middleware/CISEvaluatePayment.php`
**Purpose:** Evaluate payment requests before processing.

Same behavior as `CISEvaluateBooking`, but for `payment.initiate` action type.

### Traits

#### `src/Traits/HasCISEvaluation.php`
**Purpose:** Add CIS evaluation capability to models.

**Usage:**
```php
class Booking extends Model
{
    use HasCISEvaluation;
}

$evaluation = $booking->evaluateWithCIS('booking.create');
```

**Methods:**
- `evaluateWithCIS(string $actionType, array $metadata): EvaluateResponse`
- `getUserIdForCIS(): string` (protected, override to customize)
- `getCounterpartyIdForCIS(): ?string` (protected, override to customize)
- `getMetadataForCIS(): array` (protected, override to customize)

### Configuration

#### `config/cis.php`
**Purpose:** Package configuration with environment variable bindings.

**Key Settings:**
- `base_url` - CIS backend URL
- `webhook_secret` - HMAC shared secret
- `enabled` - Master enable/disable switch
- `timeout.*` - Timeouts per endpoint type
- `async` - Use queue for webhooks
- `queue.*` - Queue configuration
- `retry.*` - Retry strategy
- `fail_open` - Fail-open vs fail-closed
- `debug` - Debug logging

### Examples

#### `examples/BookingController.php`
Demonstrates three integration patterns:
1. Using middleware for automatic evaluation
2. Manual evaluation with full control
3. Using model trait for evaluation

#### `examples/BookingModel.php`
Example model with:
- `HasCISEvaluation` trait
- Custom metadata generation
- CIS tracking fields

#### `examples/BookingObserver.php`
Automatic webhook dispatch via Eloquent observers.

#### `examples/CISIntegrationTest.php`
Comprehensive test examples:
- Mocking CIS client
- Testing allowed/blocked/flagged decisions
- Fail-open behavior
- Health checks
- Async/sync webhook dispatch
- Model trait usage

#### `examples/add_cis_fields_to_bookings_migration.php`
Database migration for CIS tracking fields:
- `cis_risk_score` (0-100)
- `cis_risk_tier` (low/medium/high/critical)
- `cis_enforcement_id` (UUID)

## Dependency Graph

```
CISServiceProvider
    ├─> CISClient (singleton)
    └─> Config (cis.php)

CIS Facade
    └─> CISClient

CISClient
    ├─> Guzzle HTTP Client
    ├─> EvaluateResponse (creates)
    ├─> CISResponse (creates)
    └─> Exceptions (throws)

CISEvaluateBooking Middleware
    └─> CISClient

CISEvaluatePayment Middleware
    └─> CISClient

CISEventDispatcher
    ├─> CISClient (sync mode)
    └─> DispatchCISWebhook Job (async mode)

DispatchCISWebhook Job
    └─> CISClient

HasCISEvaluation Trait
    └─> CISClient
```

## Design Patterns

### Singleton Pattern
`CISClient` is registered as a singleton to reuse HTTP client and configuration.

### Facade Pattern
`CIS` facade provides convenient static access to `CISClient`.

### Value Object Pattern
`EvaluateResponse` and `CISResponse` are immutable DTOs.

### Strategy Pattern
Async vs sync webhook dispatch based on configuration.

### Retry Pattern
Exponential backoff with configurable attempts.

### Circuit Breaker (Fail-Open)
Graceful degradation when CIS unavailable.

## Extension Points

### Custom Middleware
Create additional middleware for other action types:

```php
class CISEvaluateMessage extends Middleware
{
    // Evaluate message.send action
}
```

### Custom Events
Extend `CISEventDispatcher` for domain-specific events:

```php
class CustomCISDispatcher extends CISEventDispatcher
{
    public function dispatchCustomEvent($model): void
    {
        $this->dispatch('custom.event', [...]);
    }
}
```

### Custom Exception Handling
Catch and handle CIS exceptions:

```php
try {
    $evaluation = CIS::evaluate(...);
} catch (CISConnectionException $e) {
    // Custom handling
}
```

## Testing Strategy

### Unit Tests
- Test DTOs in isolation
- Mock HTTP client for CISClient tests
- Test middleware logic with mocked client

### Integration Tests
- Test against real CIS backend (optional)
- Test queue integration
- Test middleware in request lifecycle

### Performance Tests
- Verify evaluation latency <200ms
- Test retry backoff timing
- Test timeout handling

## Security Considerations

### HMAC Signing
All requests signed with HMAC-SHA256 using shared secret.

### Timestamp Validation
Requests include millisecond timestamps to prevent replay attacks.

### Idempotency
Auto-generated UUID for each request.

### Secret Management
Secrets loaded from environment variables, never hardcoded.

### HTTPS
Production deployments should use HTTPS for CIS backend.

## Performance Considerations

### Timeouts
- Evaluate: 200ms (strict)
- Webhook: 5s
- Health: 2s

### Retries
- Webhooks: 3 attempts with exponential backoff
- Evaluate: No retries (fail fast)

### Async Dispatch
Queue-based webhook dispatch prevents blocking user requests.

### Connection Pooling
Guzzle HTTP client reused across requests via singleton.

## Monitoring & Observability

### Logging
- Debug mode for verbose logging
- Warning logs for fail-open scenarios
- Error logs for connection failures

### Metrics (Future)
- Evaluation latency
- Webhook dispatch success rate
- Queue depth
- Fail-open occurrences

### Health Checks
Regular CIS backend health checks recommended.
