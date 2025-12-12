import { describe, it, expect } from 'vitest';
import {
    getUserColor,
    getUserInitials,
    getDisplayName,
    USER_COLORS,
    PRESENCE_CONFIG,
} from './presenceTypes';

// ============================================
// getUserColor Tests
// ============================================

describe('getUserColor', () => {
    it('should return a color from USER_COLORS', () => {
        const color = getUserColor('user-123');
        expect(USER_COLORS).toContain(color);
    });
    
    it('should return consistent color for same userId', () => {
        const color1 = getUserColor('user-abc');
        const color2 = getUserColor('user-abc');
        expect(color1).toBe(color2);
    });
    
    it('should return different colors for different userIds', () => {
        const color1 = getUserColor('user-aaa');
        const color2 = getUserColor('user-bbb');
        const color3 = getUserColor('user-ccc');
        
        // At least 2 of 3 should be different (statistical likelihood)
        const uniqueColors = new Set([color1, color2, color3]);
        expect(uniqueColors.size).toBeGreaterThanOrEqual(2);
    });
    
    it('should handle empty string', () => {
        const color = getUserColor('');
        expect(USER_COLORS).toContain(color);
    });
    
    it('should handle special characters', () => {
        const color = getUserColor('user@example.com#123!');
        expect(USER_COLORS).toContain(color);
    });
});

// ============================================
// getUserInitials Tests
// ============================================

describe('getUserInitials', () => {
    it('should return first letter of each word for multi-word name', () => {
        expect(getUserInitials('John Doe')).toBe('JD');
        expect(getUserInitials('Jane Smith')).toBe('JS');
    });
    
    it('should use first and last name for names with middle parts', () => {
        expect(getUserInitials('John Michael Doe')).toBe('JD');
        expect(getUserInitials('Mary Jane Watson Parker')).toBe('MP');
    });
    
    it('should return first two letters for single word name', () => {
        expect(getUserInitials('John')).toBe('JO');
        expect(getUserInitials('X')).toBe('X');
    });
    
    it('should use email if name is not provided', () => {
        expect(getUserInitials(undefined, 'john@example.com')).toBe('JO');
        expect(getUserInitials('', 'jane@test.org')).toBe('JA');
    });
    
    it('should return ?? if neither name nor email provided', () => {
        expect(getUserInitials()).toBe('??');
        expect(getUserInitials(undefined, undefined)).toBe('??');
    });
    
    it('should handle names with extra whitespace', () => {
        expect(getUserInitials('  John   Doe  ')).toBe('JD');
    });
    
    it('should return uppercase initials', () => {
        expect(getUserInitials('john doe')).toBe('JD');
    });
});

// ============================================
// getDisplayName Tests
// ============================================

describe('getDisplayName', () => {
    it('should return name if provided', () => {
        expect(getDisplayName('John Doe')).toBe('John Doe');
        expect(getDisplayName('Jane', 'jane@example.com')).toBe('Jane');
    });
    
    it('should return email username if name not provided', () => {
        expect(getDisplayName(undefined, 'john@example.com')).toBe('john');
        expect(getDisplayName('', 'jane.doe@company.org')).toBe('jane.doe');
    });
    
    it('should return full email if no @ symbol', () => {
        expect(getDisplayName(undefined, 'localuser')).toBe('localuser');
    });
    
    it('should return Anonymous if neither name nor email provided', () => {
        expect(getDisplayName()).toBe('Anonymous');
        expect(getDisplayName(undefined, undefined)).toBe('Anonymous');
        expect(getDisplayName('', '')).toBe('Anonymous');
    });
});

// ============================================
// PRESENCE_CONFIG Tests
// ============================================

describe('PRESENCE_CONFIG', () => {
    it('should have reasonable heartbeat interval', () => {
        expect(PRESENCE_CONFIG.HEARTBEAT_INTERVAL).toBeGreaterThanOrEqual(10000);
        expect(PRESENCE_CONFIG.HEARTBEAT_INTERVAL).toBeLessThanOrEqual(60000);
    });
    
    it('should have presence timeout greater than heartbeat', () => {
        expect(PRESENCE_CONFIG.PRESENCE_TIMEOUT).toBeGreaterThan(PRESENCE_CONFIG.HEARTBEAT_INTERVAL);
    });
    
    it('should have reasonable cleanup interval', () => {
        expect(PRESENCE_CONFIG.CLEANUP_INTERVAL).toBeGreaterThanOrEqual(5000);
        expect(PRESENCE_CONFIG.CLEANUP_INTERVAL).toBeLessThanOrEqual(PRESENCE_CONFIG.HEARTBEAT_INTERVAL);
    });
    
    it('should have lock expiration greater than heartbeat', () => {
        expect(PRESENCE_CONFIG.LOCK_EXPIRATION).toBeGreaterThan(PRESENCE_CONFIG.HEARTBEAT_INTERVAL);
    });
});

// ============================================
// USER_COLORS Tests
// ============================================

describe('USER_COLORS', () => {
    it('should contain at least 6 colors', () => {
        expect(USER_COLORS.length).toBeGreaterThanOrEqual(6);
    });
    
    it('should contain valid hex colors', () => {
        const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
        USER_COLORS.forEach(color => {
            expect(color).toMatch(hexColorRegex);
        });
    });
    
    it('should not contain duplicate colors', () => {
        const uniqueColors = new Set(USER_COLORS);
        expect(uniqueColors.size).toBe(USER_COLORS.length);
    });
});

