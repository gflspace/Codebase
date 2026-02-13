<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration to create CIS webhook log table.
 *
 * Tracks webhook dispatches for monitoring and debugging.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cis_webhook_log', function (Blueprint $table) {
            $table->id();

            // Event identification
            $table->string('event_type', 100)->index();
            $table->uuid('idempotency_key')->unique();

            // Event data
            $table->string('user_id', 50)->nullable()->index();
            $table->json('payload');

            // Response tracking
            $table->integer('response_status')->nullable();
            $table->text('response_body')->nullable();
            $table->boolean('success')->default(false)->index();

            // Retry tracking
            $table->integer('attempts')->default(1);
            $table->timestamp('dispatched_at')->index();
            $table->timestamp('completed_at')->nullable();

            // Error tracking
            $table->text('error')->nullable();

            // Timestamps
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cis_webhook_log');
    }
};
