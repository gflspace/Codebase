<?php

declare(strict_types=1);

namespace QwickServices\CIS;

use Illuminate\Support\ServiceProvider;
use QwickServices\CIS\Commands\CISEvaluate;
use QwickServices\CIS\Commands\CISHealthCheck;
use QwickServices\CIS\Commands\CISStatus;
use QwickServices\CIS\Commands\CISTestWebhook;
use QwickServices\CIS\Listeners\CISEventSubscriber;
use QwickServices\CIS\Macros\RouteMacros;

/**
 * Laravel service provider for CIS integration.
 *
 * Registers CISClient, commands, event subscribers, and route macros.
 */
class CISServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Merge package config with application config
        $this->mergeConfigFrom(
            __DIR__ . '/../config/cis.php',
            'cis'
        );

        // Register CISClient as singleton
        $this->app->singleton(CISClient::class, function ($app) {
            $config = $app['config']['cis'];

            return new CISClient(
                baseUrl: $config['base_url'],
                webhookSecret: $config['webhook_secret'],
                options: [
                    'timeout' => $config['timeout'],
                    'retry' => $config['retry'],
                    'source' => $config['source'],
                    'debug' => $config['debug'],
                ],
            );
        });

        // Register facade alias
        $this->app->alias(CISClient::class, 'cis');
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Register Artisan commands
        if ($this->app->runningInConsole()) {
            $this->commands([
                CISHealthCheck::class,
                CISTestWebhook::class,
                CISEvaluate::class,
                CISStatus::class,
            ]);

            // Publish configuration file
            $this->publishes([
                __DIR__ . '/../config/cis.php' => config_path('cis.php'),
            ], 'cis-config');

            // Publish migrations
            $this->publishes([
                __DIR__ . '/database/migrations/' => database_path('migrations'),
            ], 'cis-migrations');
        }

        // Register event subscriber
        if (config('cis.auto_dispatch', false)) {
            $this->app['events']->subscribe(CISEventSubscriber::class);
        }

        // Register route macros
        RouteMacros::register();

        // Load migrations if running in package development
        $this->loadMigrationsFrom(__DIR__ . '/database/migrations');
    }

    /**
     * Get the services provided by the provider.
     *
     * @return array<string>
     */
    public function provides(): array
    {
        return [CISClient::class, 'cis'];
    }
}
