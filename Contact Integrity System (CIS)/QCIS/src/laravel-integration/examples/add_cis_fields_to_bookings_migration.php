<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Example migration: Add CIS tracking fields to bookings table.
 *
 * Run with: php artisan migrate
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // CIS risk score (0-100)
            $table->unsignedTinyInteger('cis_risk_score')->nullable()->after('status');

            // CIS risk tier (low, medium, high, critical)
            $table->string('cis_risk_tier', 20)->nullable()->after('cis_risk_score');

            // CIS enforcement action ID (if any)
            $table->uuid('cis_enforcement_id')->nullable()->after('cis_risk_tier');

            // Index for querying high-risk bookings
            $table->index(['cis_risk_tier', 'cis_risk_score'], 'bookings_cis_risk_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_cis_risk_index');
            $table->dropColumn(['cis_risk_score', 'cis_risk_tier', 'cis_enforcement_id']);
        });
    }
};
