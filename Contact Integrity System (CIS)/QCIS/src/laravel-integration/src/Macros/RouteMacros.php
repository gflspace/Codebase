<?php

declare(strict_types=1);

namespace QwickServices\CIS\Macros;

use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use QwickServices\CIS\Middleware\CISEvaluateBooking;
use QwickServices\CIS\Middleware\CISEvaluatePayment;

/**
 * Route macros for CIS integration.
 *
 * Provides fluent interface for adding CIS middleware to routes.
 */
class RouteMacros
{
    /**
     * Register all CIS route macros.
     *
     * Call this from a service provider's boot method.
     */
    public static function register(): void
    {
        if (!RouteFacade::hasMacro('cisEvaluate')) {
            RouteFacade::macro('cisEvaluate', function (string $actionType) {
                /** @var Route $this */
                $middleware = match ($actionType) {
                    'booking.create', 'booking' => CISEvaluateBooking::class,
                    'payment.initiate', 'payment' => CISEvaluatePayment::class,
                    default => null,
                };

                if ($middleware) {
                    return $this->middleware($middleware);
                }

                return $this;
            });
        }

        if (!RouteFacade::hasMacro('cisBooking')) {
            RouteFacade::macro('cisBooking', function () {
                /** @var Route $this */
                return $this->middleware(CISEvaluateBooking::class);
            });
        }

        if (!RouteFacade::hasMacro('cisPayment')) {
            RouteFacade::macro('cisPayment', function () {
                /** @var Route $this */
                return $this->middleware(CISEvaluatePayment::class);
            });
        }
    }

    /**
     * Get available macro names.
     *
     * @return array<string>
     */
    public static function available(): array
    {
        return [
            'cisEvaluate',
            'cisBooking',
            'cisPayment',
        ];
    }
}
