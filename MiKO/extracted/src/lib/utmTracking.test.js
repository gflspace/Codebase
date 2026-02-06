/**
 * UTM Tracking Tests
 *
 * Tests for:
 * - UTM parameter parsing
 * - Source detection from UTM params
 * - Source detection from referrer
 * - Click ID detection (gclid, fbclid)
 * - Session persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseUTMParams,
  detectLeadSource,
  getLeadTrackingData,
  persistUTMParams,
  getPersistedUTMParams,
  getBestTrackingData,
} from './utmTracking';

// Mock window.location
const mockLocation = (url) => {
  delete window.location;
  window.location = new URL(url);
};

// Mock document.referrer
const mockReferrer = (referrer) => {
  Object.defineProperty(document, 'referrer', {
    value: referrer,
    writable: true,
    configurable: true,
  });
};

// Mock sessionStorage
let sessionStore = {};
const mockSessionStorage = {
  getItem: vi.fn((key) => sessionStore[key] || null),
  setItem: vi.fn((key, value) => { sessionStore[key] = value; }),
  removeItem: vi.fn((key) => { delete sessionStore[key]; }),
  clear: vi.fn(() => { sessionStore = {}; }),
};
vi.stubGlobal('sessionStorage', mockSessionStorage);

describe('UTM Tracking', () => {
  beforeEach(() => {
    sessionStore = {};
    mockSessionStorage.getItem.mockClear();
    mockSessionStorage.setItem.mockClear();
    mockLocation('https://mikoplasticsurgery.com/');
    mockReferrer('');
  });

  // ===========================================
  // PARSE UTM PARAMS
  // ===========================================
  describe('parseUTMParams', () => {
    it('should parse UTM parameters from URL', () => {
      mockLocation('https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale');

      const params = parseUTMParams();

      expect(params.utm_source).toBe('google');
      expect(params.utm_medium).toBe('cpc');
      expect(params.utm_campaign).toBe('spring_sale');
    });

    it('should parse gclid (Google Click ID)', () => {
      mockLocation('https://example.com/?gclid=Cj0KCQjw123');

      const params = parseUTMParams();

      expect(params.gclid).toBe('Cj0KCQjw123');
    });

    it('should parse fbclid (Facebook Click ID)', () => {
      mockLocation('https://example.com/?fbclid=IwAR3xyz');

      const params = parseUTMParams();

      expect(params.fbclid).toBe('IwAR3xyz');
    });

    it('should return null for missing parameters', () => {
      mockLocation('https://example.com/');

      const params = parseUTMParams();

      expect(params.utm_source).toBeNull();
      expect(params.utm_medium).toBeNull();
      expect(params.gclid).toBeNull();
    });

    it('should parse all UTM parameters', () => {
      mockLocation('https://example.com/?utm_source=facebook&utm_medium=social&utm_campaign=promo&utm_term=rhinoplasty&utm_content=ad1');

      const params = parseUTMParams();

      expect(params.utm_source).toBe('facebook');
      expect(params.utm_medium).toBe('social');
      expect(params.utm_campaign).toBe('promo');
      expect(params.utm_term).toBe('rhinoplasty');
      expect(params.utm_content).toBe('ad1');
    });
  });

  // ===========================================
  // DETECT LEAD SOURCE
  // ===========================================
  describe('detectLeadSource', () => {
    it('should detect Google from gclid', () => {
      mockLocation('https://example.com/?gclid=abc123');

      const result = detectLeadSource();

      expect(result.source).toBe('google');
      expect(result.medium).toBe('cpc');
      expect(result.detectionMethod).toBe('gclid');
    });

    it('should detect Facebook from fbclid', () => {
      mockLocation('https://example.com/?fbclid=xyz789');

      const result = detectLeadSource();

      expect(result.source).toBe('facebook');
      expect(result.medium).toBe('cpc');
      expect(result.detectionMethod).toBe('fbclid');
    });

    it('should detect source from utm_source=google', () => {
      mockLocation('https://example.com/?utm_source=google&utm_medium=cpc');

      const result = detectLeadSource();

      expect(result.source).toBe('google');
      expect(result.medium).toBe('cpc');
      expect(result.detectionMethod).toBe('utm_source');
    });

    it('should detect source from utm_source=instagram', () => {
      mockLocation('https://example.com/?utm_source=instagram');

      const result = detectLeadSource();

      expect(result.source).toBe('instagram');
    });

    it('should detect source from utm_source=fb (Facebook abbreviation)', () => {
      mockLocation('https://example.com/?utm_source=fb');

      const result = detectLeadSource();

      expect(result.source).toBe('facebook');
    });

    it('should detect source from referrer when no UTM params', () => {
      mockLocation('https://example.com/');
      mockReferrer('https://www.google.com/search?q=plastic+surgery');

      const result = detectLeadSource();

      expect(result.source).toBe('google');
      expect(result.detectionMethod).toBe('referrer');
    });

    it('should detect Instagram from referrer', () => {
      mockLocation('https://example.com/');
      mockReferrer('https://l.instagram.com/?u=https://example.com');

      const result = detectLeadSource();

      expect(result.source).toBe('instagram');
    });

    it('should detect Facebook from referrer', () => {
      mockLocation('https://example.com/');
      mockReferrer('https://l.facebook.com/');

      const result = detectLeadSource();

      expect(result.source).toBe('facebook');
    });

    it('should return website as default when no signals', () => {
      mockLocation('https://example.com/');
      mockReferrer('');

      const result = detectLeadSource();

      expect(result.source).toBe('website');
      expect(result.detectionMethod).toBe('default');
    });

    it('should detect referral from unknown external referrer', () => {
      mockLocation('https://mikoplasticsurgery.com/');
      mockReferrer('https://someotherblog.com/best-plastic-surgeons');

      const result = detectLeadSource();

      expect(result.source).toBe('referral');
    });

    it('should prioritize gclid over utm_source', () => {
      mockLocation('https://example.com/?gclid=abc&utm_source=facebook');

      const result = detectLeadSource();

      expect(result.source).toBe('google');
      expect(result.detectionMethod).toBe('gclid');
    });
  });

  // ===========================================
  // GET LEAD TRACKING DATA
  // ===========================================
  describe('getLeadTrackingData', () => {
    it('should return complete tracking data for lead creation', () => {
      mockLocation('https://example.com/consultation?utm_source=google&utm_medium=cpc&utm_campaign=spring');
      mockReferrer('https://www.google.com/');

      const data = getLeadTrackingData();

      expect(data.source).toBe('google');
      expect(data.utm_source).toBe('google');
      expect(data.utm_medium).toBe('cpc');
      expect(data.utm_campaign).toBe('spring');
      expect(data.landing_page).toBe('/consultation');
      expect(data.referrer_url).toBe('https://www.google.com/');
    });

    it('should include gclid in metadata', () => {
      mockLocation('https://example.com/?gclid=abc123');

      const data = getLeadTrackingData();

      expect(data.metadata.gclid).toBe('abc123');
    });
  });

  // ===========================================
  // UTM PERSISTENCE
  // ===========================================
  describe('UTM Persistence', () => {
    it('should persist UTM params to sessionStorage', () => {
      mockLocation('https://example.com/?utm_source=google&utm_campaign=test');

      persistUTMParams();

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'miko_utm_params',
        expect.stringContaining('google')
      );
    });

    it('should not persist when no UTM params present', () => {
      mockLocation('https://example.com/');

      persistUTMParams();

      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it('should retrieve persisted UTM params', () => {
      sessionStore['miko_utm_params'] = JSON.stringify({
        utm_source: 'facebook',
        utm_campaign: 'promo',
      });

      const params = getPersistedUTMParams();

      expect(params.utm_source).toBe('facebook');
      expect(params.utm_campaign).toBe('promo');
    });

    it('should return null when no persisted params', () => {
      const params = getPersistedUTMParams();

      expect(params).toBeNull();
    });
  });

  // ===========================================
  // GET BEST TRACKING DATA
  // ===========================================
  describe('getBestTrackingData', () => {
    it('should use current URL params when available', () => {
      mockLocation('https://example.com/?utm_source=google');
      sessionStore['miko_utm_params'] = JSON.stringify({
        utm_source: 'facebook',
      });

      const data = getBestTrackingData();

      expect(data.source).toBe('google');
    });

    it('should fall back to persisted params when current has no UTM', () => {
      mockLocation('https://example.com/');
      mockReferrer('');
      sessionStore['miko_utm_params'] = JSON.stringify({
        utm_source: 'instagram',
        utm_campaign: 'bio_link',
        landing_page: '/rhinoplasty',
      });

      const data = getBestTrackingData();

      expect(data.source).toBe('instagram');
      expect(data.utm_campaign).toBe('bio_link');
    });
  });

  // ===========================================
  // SOURCE MAPPING TESTS
  // ===========================================
  describe('Source Mapping', () => {
    const testCases = [
      { utm_source: 'googleads', expected: 'google' },
      { utm_source: 'google-ads', expected: 'google' },
      { utm_source: 'adwords', expected: 'google' },
      { utm_source: 'fb', expected: 'facebook' },
      { utm_source: 'meta', expected: 'facebook' },
      { utm_source: 'ig', expected: 'instagram' },
      { utm_source: 'linkedin', expected: 'linkedin' },
      { utm_source: 'twitter', expected: 'twitter' },
      { utm_source: 'x', expected: 'twitter' },
      { utm_source: 'tiktok', expected: 'tiktok' },
      { utm_source: 'email', expected: 'email' },
      { utm_source: 'newsletter', expected: 'email' },
      { utm_source: 'referral', expected: 'referral' },
      { utm_source: 'partner', expected: 'referral' },
    ];

    testCases.forEach(({ utm_source, expected }) => {
      it(`should map utm_source="${utm_source}" to source="${expected}"`, () => {
        mockLocation(`https://example.com/?utm_source=${utm_source}`);

        const result = detectLeadSource();

        expect(result.source).toBe(expected);
      });
    });
  });
});
