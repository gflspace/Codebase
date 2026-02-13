<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use QwickServices\CIS\Events\CISEventDispatcher;
use QwickServices\CIS\Facades\CIS;

/**
 * Example booking controller demonstrating CIS integration patterns.
 *
 * This file shows multiple approaches to integrate CIS evaluation and webhooks.
 */
class BookingController extends Controller
{
    public function __construct(
        private readonly CISEventDispatcher $cisDispatcher,
    ) {
    }

    /**
     * Method 1: Using middleware for automatic evaluation.
     *
     * Add to route:
     * Route::post('/bookings', [BookingController::class, 'storeWithMiddleware'])
     *     ->middleware(\QwickServices\CIS\Middleware\CISEvaluateBooking::class);
     */
    public function storeWithMiddleware(Request $request): JsonResponse
    {
        // Middleware has already evaluated the request
        // If we got here, decision was "allow" or "flag"

        $cisEvaluation = $request->attributes->get('cis_evaluation');
        $isFlagged = $request->attributes->get('cis_flagged', false);

        $booking = Booking::create($request->validated());

        // If flagged, add extra monitoring
        if ($isFlagged) {
            Log::warning('Flagged booking created', [
                'booking_id' => $booking->id,
                'risk_score' => $cisEvaluation?->riskScore,
                'signals' => $cisEvaluation?->signals,
            ]);
        }

        // Dispatch webhook to CIS
        $this->cisDispatcher->dispatchBookingCreated($booking);

        return response()->json($booking, 201);
    }

    /**
     * Method 2: Manual evaluation before processing.
     *
     * Full control over evaluation logic and response.
     */
    public function storeWithManualEvaluation(Request $request): JsonResponse
    {
        $validated = $request->validated();

        // Evaluate with CIS before creating booking
        $evaluation = CIS::evaluate(
            actionType: 'booking.create',
            userId: (string) $request->user()->id,
            counterpartyId: $validated['provider_id'],
            metadata: [
                'booking_amount' => $validated['amount'],
                'service_type' => $validated['service_type'],
                'scheduled_at' => $validated['scheduled_at'],
            ],
        );

        // Handle BLOCK decision
        if ($evaluation->isBlocked()) {
            return response()->json([
                'error' => 'Unable to create booking',
                'reason' => $evaluation->reason,
                'risk_tier' => $evaluation->riskTier,
                'contact_support' => true,
            ], 403);
        }

        // Handle FLAG decision - proceed with warning
        if ($evaluation->isFlagged()) {
            Log::warning('Creating flagged booking', [
                'user_id' => $request->user()->id,
                'risk_score' => $evaluation->riskScore,
                'signals' => $evaluation->signals,
            ]);

            // Optionally: require additional verification, reduce limits, etc.
            if ($evaluation->isCriticalRisk()) {
                return response()->json([
                    'error' => 'Additional verification required',
                    'reason' => 'Your booking requires manual review',
                    'contact_support' => true,
                ], 422);
            }
        }

        // Create booking
        $booking = Booking::create($validated);

        // Store CIS evaluation result with booking
        $booking->update([
            'cis_risk_score' => $evaluation->riskScore,
            'cis_risk_tier' => $evaluation->riskTier,
            'cis_enforcement_id' => $evaluation->enforcementId,
        ]);

        // Dispatch webhook
        $this->cisDispatcher->dispatchBookingCreated($booking);

        // Add CIS headers to response
        $headers = $evaluation->getHttpHeaders();

        return response()->json($booking, 201, $headers);
    }

    /**
     * Method 3: Using model trait for evaluation.
     *
     * Add HasCISEvaluation trait to Booking model.
     */
    public function storeWithModelTrait(Request $request): JsonResponse
    {
        $booking = new Booking($request->validated());

        // Evaluate using model trait
        $evaluation = $booking->evaluateWithCIS('booking.create');

        if ($evaluation->isBlocked()) {
            return response()->json([
                'error' => 'Booking not allowed',
                'reason' => $evaluation->reason,
            ], 403);
        }

        $booking->save();

        // Dispatch webhook
        $this->cisDispatcher->dispatchBookingCreated($booking);

        return response()->json($booking, 201);
    }

    /**
     * Cancel booking with automatic webhook dispatch.
     */
    public function destroy(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('cancel', $booking);

        $booking->update([
            'status' => 'cancelled',
            'cancellation_reason' => $request->input('reason'),
            'cancelled_at' => now(),
        ]);

        // Dispatch webhook
        $this->cisDispatcher->dispatchBookingCancelled($booking);

        return response()->json(['message' => 'Booking cancelled']);
    }

    /**
     * Complete booking with webhook dispatch.
     */
    public function complete(Booking $booking): JsonResponse
    {
        $this->authorize('complete', $booking);

        $booking->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // Dispatch webhook
        $this->cisDispatcher->dispatchBookingCompleted($booking);

        return response()->json($booking);
    }

    /**
     * Batch operations with CIS health check.
     */
    public function batchCreate(Request $request): JsonResponse
    {
        // Check CIS health before processing batch
        if (!CIS::healthCheck()) {
            Log::warning('CIS unavailable during batch booking creation');

            // Decide whether to proceed or fail based on fail_open setting
            if (!config('cis.fail_open')) {
                return response()->json([
                    'error' => 'Service temporarily unavailable',
                ], 503);
            }
        }

        $bookings = [];
        $blocked = [];

        foreach ($request->input('bookings') as $bookingData) {
            // Evaluate each booking
            $evaluation = CIS::evaluate(
                actionType: 'booking.create',
                userId: (string) $request->user()->id,
                counterpartyId: $bookingData['provider_id'],
                metadata: $bookingData,
            );

            if ($evaluation->isBlocked()) {
                $blocked[] = [
                    'data' => $bookingData,
                    'reason' => $evaluation->reason,
                ];
                continue;
            }

            $booking = Booking::create($bookingData);
            $this->cisDispatcher->dispatchBookingCreated($booking);
            $bookings[] = $booking;
        }

        return response()->json([
            'created' => $bookings,
            'blocked' => $blocked,
        ]);
    }
}
