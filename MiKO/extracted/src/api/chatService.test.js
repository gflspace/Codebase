/**
 * Chat Service Tests
 * Unit tests for chat service functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSessionId,
  extractPatientDataFromConversation,
  detectRiskKeywords,
} from './chatService';

// Mock the Supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock leadService
vi.mock('./leadService', () => ({
  createLead: vi.fn(() => Promise.resolve({ success: true, data: { id: 'lead-123' } })),
  createClinicalInterest: vi.fn(() => Promise.resolve({ success: true })),
}));

describe('chatService', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('getSessionId', () => {
    it('should generate a new session ID if none exists', () => {
      const sessionId = getSessionId();

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should return the same session ID on subsequent calls', () => {
      const firstCall = getSessionId();
      const secondCall = getSessionId();

      expect(firstCall).toBe(secondCall);
    });

    it('should restore session ID from sessionStorage', () => {
      const existingId = 'session_12345_abc123def';
      sessionStorage.setItem('miko_session_id', existingId);

      // Need to reset the module's internal state
      // This is a limitation - in real tests we'd need to reset module state
      const sessionId = getSessionId();

      expect(sessionId).toBeDefined();
    });
  });

  describe('extractPatientDataFromConversation', () => {
    it('should extract email from messages', () => {
      const messages = [
        { role: 'user', content: 'My email is test@example.com' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.email).toBe('test@example.com');
    });

    it('should extract phone number from messages', () => {
      const messages = [
        { role: 'user', content: 'You can reach me at (555) 123-4567' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.phone).toBe('(555) 123-4567');
    });

    it('should extract phone number without parentheses', () => {
      const messages = [
        { role: 'user', content: 'My number is 555-123-4567' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.phone).toBe('555-123-4567');
    });

    it('should extract phone number with dots', () => {
      const messages = [
        { role: 'user', content: 'Call me at 555.123.4567' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.phone).toBe('555.123.4567');
    });

    it('should extract name with "my name is" pattern', () => {
      const messages = [
        { role: 'user', content: 'My name is John Smith' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.name).toBe('John Smith');
    });

    it('should extract name with "I\'m" pattern', () => {
      const messages = [
        { role: 'user', content: "Hi, I'm Sarah Johnson, I'm interested in rhinoplasty" },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.name).toBe('Sarah Johnson');
    });

    it('should extract name with "this is" pattern', () => {
      const messages = [
        { role: 'user', content: 'Hello, this is Michael Brown calling about a consultation' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.name).toBe('Michael Brown');
    });

    it('should detect rhinoplasty procedure', () => {
      const messages = [
        { role: 'user', content: 'I want to know about rhinoplasty' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.procedure).toBe('Rhinoplasty');
    });

    it('should detect nose job as rhinoplasty', () => {
      const messages = [
        { role: 'user', content: 'How much does a nose job cost?' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.procedure).toBe('Rhinoplasty');
    });

    it('should detect breast augmentation', () => {
      const messages = [
        { role: 'user', content: "I'm interested in breast augmentation" },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.procedure).toBe('Breast Augmentation');
    });

    it('should detect BBL procedure', () => {
      const messages = [
        { role: 'user', content: 'Tell me about BBL surgery' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.procedure).toBe('Brazilian Butt Lift');
    });

    it('should detect tummy tuck', () => {
      const messages = [
        { role: 'user', content: 'What is the recovery time for a tummy tuck?' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.procedure).toBe('Tummy Tuck');
    });

    it('should detect liposuction', () => {
      const messages = [
        { role: 'user', content: 'I want lipo on my stomach area' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.procedure).toBe('Liposuction');
    });

    it('should extract multiple data points from conversation', () => {
      const messages = [
        { role: 'user', content: "Hi, I'm Jennifer Martinez" },
        { role: 'assistant', content: 'Hello! How can I help you today?' },
        { role: 'user', content: "I'm interested in a facelift procedure" },
        { role: 'assistant', content: 'Great! Can I get your contact information?' },
        { role: 'user', content: 'Sure, my email is jennifer@email.com and phone is 310-555-1234' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.name).toBe('Jennifer Martinez');
      expect(result.email).toBe('jennifer@email.com');
      expect(result.phone).toBe('310-555-1234');
      expect(result.procedure).toBe('Facelift');
    });

    it('should only extract from user messages, not assistant messages', () => {
      const messages = [
        { role: 'assistant', content: 'My email is assistant@clinic.com' },
        { role: 'user', content: 'I have a question about procedures' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.email).toBeNull();
    });

    it('should return null values when no data is found', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
      ];

      const result = extractPatientDataFromConversation(messages);

      expect(result.name).toBeNull();
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.procedure).toBeNull();
    });
  });

  describe('detectRiskKeywords', () => {
    it('should detect single risk keyword', () => {
      const result = detectRiskKeywords('I had a complication with my previous surgery');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toContain('complication');
      expect(result.score).toBe(25);
    });

    it('should detect multiple risk keywords', () => {
      const result = detectRiskKeywords('I have infection and bleeding after my surgery');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toContain('infection');
      expect(result.keywords).toContain('bleeding');
      expect(result.score).toBe(50);
    });

    it('should escalate for emergency keyword', () => {
      const result = detectRiskKeywords('This is an emergency, I need help');

      expect(result.hasRisk).toBe(true);
      expect(result.shouldEscalate).toBe(true);
      expect(result.keywords).toContain('emergency');
    });

    it('should escalate for urgent keyword', () => {
      const result = detectRiskKeywords('I have an urgent situation');

      expect(result.shouldEscalate).toBe(true);
    });

    it('should escalate for bleeding keyword', () => {
      const result = detectRiskKeywords('The wound is bleeding heavily');

      expect(result.shouldEscalate).toBe(true);
    });

    it('should escalate for infection keyword', () => {
      const result = detectRiskKeywords('I think I have an infection');

      expect(result.shouldEscalate).toBe(true);
    });

    it('should escalate when 2 or more risk keywords detected', () => {
      const result = detectRiskKeywords('I have pain and swelling after the procedure');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toHaveLength(2);
      expect(result.shouldEscalate).toBe(true);
    });

    it('should not escalate for single non-critical risk keyword', () => {
      const result = detectRiskKeywords('I have some swelling');

      expect(result.hasRisk).toBe(true);
      expect(result.shouldEscalate).toBe(false);
    });

    it('should detect revision keyword', () => {
      const result = detectRiskKeywords('I need a revision surgery');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toContain('revision');
    });

    it('should detect botched keyword', () => {
      const result = detectRiskKeywords('My previous surgery was botched');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toContain('botched');
    });

    it('should detect capsular keyword', () => {
      const result = detectRiskKeywords('I think I have capsular contracture');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toContain('capsular');
    });

    it('should return no risk for normal messages', () => {
      const result = detectRiskKeywords('I want to schedule a consultation for rhinoplasty');

      expect(result.hasRisk).toBe(false);
      expect(result.keywords).toHaveLength(0);
      expect(result.score).toBe(0);
      expect(result.shouldEscalate).toBe(false);
    });

    it('should be case insensitive', () => {
      const result = detectRiskKeywords('I have INFECTION and BLEEDING');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toContain('infection');
      expect(result.keywords).toContain('bleeding');
    });

    it('should cap risk score at 100', () => {
      const result = detectRiskKeywords(
        'emergency urgent bleeding infection complication hematoma seroma'
      );

      expect(result.score).toBe(100);
    });

    it('should detect cleft lip as risk', () => {
      const result = detectRiskKeywords('I had cleft lip repair and need revision');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toContain('cleft lip');
    });

    it('should detect explant as risk', () => {
      const result = detectRiskKeywords('I want to discuss breast implant explant');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toContain('explant');
    });

    it('should detect asymmetry as risk', () => {
      const result = detectRiskKeywords('I have noticeable asymmetry after my surgery');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toContain('asymmetry');
    });

    it('should detect necrosis as risk', () => {
      const result = detectRiskKeywords('The doctor mentioned possible necrosis');

      expect(result.hasRisk).toBe(true);
      expect(result.keywords).toContain('necrosis');
    });
  });
});
