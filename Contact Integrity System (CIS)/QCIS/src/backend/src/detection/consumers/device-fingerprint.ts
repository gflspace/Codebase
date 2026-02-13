// QwickServices CIS — Device Fingerprint Consumer
// Extracts device metadata from events, upserts user_devices, detects shared devices

import { DomainEvent, EventType } from '../../events/types';
import { query } from '../../database/connection';
import { generateId } from '../../shared/utils';
import crypto from 'crypto';

// Extract device info from event metadata
function extractDeviceInfo(payload: Record<string, unknown>): {
  device_hash: string | null;
  ip_address: string | null;
  user_agent: string | null;
} {
  const meta = (payload.metadata || {}) as Record<string, unknown>;
  let device_hash = (meta.device_hash as string) || null;
  const ip_address = (meta.ip_address as string) || null;
  const user_agent = (meta.user_agent as string) || null;

  // Generate device hash from user_agent + ip if no explicit hash
  if (!device_hash && user_agent) {
    device_hash = crypto.createHash('sha256').update(user_agent + (ip_address || '')).digest('hex');
  }

  return { device_hash, ip_address, user_agent };
}

// Parse user agent for OS and browser
function parseUserAgent(ua: string | null): { os: string | null; browser: string | null } {
  if (!ua) return { os: null, browser: null };

  let os: string | null = null;
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  let browser: string | null = null;
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  return { os, browser };
}

// Upsert device and check for sharing
async function processDeviceFingerprint(
  userId: string,
  device_hash: string,
  ip_address: string | null,
  user_agent: string | null,
  eventId: string,
): Promise<void> {
  const { os, browser } = parseUserAgent(user_agent);

  try {
    // Upsert the device record
    await query(
      `INSERT INTO user_devices (id, user_id, device_hash, ip_address, user_agent, os, browser, first_seen_at, last_seen_at)
       VALUES ($1, $2, $3, $4::inet, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (user_id, device_hash)
       DO UPDATE SET
         last_seen_at = NOW(),
         ip_address = COALESCE($4::inet, user_devices.ip_address),
         user_agent = COALESCE($5, user_devices.user_agent),
         os = COALESCE($6, user_devices.os),
         browser = COALESCE($7, user_devices.browser)`,
      [generateId(), userId, device_hash, ip_address, user_agent, os, browser]
    );

    // Check for device sharing — other users with the same device_hash
    const sharedResult = await query(
      `SELECT DISTINCT user_id FROM user_devices
       WHERE device_hash = $1 AND user_id != $2`,
      [device_hash, userId]
    );

    if (sharedResult.rows.length > 0) {
      // Generate PROVIDER_DUPLICATE_IDENTITY signal
      const sharedUserIds = sharedResult.rows.map((r: { user_id: string }) => r.user_id);

      await query(
        `INSERT INTO risk_signals (id, user_id, signal_type, source_event_id, confidence, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          generateId(),
          userId,
          'PROVIDER_DUPLICATE_IDENTITY',
          eventId,
          Math.min(0.9, 0.5 + sharedUserIds.length * 0.15),
          JSON.stringify({
            device_hash,
            shared_with_users: sharedUserIds.slice(0, 10),
            shared_user_count: sharedUserIds.length,
            ip_address,
          }),
        ]
      );

      console.log(
        `[DeviceFingerprint] Device ${device_hash.slice(0, 12)}... shared by user ${userId.slice(0, 8)} with ${sharedUserIds.length} other user(s)`
      );
    }

    // Check for IP subnet sharing (/24)
    if (ip_address) {
      const ipSharedResult = await query(
        `SELECT DISTINCT user_id FROM user_devices
         WHERE ip_address IS NOT NULL
           AND user_id != $1
           AND ip_address << ($2::inet - '0.0.0.255'::inet)::cidr`,
        [userId, ip_address]
      );

      // Only flag if many users share the subnet (>3 suggests shared network, not VPN/office)
      if (ipSharedResult.rows.length >= 3) {
        // Add risk flag to the device record
        await query(
          `UPDATE user_devices
           SET risk_flags = array_append(
             CASE WHEN 'SHARED_IP_SUBNET' = ANY(risk_flags) THEN risk_flags
                  ELSE risk_flags END,
             'SHARED_IP_SUBNET'
           )
           WHERE user_id = $1 AND device_hash = $2
             AND NOT ('SHARED_IP_SUBNET' = ANY(risk_flags))`,
          [userId, device_hash]
        );
      }
    }
  } catch (err) {
    console.error('[DeviceFingerprint] Error processing device:', err);
  }
}

// Event handler
async function handleDeviceEvent(event: DomainEvent): Promise<void> {
  const payload = event.payload as Record<string, unknown>;
  const userId = (payload.sender_id as string)
    || (payload.user_id as string)
    || (payload.client_id as string)
    || (payload.provider_id as string);

  if (!userId) return;

  const { device_hash, ip_address, user_agent } = extractDeviceInfo(payload);
  if (!device_hash) return;

  await processDeviceFingerprint(userId, device_hash, ip_address, user_agent, event.id);
}

// Consumer registration
export function registerDeviceFingerprintConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'device-fingerprint',
    eventTypes: [
      EventType.MESSAGE_CREATED,
      EventType.BOOKING_CREATED,
      EventType.TRANSACTION_INITIATED,
      EventType.PROVIDER_REGISTERED,
      EventType.USER_REGISTERED,
      EventType.WALLET_DEPOSIT,
    ],
    handler: handleDeviceEvent,
  });
}

export { extractDeviceInfo, parseUserAgent, processDeviceFingerprint, handleDeviceEvent };
