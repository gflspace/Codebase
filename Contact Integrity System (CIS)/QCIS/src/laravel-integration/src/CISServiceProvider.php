<?php

declare(strict_types=1);

namespace QwickServices\CIS;

use Illuminate\Support\ServiceProvider;

/**
 * Laravel service provider for CIS integration.
 *
 * Registers CISClient as a singleton and publishes configuration.
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
        // Publish configuration file
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../config/cis.php' => config_path('cis.php'),
            ], 'cis-config');
        }
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
