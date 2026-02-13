# Changelog

All notable changes to the QwickServices CIS Laravel Integration package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-13

### Added
- Initial release of CIS Laravel integration package
- `CISClient` core HTTP client with HMAC authentication
- `CISServiceProvider` for Laravel service registration
- `CIS` facade for convenient access
- `CISEvaluateBooking` middleware for pre-booking evaluation
- `CISEvaluatePayment` middleware for pre-payment evaluation
- `CISEventDispatcher` for webhook event dispatch
- `DispatchCISWebhook` queueable job for async webhook delivery
- `HasCISEvaluation` trait for model-level evaluation
- `EvaluateResponse` and `CISResponse` DTOs
- HMAC-SHA256 request signing with replay attack protection
- Exponential backoff retry logic
- Fail-open architecture with configurable behavior
- Comprehensive configuration options via `config/cis.php`
- Queue integration for async webhook dispatch
- Support for all CIS event types:
  - Booking events (created, updated, cancelled, completed)
  - Payment events (initiated, completed, failed)
  - Message events (sent, edited)
  - Provider events (registered, verified, profile updated)
  - Rating events (submitted)
  - Dispute events (filed, resolved)
  - Contact field change events
- Support for all CIS action types:
  - booking.create
  - payment.initiate
  - provider.register
  - message.send
- Complete documentation with examples
- Quick start guide
- Example controller, observer, model implementations
- Integration test examples
- Migration example for CIS tracking fields

### Features
- Sub-200ms evaluation latency
- Automatic idempotency key generation
- Configurable timeouts per endpoint
- Debug logging support
- Health check endpoint
- Response header injection for CIS metadata
- Graceful degradation when CIS unavailable

### Security
- HMAC-SHA256 signature authentication
- 5-minute replay attack window
- Secure secret management via environment variables
- Request timestamp validation

## [Unreleased]

### Planned
- Rate limiting integration
- Metrics collection for monitoring
- Dashboard widgets for Laravel Nova
- Webhook event verification (for receiving webhooks from CIS)
- Batch evaluation endpoint support
- Circuit breaker pattern for improved resilience
- Prometheus metrics exporter
- Advanced retry strategies (jitter, circuit breaker)
