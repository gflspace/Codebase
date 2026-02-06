/**
 * UTM Parameter Tracking & Source Detection
 *
 * Automatically detects lead sources from:
 * - UTM parameters (utm_source, utm_medium, utm_campaign)
 * - Referrer URL
 * - Landing page
 */

/**
 * Parse UTM parameters from URL
 * @param {string} url - URL to parse (defaults to current URL)
 * @returns {Object} UTM parameters
 */
export function parseUTMParams(url = window.location.href) {
  const params = new URLSearchParams(new URL(url).search);

  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
    utm_term: params.get('utm_term') || null,
    utm_content: params.get('utm_content') || null,
    gclid: params.get('gclid') || null, // Google Click ID
    fbclid: params.get('fbclid') || null, // Facebook Click ID
  };
}

/**
 * Source mapping from UTM parameters
 */
const UTM_SOURCE_MAP = {
  // Google
  google: 'google',
  googleads: 'google',
  'google-ads': 'google',
  adwords: 'google',

  // Facebook/Meta
  facebook: 'facebook',
  fb: 'facebook',
  meta: 'facebook',
  ig: 'instagram',
  instagram: 'instagram',

  // Other paid channels
  bing: 'bing',
  bingads: 'bing',
  linkedin: 'linkedin',
  twitter: 'twitter',
  x: 'twitter',
  tiktok: 'tiktok',
  pinterest: 'pinterest',
  youtube: 'youtube',
  yelp: 'yelp',

  // Email
  email: 'email',
  newsletter: 'email',
  mailchimp: 'email',

  // Referral
  referral: 'referral',
  partner: 'referral',
  affiliate: 'referral',
};

/**
 * Referrer domain to source mapping
 */
const REFERRER_DOMAIN_MAP = {
  'google.com': 'google',
  'google.co': 'google',
  'bing.com': 'bing',
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'instagram.com': 'instagram',
  'twitter.com': 'twitter',
  'x.com': 'twitter',
  'linkedin.com': 'linkedin',
  'youtube.com': 'youtube',
  'tiktok.com': 'tiktok',
  'pinterest.com': 'pinterest',
  'yelp.com': 'yelp',
  'realself.com': 'realself',
};

/**
 * Detect source from referrer URL
 * @param {string} referrer - Document referrer
 * @returns {string|null} Detected source or null
 */
function detectSourceFromReferrer(referrer) {
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();

    // Check each domain pattern
    for (const [domain, source] of Object.entries(REFERRER_DOMAIN_MAP)) {
      if (hostname.includes(domain)) {
        return source;
      }
    }

    // If referrer exists but doesn't match known sources, it's a referral
    if (hostname && !hostname.includes(window.location.hostname)) {
      return 'referral';
    }
  } catch {
    // Invalid URL
  }

  return null;
}

/**
 * Detect lead source from all available signals
 * @returns {Object} Source detection result
 */
export function detectLeadSource() {
  const utmParams = parseUTMParams();
  const referrer = document.referrer || '';

  let source = 'website'; // Default source
  let medium = 'organic'; // Default medium
  let detectionMethod = 'default';

  // Priority 1: Google Click ID (gclid) - definitely from Google Ads
  if (utmParams.gclid) {
    source = 'google';
    medium = 'cpc';
    detectionMethod = 'gclid';
  }
  // Priority 2: Facebook Click ID (fbclid) - from Facebook/Instagram
  else if (utmParams.fbclid) {
    source = 'facebook';
    medium = 'cpc';
    detectionMethod = 'fbclid';
  }
  // Priority 3: UTM source parameter
  else if (utmParams.utm_source) {
    const utmSourceLower = utmParams.utm_source.toLowerCase();
    source = UTM_SOURCE_MAP[utmSourceLower] || utmParams.utm_source;
    medium = utmParams.utm_medium || 'unknown';
    detectionMethod = 'utm_source';
  }
  // Priority 4: UTM medium (sometimes source isn't set but medium is)
  else if (utmParams.utm_medium) {
    medium = utmParams.utm_medium.toLowerCase();
    if (medium === 'cpc' || medium === 'ppc' || medium === 'paid') {
      source = 'paid_search';
    } else if (medium === 'social') {
      source = 'social';
    } else if (medium === 'email') {
      source = 'email';
    } else if (medium === 'referral') {
      source = 'referral';
    }
    detectionMethod = 'utm_medium';
  }
  // Priority 5: Referrer URL
  else if (referrer) {
    const referrerSource = detectSourceFromReferrer(referrer);
    if (referrerSource) {
      source = referrerSource;
      medium = 'organic';
      detectionMethod = 'referrer';
    }
  }

  return {
    source,
    medium,
    detectionMethod,
    utm: utmParams,
    referrer_url: referrer || null,
    landing_page: window.location.pathname,
    full_url: window.location.href,
  };
}

/**
 * Get tracking data for lead creation
 * Returns all tracking info formatted for the leads table
 * @returns {Object} Tracking data for lead
 */
export function getLeadTrackingData() {
  const detection = detectLeadSource();

  return {
    source: detection.source,
    utm_source: detection.utm.utm_source,
    utm_medium: detection.utm.utm_medium || detection.medium,
    utm_campaign: detection.utm.utm_campaign,
    utm_term: detection.utm.utm_term,
    utm_content: detection.utm.utm_content,
    referrer_url: detection.referrer_url,
    landing_page: detection.landing_page,
    metadata: {
      gclid: detection.utm.gclid,
      fbclid: detection.utm.fbclid,
      detection_method: detection.detectionMethod,
      full_url: detection.full_url,
    },
  };
}

/**
 * Store UTM params in session storage for persistence across pages
 * Call this on initial page load
 */
export function persistUTMParams() {
  const utmParams = parseUTMParams();
  const hasUTM = Object.values(utmParams).some(v => v !== null);

  if (hasUTM) {
    sessionStorage.setItem('miko_utm_params', JSON.stringify({
      ...utmParams,
      captured_at: new Date().toISOString(),
      landing_page: window.location.pathname,
      referrer: document.referrer,
    }));
  }
}

/**
 * Retrieve persisted UTM params from session storage
 * @returns {Object|null} Stored UTM params or null
 */
export function getPersistedUTMParams() {
  const stored = sessionStorage.getItem('miko_utm_params');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Get the best available tracking data
 * Prefers current URL params, falls back to persisted
 * @returns {Object} Complete tracking data
 */
export function getBestTrackingData() {
  const currentTracking = getLeadTrackingData();
  const persisted = getPersistedUTMParams();

  // If current page has no UTM but we have persisted data, merge it
  if (currentTracking.source === 'website' && persisted) {
    return {
      ...currentTracking,
      source: persisted.utm_source
        ? UTM_SOURCE_MAP[persisted.utm_source.toLowerCase()] || persisted.utm_source
        : currentTracking.source,
      utm_source: persisted.utm_source || currentTracking.utm_source,
      utm_medium: persisted.utm_medium || currentTracking.utm_medium,
      utm_campaign: persisted.utm_campaign || currentTracking.utm_campaign,
      landing_page: persisted.landing_page || currentTracking.landing_page,
      referrer_url: persisted.referrer || currentTracking.referrer_url,
      metadata: {
        ...currentTracking.metadata,
        gclid: persisted.gclid || currentTracking.metadata?.gclid,
        fbclid: persisted.fbclid || currentTracking.metadata?.fbclid,
        original_landing: persisted.landing_page,
      },
    };
  }

  return currentTracking;
}

export default {
  parseUTMParams,
  detectLeadSource,
  getLeadTrackingData,
  persistUTMParams,
  getPersistedUTMParams,
  getBestTrackingData,
};
