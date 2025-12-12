/**
 * Citation Service
 * Handles CRUD operations for the citation manager.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import {
    Citation,
    CitationFilter,
    CitationSort,
    CitationSearchResult,
    UserCitationFavorite,
    matchesCitationFilter,
    sortCitations,
} from './citationTypes';

// Lazy client initialization
let _client: ReturnType<typeof generateClient<Schema>> | null = null;
function getClient() {
    if (!_client) {
        _client = generateClient<Schema>();
    }
    return _client;
}

// ============================================
// Helper Functions
// ============================================

function parseJsonField<T>(field: unknown, defaultValue: T): T {
    if (!field) return defaultValue;
    if (typeof field === 'string') {
        try {
            return JSON.parse(field) as T;
        } catch {
            return defaultValue;
        }
    }
    return field as T;
}

function mapCitationFromDB(data: Record<string, unknown>): Citation {
    return {
        id: data.id as string,
        title: data.title as string,
        citation: data.citation as string,
        type: data.type as Citation['type'],
        court: data.court as string | undefined,
        year: data.year as number | undefined,
        volume: data.volume as string | undefined,
        reporter: data.reporter as string | undefined,
        page: data.page as string | undefined,
        pinpoint: data.pinpoint as string | undefined,
        jurisdiction: data.jurisdiction as string | undefined,
        codeTitle: data.codeTitle as string | undefined,
        section: data.section as string | undefined,
        subdivision: data.subdivision as string | undefined,
        shortForm: data.shortForm as string | undefined,
        parenthetical: data.parenthetical as string | undefined,
        url: data.url as string | undefined,
        category: data.category as string | undefined,
        tags: parseJsonField(data.tags, []),
        usageCount: (data.usageCount as number) || 0,
        lastUsedAt: data.lastUsedAt as string | undefined,
        notes: data.notes as string | undefined,
        isVerified: (data.isVerified as boolean) ?? false,
        createdBy: data.createdBy as string | undefined,
        createdAt: data.createdAt as string,
        updatedAt: data.updatedAt as string,
    };
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new citation
 */
export async function createCitation(
    citation: Omit<Citation, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
): Promise<Citation | null> {
    const client = getClient();

    try {
        const { data, errors } = await client.models.Citation.create({
            title: citation.title,
            citation: citation.citation,
            type: citation.type,
            court: citation.court,
            year: citation.year,
            volume: citation.volume,
            reporter: citation.reporter,
            page: citation.page,
            pinpoint: citation.pinpoint,
            jurisdiction: citation.jurisdiction,
            codeTitle: citation.codeTitle,
            section: citation.section,
            subdivision: citation.subdivision,
            shortForm: citation.shortForm,
            parenthetical: citation.parenthetical,
            url: citation.url,
            category: citation.category,
            tags: JSON.stringify(citation.tags),
            usageCount: 0,
            notes: citation.notes,
            isVerified: citation.isVerified,
            createdBy: citation.createdBy,
        });

        if (errors) {
            console.error('Error creating citation:', errors);
            return null;
        }

        return mapCitationFromDB(data as Record<string, unknown>);
    } catch (error) {
        console.error('Error in createCitation:', error);
        return null;
    }
}

/**
 * Update an existing citation
 */
export async function updateCitation(
    id: string,
    updates: Partial<Omit<Citation, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Citation | null> {
    const client = getClient();

    try {
        const updateData: Record<string, unknown> = { id };

        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.citation !== undefined) updateData.citation = updates.citation;
        if (updates.type !== undefined) updateData.type = updates.type;
        if (updates.court !== undefined) updateData.court = updates.court;
        if (updates.year !== undefined) updateData.year = updates.year;
        if (updates.volume !== undefined) updateData.volume = updates.volume;
        if (updates.reporter !== undefined) updateData.reporter = updates.reporter;
        if (updates.page !== undefined) updateData.page = updates.page;
        if (updates.pinpoint !== undefined) updateData.pinpoint = updates.pinpoint;
        if (updates.jurisdiction !== undefined) updateData.jurisdiction = updates.jurisdiction;
        if (updates.codeTitle !== undefined) updateData.codeTitle = updates.codeTitle;
        if (updates.section !== undefined) updateData.section = updates.section;
        if (updates.subdivision !== undefined) updateData.subdivision = updates.subdivision;
        if (updates.shortForm !== undefined) updateData.shortForm = updates.shortForm;
        if (updates.parenthetical !== undefined) updateData.parenthetical = updates.parenthetical;
        if (updates.url !== undefined) updateData.url = updates.url;
        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
        if (updates.usageCount !== undefined) updateData.usageCount = updates.usageCount;
        if (updates.lastUsedAt !== undefined) updateData.lastUsedAt = updates.lastUsedAt;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.isVerified !== undefined) updateData.isVerified = updates.isVerified;

        const { data, errors } = await client.models.Citation.update(
            updateData as Parameters<typeof client.models.Citation.update>[0]
        );

        if (errors) {
            console.error('Error updating citation:', errors);
            return null;
        }

        return mapCitationFromDB(data as Record<string, unknown>);
    } catch (error) {
        console.error('Error in updateCitation:', error);
        return null;
    }
}

/**
 * Delete a citation
 */
export async function deleteCitation(id: string): Promise<boolean> {
    const client = getClient();

    try {
        const { errors } = await client.models.Citation.delete({ id });

        if (errors) {
            console.error('Error deleting citation:', errors);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in deleteCitation:', error);
        return false;
    }
}

/**
 * Get a single citation by ID
 */
export async function getCitation(id: string): Promise<Citation | null> {
    const client = getClient();

    try {
        const { data, errors } = await client.models.Citation.get({ id });

        if (errors || !data) {
            console.error('Error fetching citation:', errors);
            return null;
        }

        return mapCitationFromDB(data as Record<string, unknown>);
    } catch (error) {
        console.error('Error in getCitation:', error);
        return null;
    }
}

/**
 * Search citations with filtering and sorting
 */
export async function searchCitations(
    filter?: CitationFilter,
    sort?: CitationSort,
    limit: number = 50,
    nextToken?: string
): Promise<CitationSearchResult> {
    const client = getClient();

    try {
        let result;

        // Use GSI for type, jurisdiction, or category filtering when possible
        if (filter?.type && !filter.searchQuery) {
            result = await client.models.Citation.listCitationByTypeAndTitle(
                { type: filter.type },
                { limit, nextToken: nextToken || undefined }
            );
        } else if (filter?.jurisdiction && !filter.searchQuery) {
            result = await client.models.Citation.listCitationByJurisdictionAndType(
                { jurisdiction: filter.jurisdiction },
                { limit, nextToken: nextToken || undefined }
            );
        } else if (filter?.category && !filter.searchQuery) {
            result = await client.models.Citation.listCitationByCategoryAndTitle(
                { category: filter.category },
                { limit, nextToken: nextToken || undefined }
            );
        } else {
            // Default: list all
            result = await client.models.Citation.list({
                limit: limit * 2, // Fetch more for client-side filtering
                nextToken: nextToken || undefined,
            });
        }

        if (result.errors) {
            console.error('Error searching citations:', result.errors);
            return { citations: [], totalCount: 0 };
        }

        let citations = (result.data || []).map(d => mapCitationFromDB(d as Record<string, unknown>));

        // Apply client-side filtering for complex filters
        if (filter) {
            citations = citations.filter(citation => matchesCitationFilter(citation, filter));
        }

        // Apply sorting
        if (sort) {
            citations = sortCitations(citations, sort);
        } else {
            // Default sort by title
            citations = sortCitations(citations, { field: 'title', direction: 'asc' });
        }

        return {
            citations: citations.slice(0, limit),
            totalCount: citations.length,
            nextToken: result.nextToken || undefined,
        };
    } catch (error) {
        console.error('Error in searchCitations:', error);
        return { citations: [], totalCount: 0 };
    }
}

/**
 * Get all citations (for admin)
 */
export async function getAllCitations(): Promise<Citation[]> {
    const client = getClient();
    const allCitations: Citation[] = [];
    let nextToken: string | undefined;

    try {
        do {
            const { data, errors, nextToken: newToken } = await client.models.Citation.list({
                limit: 100,
                nextToken,
            });

            if (errors) {
                console.error('Error fetching all citations:', errors);
                break;
            }

            const citations = (data || []).map(d => mapCitationFromDB(d as Record<string, unknown>));
            allCitations.push(...citations);
            nextToken = newToken || undefined;
        } while (nextToken);

        return sortCitations(allCitations, { field: 'title', direction: 'asc' });
    } catch (error) {
        console.error('Error in getAllCitations:', error);
        return [];
    }
}

/**
 * Increment usage count for a citation
 */
export async function incrementCitationUsage(id: string): Promise<void> {
    const client = getClient();

    try {
        const { data: citation } = await client.models.Citation.get({ id });
        if (!citation) return;

        await client.models.Citation.update({
            id,
            usageCount: ((citation.usageCount as number) || 0) + 1,
            lastUsedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error incrementing citation usage:', error);
    }
}

/**
 * Get popular citations (most used)
 */
export async function getPopularCitations(limit: number = 10): Promise<Citation[]> {
    const result = await searchCitations(
        {},
        { field: 'usageCount', direction: 'desc' },
        limit
    );
    return result.citations;
}

/**
 * Get recently used citations
 */
export async function getRecentCitations(limit: number = 10): Promise<Citation[]> {
    const result = await searchCitations(
        {},
        { field: 'lastUsedAt', direction: 'desc' },
        limit
    );
    return result.citations.filter(c => c.lastUsedAt);
}

// ============================================
// User Favorites
// ============================================

/**
 * Add a citation to user's favorites
 */
export async function addCitationToFavorites(
    citationId: string,
    notes?: string
): Promise<UserCitationFavorite | null> {
    const client = getClient();

    try {
        const { data, errors } = await client.models.UserCitationFavorite.create({
            citationId,
            notes,
        });

        if (errors) {
            console.error('Error adding citation to favorites:', errors);
            return null;
        }

        return {
            id: data!.id,
            citationId: data!.citationId,
            notes: data!.notes || undefined,
            createdAt: data!.createdAt,
        };
    } catch (error) {
        console.error('Error in addCitationToFavorites:', error);
        return null;
    }
}

/**
 * Remove a citation from user's favorites
 */
export async function removeCitationFromFavorites(favoriteId: string): Promise<boolean> {
    const client = getClient();

    try {
        const { errors } = await client.models.UserCitationFavorite.delete({ id: favoriteId });

        if (errors) {
            console.error('Error removing citation from favorites:', errors);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in removeCitationFromFavorites:', error);
        return false;
    }
}

/**
 * Get user's favorite citations
 */
export async function getUserCitationFavorites(): Promise<{ favorite: UserCitationFavorite; citation: Citation }[]> {
    const client = getClient();

    try {
        const { data: favorites, errors } = await client.models.UserCitationFavorite.list();

        if (errors) {
            console.error('Error fetching user citation favorites:', errors);
            return [];
        }

        const results: { favorite: UserCitationFavorite; citation: Citation }[] = [];

        for (const fav of favorites || []) {
            const citation = await getCitation(fav.citationId);
            if (citation) {
                results.push({
                    favorite: {
                        id: fav.id,
                        citationId: fav.citationId,
                        notes: fav.notes || undefined,
                        createdAt: fav.createdAt,
                    },
                    citation,
                });
            }
        }

        return results;
    } catch (error) {
        console.error('Error in getUserCitationFavorites:', error);
        return [];
    }
}

// ============================================
// Citation Suggestions
// ============================================

/**
 * Get suggested citations based on document context
 */
export async function getSuggestedCitations(
    category?: string,
    jurisdiction?: string,
    existingCitationIds?: string[]
): Promise<Citation[]> {
    const result = await searchCitations({
        category,
        jurisdiction,
        isVerified: true,
    });

    let suggestions = result.citations;

    // Filter out citations already in the document
    if (existingCitationIds && existingCitationIds.length > 0) {
        suggestions = suggestions.filter(
            citation => !existingCitationIds.includes(citation.id)
        );
    }

    // Sort by usage count (most popular first)
    suggestions = sortCitations(suggestions, { field: 'usageCount', direction: 'desc' });

    return suggestions.slice(0, 10);
}

/**
 * Get citations by category
 */
export async function getCitationsByCategory(category: string): Promise<Citation[]> {
    const result = await searchCitations({ category });
    return result.citations;
}

/**
 * Get citation type counts
 */
export async function getCitationTypeCounts(): Promise<{ type: string; count: number }[]> {
    const citations = await getAllCitations();
    const counts: Record<string, number> = {};

    citations.forEach(citation => {
        counts[citation.type] = (counts[citation.type] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Get citation category counts
 */
export async function getCitationCategoryCounts(): Promise<{ category: string; count: number }[]> {
    const citations = await getAllCitations();
    const counts: Record<string, number> = {};

    citations.forEach(citation => {
        if (citation.category) {
            counts[citation.category] = (counts[citation.category] || 0) + 1;
        }
    });

    return Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
}

