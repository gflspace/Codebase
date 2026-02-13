<?php

declare(strict_types=1);

namespace QwickServices\CIS\DTOs;

/**
 * Value object representing a CIS webhook response.
 */
readonly class CISResponse
{
    /**
     * @param bool $success Whether the webhook was successfully delivered
     * @param int $statusCode HTTP status code from CIS backend
     * @param array<string, mixed> $body Decoded response body
     * @param string|null $error Error message if request failed
     */
    public function __construct(
        public bool $success,
        public int $statusCode,
        public array $body = [],
        public ?string $error = null,
    ) {
    }

    /**
     * Check if the response indicates success (2xx status code).
     */
    public function isSuccessful(): bool
    {
        return $this->success && $this->statusCode >= 200 && $this->statusCode < 300;
    }

    /**
     * Check if the response indicates a client error (4xx status code).
     */
    public function isClientError(): bool
    {
        return $this->statusCode >= 400 && $this->statusCode < 500;
    }

    /**
     * Check if the response indicates a server error (5xx status code).
     */
    public function isServerError(): bool
    {
        return $this->statusCode >= 500 && $this->statusCode < 600;
    }

    /**
     * Get a specific field from the response body.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public function get(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    /**
     * Convert to array representation.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'success' => $this->success,
            'status_code' => $this->statusCode,
            'body' => $this->body,
            'error' => $this->error,
        ];
    }
}
