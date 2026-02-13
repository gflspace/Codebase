<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | CIS Base URL
    |--------------------------------------------------------------------------
    |
    | The base URL for the Contact Integrity System backend API.
    | Default: http://localhost:3001
    |
    */
    'base_url' => env('CIS_BASE_URL', 'http://localhost:3001'),

    /*
    |--------------------------------------------------------------------------
    | Webhook Secret
    |--------------------------------------------------------------------------
    |
    | The shared secret used for HMAC-SHA256 signature generation.
    | This MUST match the WEBHOOK_SECRET configured in the CIS backend.
    |
    */
    'webhook_secret' => env('CIS_WEBHOOK_SECRET', ''),

    /*
    |--------------------------------------------------------------------------
    | CIS Enabled
    |--------------------------------------------------------------------------
    |
    | Master switch to enable/disable CIS integration.
    | Set to false to bypass all CIS calls (fail-open mode).
    |
    */
    'enabled' => env('CIS_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | HTTP Timeouts
    |--------------------------------------------------------------------------
    |
    | Timeout configurations for different API calls (in seconds).
    |
    */
    'timeout' => [
        'webhook' => (float) env('CIS_WEBHOOK_TIMEOUT', 5.0),
        'evaluate' => (float) env('CIS_EVALUATE_TIMEOUT', 0.2),
        'health' => (float) env('CIS_HEALTH_TIMEOUT', 2.0),
    ],

    /*
    |--------------------------------------------------------------------------
    | Async Webhook Dispatch
    |--------------------------------------------------------------------------
    |
    | When true, webhooks are dispatched via Laravel queue system.
    | When false, webhooks are sent synchronously.
    |
    */
    'async' => env('CIS_ASYNC', true),

    /*
    |--------------------------------------------------------------------------
    | Queue Configuration
    |--------------------------------------------------------------------------
    |
    | Queue connection and name for async webhook dispatch.
    |
    */
    'queue' => [
        'connection' => env('CIS_QUEUE_CONNECTION', env('QUEUE_CONNECTION', 'redis')),
        'name' => env('CIS_QUEUE_NAME', 'cis-webhooks'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Retry Configuration
    |--------------------------------------------------------------------------
    |
    | Number of retry attempts and delay between retries for failed requests.
    |
    */
    'retry' => [
        'attempts' => (int) env('CIS_RETRY_ATTEMPTS', 3),
        'delay_ms' => (int) env('CIS_RETRY_DELAY_MS', 1000),
    ],

    /*
    |--------------------------------------------------------------------------
    | Replay Attack Protection
    |--------------------------------------------------------------------------
    |
    | Maximum age of webhook timestamps (in seconds).
    | Requests older than this will be rejected by the CIS backend.
    |
    */
    'replay_window' => 300, // 5 minutes

    /*
    |--------------------------------------------------------------------------
    | Fail-Open Mode
    |--------------------------------------------------------------------------
    |
    | When true, failures to reach CIS will allow the request to proceed.
    | When false, CIS connectivity issues will block the request.
    |
    */
    'fail_open' => env('CIS_FAIL_OPEN', true),

    /*
    |--------------------------------------------------------------------------
    | Auto Event Dispatch
    |--------------------------------------------------------------------------
    |
    | Automatically dispatch CIS webhooks for Laravel model events.
    | Requires corresponding event listeners to be registered.
    |
    */
    'auto_dispatch' => env('CIS_AUTO_DISPATCH', false),

    /*
    |--------------------------------------------------------------------------
    | Debug Mode
    |--------------------------------------------------------------------------
    |
    | Enable verbose logging of all CIS interactions.
    |
    */
    'debug' => env('CIS_DEBUG', false),

    /*
    |--------------------------------------------------------------------------
    | Source Identifier
    |--------------------------------------------------------------------------
    |
    | Identifies this application in CIS webhook headers.
    |
    */
    'source' => env('CIS_SOURCE', 'qwickservices'),
];
