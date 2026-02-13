# CIS Laravel Integration — Quick Start

Get up and running with CIS in 5 minutes.

## Prerequisites

- Laravel 10+ application
- CIS backend running (default: `http://localhost:3001`)
- Redis queue worker (recommended for production)
- PHP 8.1+

## Installation Steps

### 1. Add Package to Autoload

Edit `composer.json`:

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
CIS_WEBHOOK_SECRET=your-secret-here
CIS_ASYNC=true
CIS_FAIL_OPEN=true
```

**Generate a secure secret:**

```bash
openssl rand -hex 32
```

### 4. Test Connection

```bash
php artisan tinker
```

```php
CIS::healthCheck(); // Should return true
```

## Basic Usage

### Option A: Use Middleware (Recommended)

Add middleware to routes:

```php
// routes/api.php
use QwickServices\CIS\Middleware\CISEvaluateBooking;

Route::post('/bookings', [BookingController::class, 'store'])
    ->middleware(CISEvaluateBooking::class);
```

Controller:

```php
public function store(Request $request)
{
    // CIS already evaluated - this code only runs if allowed/flagged
    $booking = Booking::create($request->validated());

    // Dispatch webhook
    app(CISEventDispatcher::class)->dispatchBookingCreated($booking);

    return response()->json($booking, 201);
}
```

### Option B: Manual Evaluation

```php
use QwickServices\CIS\Facades\CIS;

$evaluation = CIS::evaluate(
    actionType: 'booking.create',
    userId: (string) $user->id,
    counterpartyId: (string) $provider->id,
    metadata: ['amount' => 150.00]
);

if ($evaluation->isBlocked()) {
    return response()->json(['error' => $evaluation->reason], 403);
}

// Proceed with booking creation
```

### Option C: Model Trait

Add to model:

```php
use QwickServices\CIS\Traits\HasCISEvaluation;

class Booking extends Model
{
    use HasCISEvaluation;
}
```

Use in controller:

```php
$booking = new Booking($data);
$evaluation = $booking->evaluateWithCIS('booking.create');

if ($evaluation->isAllowed()) {
    $booking->save();
}
```

## Webhook Dispatch

### Manual Dispatch

```php
use QwickServices\CIS\Events\CISEventDispatcher;

$dispatcher = app(CISEventDispatcher::class);
$dispatcher->dispatchBookingCreated($booking);
```

### Automatic with Observers

Create observer:

```php
namespace App\Observers;

class BookingObserver
{
    public function __construct(
        private CISEventDispatcher $cisDispatcher
    ) {}

    public function created(Booking $booking)
    {
        $this->cisDispatcher->dispatchBookingCreated($booking);
    }
}
```

Register in `EventServiceProvider`:

```php
use App\Observers\BookingObserver;

public function boot()
{
    Booking::observe(BookingObserver::class);
}
```

## Queue Setup (Production)

### 1. Ensure Redis is running

```bash
redis-cli ping # Should return PONG
```

### 2. Start queue worker

```bash
php artisan queue:work redis --queue=cis-webhooks
```

### 3. Use Supervisor for production

```ini
[program:laravel-cis-worker]
command=php /path/to/artisan queue:work redis --queue=cis-webhooks
autostart=true
autorestart=true
numprocs=2
user=www-data
```

## Verify Everything Works

### 1. Check CIS health

```bash
php artisan tinker
```

```php
CIS::healthCheck(); // true
```

### 2. Test evaluation

```php
$eval = CIS::evaluate('booking.create', 'user-123', 'provider-456', []);
echo $eval->decision; // "allow", "flag", or "block"
```

### 3. Test webhook (sync mode)

```php
config(['cis.async' => false]);
$response = CIS::sendWebhook('test.event', ['test' => true]);
echo $response->isSuccessful() ? 'Success' : 'Failed';
```

### 4. Test webhook (async mode)

```php
config(['cis.async' => true]);
CIS::sendWebhook('test.event', ['test' => true]);
// Check queue: php artisan queue:work redis --queue=cis-webhooks --once
```

## Common Issues

### "CIS webhook secret is not configured"

**Fix:** Set `CIS_WEBHOOK_SECRET` in `.env`

### "Failed to connect to CIS backend"

**Fix:** Ensure CIS backend is running:

```bash
curl http://localhost:3001/api/health
```

### Webhooks not dispatching

**Fix:** Check queue is running:

```bash
php artisan queue:work redis --queue=cis-webhooks
```

Or use sync mode for testing:

```env
CIS_ASYNC=false
```

## Next Steps

- Read full [README.md](README.md) for advanced usage
- Review example files in `examples/` directory
- Configure fail-open/fail-closed behavior
- Set up monitoring for CIS health checks
- Implement automatic webhook dispatch with observers

## Production Checklist

- [ ] `CIS_WEBHOOK_SECRET` set and matches CIS backend
- [ ] `CIS_BASE_URL` points to production CIS
- [ ] Queue workers running with supervisor
- [ ] `CIS_ASYNC=true`
- [ ] `CIS_DEBUG=false`
- [ ] HTTPS enabled for CIS backend
- [ ] Monitoring configured

## Support

For issues, consult:
- Full documentation: [README.md](README.md)
- Example implementations: `examples/` directory
- CIS backend logs
- Laravel logs: `storage/logs/laravel.log`

Contact: dev@qwickservices.com
