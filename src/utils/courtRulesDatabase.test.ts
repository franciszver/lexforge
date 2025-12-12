/**
 * Unit tests for Court Rules Database
 */

import { describe, it, expect } from 'vitest';
import {
    FEDERAL_RULES,
    CALIFORNIA_RULES,
    NEW_YORK_RULES,
    TEXAS_RULES,
    ALL_COURT_RULES,
    getAllCourts,
    getCourtById,
    getCourtsByJurisdiction,
    getCourtsByLevel,
    getFederalCourts,
    getStateCourts,
    searchCourts,
    getJurisdictions,
} from './courtRulesDatabase';

describe('Court Rules Database', () => {
    describe('Data Integrity', () => {
        it('should have federal court rules', () => {
            expect(FEDERAL_RULES.length).toBeGreaterThan(0);
        });

        it('should have California court rules', () => {
            expect(CALIFORNIA_RULES.length).toBeGreaterThan(0);
        });

        it('should have New York court rules', () => {
            expect(NEW_YORK_RULES.length).toBeGreaterThan(0);
        });

        it('should have Texas court rules', () => {
            expect(TEXAS_RULES.length).toBeGreaterThan(0);
        });

        it('should combine all rules correctly', () => {
            const totalExpected = FEDERAL_RULES.length + CALIFORNIA_RULES.length + NEW_YORK_RULES.length + TEXAS_RULES.length;
            expect(ALL_COURT_RULES.length).toBe(totalExpected);
        });

        it('should have required fields for each court', () => {
            ALL_COURT_RULES.forEach(court => {
                expect(court.id).toBeTruthy();
                expect(court.courtName).toBeTruthy();
                expect(court.courtLevel).toBeTruthy();
                expect(court.jurisdiction).toBeTruthy();
                expect(court.font).toBeTruthy();
                expect(court.margins).toBeTruthy();
                expect(court.page).toBeTruthy();
                expect(court.caption).toBeTruthy();
                expect(court.signature).toBeTruthy();
                expect(court.certificateOfService).toBeTruthy();
            });
        });

        it('should have unique IDs', () => {
            const ids = ALL_COURT_RULES.map(c => c.id);
            const uniqueIds = new Set(ids);
            expect(ids.length).toBe(uniqueIds.size);
        });
    });

    describe('getAllCourts', () => {
        it('should return all courts', () => {
            const courts = getAllCourts();
            expect(courts.length).toBe(ALL_COURT_RULES.length);
        });
    });

    describe('getCourtById', () => {
        it('should find court by ID', () => {
            const court = getCourtById('ndcal');
            expect(court).toBeTruthy();
            expect(court?.courtName).toContain('Northern District of California');
        });

        it('should find Supreme Court', () => {
            const court = getCourtById('scotus');
            expect(court).toBeTruthy();
            expect(court?.courtLevel).toBe('supreme');
        });

        it('should return undefined for invalid ID', () => {
            const court = getCourtById('invalid-court-id');
            expect(court).toBeUndefined();
        });
    });

    describe('getCourtsByJurisdiction', () => {
        it('should find federal courts', () => {
            const courts = getCourtsByJurisdiction('Federal');
            expect(courts.length).toBeGreaterThan(0);
            expect(courts.every(c => c.jurisdiction.includes('Federal') || c.jurisdiction.includes('Circuit'))).toBe(true);
        });

        it('should find California courts', () => {
            const courts = getCourtsByJurisdiction('California');
            expect(courts.length).toBeGreaterThan(0);
        });

        it('should find courts case-insensitively', () => {
            const courts = getCourtsByJurisdiction('california');
            expect(courts.length).toBeGreaterThan(0);
        });

        it('should return empty array for unknown jurisdiction', () => {
            const courts = getCourtsByJurisdiction('Unknown Jurisdiction');
            expect(courts.length).toBe(0);
        });
    });

    describe('getCourtsByLevel', () => {
        it('should find district courts', () => {
            const courts = getCourtsByLevel('district');
            expect(courts.length).toBeGreaterThan(0);
            expect(courts.every(c => c.courtLevel === 'district')).toBe(true);
        });

        it('should find appellate courts', () => {
            const courts = getCourtsByLevel('appellate');
            expect(courts.length).toBeGreaterThan(0);
        });

        it('should find state trial courts', () => {
            const courts = getCourtsByLevel('state_trial');
            expect(courts.length).toBeGreaterThan(0);
        });
    });

    describe('getFederalCourts', () => {
        it('should return only federal courts', () => {
            const courts = getFederalCourts();
            expect(courts.length).toBe(FEDERAL_RULES.length);
        });
    });

    describe('getStateCourts', () => {
        it('should return state courts', () => {
            const courts = getStateCourts();
            const stateTotal = CALIFORNIA_RULES.length + NEW_YORK_RULES.length + TEXAS_RULES.length;
            expect(courts.length).toBe(stateTotal);
        });
    });

    describe('searchCourts', () => {
        it('should search by court name', () => {
            const courts = searchCourts('Supreme');
            expect(courts.length).toBeGreaterThan(0);
        });

        it('should search by jurisdiction', () => {
            const courts = searchCourts('California');
            expect(courts.length).toBeGreaterThan(0);
        });

        it('should be case-insensitive', () => {
            const courts = searchCourts('northern district');
            expect(courts.length).toBeGreaterThan(0);
        });

        it('should return empty for no matches', () => {
            const courts = searchCourts('xyznonexistent');
            expect(courts.length).toBe(0);
        });
    });

    describe('getJurisdictions', () => {
        it('should return unique jurisdictions', () => {
            const jurisdictions = getJurisdictions();
            expect(jurisdictions.length).toBeGreaterThan(0);
            
            // Check for uniqueness
            const uniqueJurisdictions = new Set(jurisdictions);
            expect(jurisdictions.length).toBe(uniqueJurisdictions.size);
        });

        it('should include major jurisdictions', () => {
            const jurisdictions = getJurisdictions();
            expect(jurisdictions.some(j => j === 'Federal' || j.includes('Federal'))).toBe(true);
            expect(jurisdictions.some(j => j.includes('California'))).toBe(true);
        });
    });

    describe('Court Rule Content', () => {
        it('SCOTUS should have specific formatting rules', () => {
            const scotus = getCourtById('scotus');
            expect(scotus).toBeTruthy();
            expect(scotus!.font.family).toContain('Century Schoolbook');
            expect(scotus!.tableOfContents?.required).toBe(true);
            expect(scotus!.tableOfAuthorities?.required).toBe(true);
            expect(scotus!.wordCount?.maxWords).toBe(15000);
        });

        it('9th Circuit should have 14pt font', () => {
            const ninthCircuit = getCourtById('9th-circuit');
            expect(ninthCircuit).toBeTruthy();
            expect(ninthCircuit!.font.sizeBody).toBe(14);
        });

        it('California courts should have declaration-style certificate', () => {
            const caCourt = getCourtById('ca-supreme');
            expect(caCourt).toBeTruthy();
            expect(caCourt!.certificateOfService.format).toBe('declaration');
        });

        it('New York courts should have affidavit-style certificate', () => {
            const nyCourt = getCourtById('ny-appeals');
            expect(nyCourt).toBeTruthy();
            expect(nyCourt!.certificateOfService.format).toBe('affidavit');
        });
    });
});

