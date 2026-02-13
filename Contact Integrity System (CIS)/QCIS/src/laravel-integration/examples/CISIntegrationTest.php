<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use QwickServices\CIS\CISClient;
use QwickServices\CIS\DTOs\EvaluateResponse;
use QwickServices\CIS\Facades\CIS;
use Tests\TestCase;

/**
 * Example integration tests for CIS functionality.
 */
class CISIntegrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test booking creation with CIS evaluation (allowed).
     */
    public function test_booking_allowed_by_cis(): void
    {
        // Mock CIS client
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
            ->with('booking.create', Mockery::any(), Mockery::any(), Mockery::any())
            ->andReturn($mockEvaluation);

        // Create test data
        $user = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);

        // Make request
        $response = $this->actingAs($user)->postJson('/api/bookings', [
            'provider_id' => $provider->id,
            'service_type' => 'cleaning',
            'amount' => 150.00,
            'scheduled_at' => now()->addDays(1)->toIso8601String(),
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['id', 'user_id', 'provider_id', 'amount']);
        $response->assertHeader('X-CIS-Decision', 'allow');
        $response->assertHeader('X-CIS-Score', '10');
    }

    /**
     * Test booking creation blocked by CIS.
     */
    public function test_booking_blocked_by_cis(): void
    {
        $mockClient = Mockery::mock(CISClient::class);
        $this->app->instance(CISClient::class, $mockClient);

        $mockEvaluation = new EvaluateResponse(
            decision: 'block',
            riskScore: 95,
            riskTier: 'critical',
            reason: 'Multiple off-platform signals detected',
            signals: ['OFF_PLATFORM_INTENT', 'CONTACT_PHONE'],
            enforcementId: 'enf_123',
            evaluationTimeMs: 87.0,
        );

        $mockClient->shouldReceive('evaluate')
            ->once()
            ->andReturn($mockEvaluation);

        $user = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);

        $response = $this->actingAs($user)->postJson('/api/bookings', [
            'provider_id' => $provider->id,
            'service_type' => 'cleaning',
            'amount' => 150.00,
            'scheduled_at' => now()->addDays(1)->toIso8601String(),
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'error' => 'Booking request denied',
            'reason' => 'Multiple off-platform signals detected',
        ]);

        // Ensure booking was not created
        $this->assertDatabaseMissing('bookings', [
            'user_id' => $user->id,
            'provider_id' => $provider->id,
        ]);
    }

    /**
     * Test booking creation flagged by CIS.
     */
    public function test_booking_flagged_by_cis(): void
    {
        $mockClient = Mockery::mock(CISClient::class);
        $this->app->instance(CISClient::class, $mockClient);

        $mockEvaluation = new EvaluateResponse(
            decision: 'flag',
            riskScore: 65,
            riskTier: 'medium',
            reason: 'Moderate risk indicators present',
            signals: ['PHONE_PATTERN'],
            evaluationTimeMs: 52.0,
        );

        $mockClient->shouldReceive('evaluate')
            ->once()
            ->andReturn($mockEvaluation);

        $user = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);

        $response = $this->actingAs($user)->postJson('/api/bookings', [
            'provider_id' => $provider->id,
            'service_type' => 'cleaning',
            'amount' => 150.00,
            'scheduled_at' => now()->addDays(1)->toIso8601String(),
        ]);

        $response->assertStatus(201);
        $response->assertHeader('X-CIS-Flagged', 'true');
        $response->assertHeader('X-CIS-Score', '65');
        $response->assertHeader('X-CIS-Tier', 'medium');

        // Booking should be created
        $this->assertDatabaseHas('bookings', [
            'user_id' => $user->id,
            'provider_id' => $provider->id,
        ]);
    }

    /**
     * Test CIS fail-open behavior when backend is unavailable.
     */
    public function test_cis_fail_open_when_unavailable(): void
    {
        config(['cis.fail_open' => true]);

        $mockClient = Mockery::mock(CISClient::class);
        $this->app->instance(CISClient::class, $mockClient);

        // Simulate connection error
        $mockClient->shouldReceive('evaluate')
            ->once()
            ->andThrow(new \QwickServices\CIS\Exceptions\CISConnectionException('Connection refused'));

        $user = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);

        $response = $this->actingAs($user)->postJson('/api/bookings', [
            'provider_id' => $provider->id,
            'service_type' => 'cleaning',
            'amount' => 150.00,
            'scheduled_at' => now()->addDays(1)->toIso8601String(),
        ]);

        // Should succeed with fail-open
        $response->assertStatus(201);
        $response->assertHeader('X-CIS-Unavailable', 'true');

        $this->assertDatabaseHas('bookings', [
            'user_id' => $user->id,
            'provider_id' => $provider->id,
        ]);
    }

    /**
     * Test CIS health check.
     */
    public function test_cis_health_check(): void
    {
        $mockClient = Mockery::mock(CISClient::class);
        $this->app->instance(CISClient::class, $mockClient);

        $mockClient->shouldReceive('healthCheck')
            ->once()
            ->andReturn(true);

        $this->assertTrue(CIS::healthCheck());
    }

    /**
     * Test webhook dispatch (async mode).
     */
    public function test_webhook_dispatch_async(): void
    {
        config(['cis.async' => true]);

        $this->expectsJobs(\QwickServices\CIS\Jobs\DispatchCISWebhook::class);

        $booking = Booking::factory()->create();

        $dispatcher = app(\QwickServices\CIS\Events\CISEventDispatcher::class);
        $dispatcher->dispatchBookingCreated($booking);
    }

    /**
     * Test webhook dispatch (sync mode).
     */
    public function test_webhook_dispatch_sync(): void
    {
        config(['cis.async' => false]);

        $mockClient = Mockery::mock(CISClient::class);
        $this->app->instance(CISClient::class, $mockClient);

        $mockResponse = new \QwickServices\CIS\DTOs\CISResponse(
            success: true,
            statusCode: 200,
            body: ['status' => 'received'],
        );

        $mockClient->shouldReceive('sendWebhook')
            ->once()
            ->with('booking.created', Mockery::any())
            ->andReturn($mockResponse);

        $booking = Booking::factory()->create();

        $dispatcher = app(\QwickServices\CIS\Events\CISEventDispatcher::class);
        $dispatcher->dispatchBookingCreated($booking);
    }

    /**
     * Test model trait evaluation.
     */
    public function test_model_trait_evaluation(): void
    {
        $mockClient = Mockery::mock(CISClient::class);
        $this->app->instance(CISClient::class, $mockClient);

        $mockEvaluation = new EvaluateResponse(
            decision: 'allow',
            riskScore: 20,
            riskTier: 'low',
            reason: 'Low risk',
            signals: [],
            evaluationTimeMs: 38.0,
        );

        $mockClient->shouldReceive('evaluate')
            ->once()
            ->andReturn($mockEvaluation);

        $booking = Booking::factory()->make([
            'user_id' => 1,
            'provider_id' => 2,
        ]);

        $evaluation = $booking->evaluateWithCIS('booking.create');

        $this->assertTrue($evaluation->isAllowed());
        $this->assertEquals(20, $evaluation->riskScore);
        $this->assertEquals('low', $evaluation->riskTier);
    }

    /**
     * Teardown - clean up Mockery.
     */
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
