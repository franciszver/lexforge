/**
 * Clause Service
 * Handles CRUD operations for the clause library.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import {
    Clause,
    ClauseFilter,
    ClauseSort,
    ClauseSearchResult,
    UserClauseFavorite,
    matchesFilter,
    sortClauses,
} from './clauseTypes';

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

function mapClauseFromDB(data: Record<string, unknown>): Clause {
    return {
        id: data.id as string,
        title: data.title as string,
        content: data.content as string,
        description: data.description as string | undefined,
        category: data.category as string,
        subcategory: data.subcategory as string | undefined,
        tags: parseJsonField(data.tags, []),
        jurisdiction: data.jurisdiction as string | undefined,
        documentTypes: parseJsonField(data.documentTypes, []),
        usageCount: (data.usageCount as number) || 0,
        lastUsedAt: data.lastUsedAt as string | undefined,
        variations: parseJsonField(data.variations, []),
        author: data.author as string | undefined,
        isPublished: (data.isPublished as boolean) ?? true,
        isFavorite: data.isFavorite as boolean | undefined,
        notes: data.notes as string | undefined,
        placeholders: parseJsonField(data.placeholders, []),
        createdAt: data.createdAt as string,
        updatedAt: data.updatedAt as string,
    };
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new clause
 */
export async function createClause(clause: Omit<Clause, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Clause | null> {
    const client = getClient();

    try {
        const { data, errors } = await client.models.Clause.create({
            title: clause.title,
            content: clause.content,
            description: clause.description,
            category: clause.category,
            subcategory: clause.subcategory,
            tags: JSON.stringify(clause.tags),
            jurisdiction: clause.jurisdiction,
            documentTypes: JSON.stringify(clause.documentTypes),
            usageCount: 0,
            variations: JSON.stringify(clause.variations),
            author: clause.author,
            isPublished: clause.isPublished,
            notes: clause.notes,
            placeholders: JSON.stringify(clause.placeholders),
        });

        if (errors) {
            console.error('Error creating clause:', errors);
            return null;
        }

        return mapClauseFromDB(data as Record<string, unknown>);
    } catch (error) {
        console.error('Error in createClause:', error);
        return null;
    }
}

/**
 * Update an existing clause
 */
export async function updateClause(id: string, updates: Partial<Omit<Clause, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Clause | null> {
    const client = getClient();

    try {
        const updateData: Record<string, unknown> = { id };

        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.content !== undefined) updateData.content = updates.content;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.subcategory !== undefined) updateData.subcategory = updates.subcategory;
        if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
        if (updates.jurisdiction !== undefined) updateData.jurisdiction = updates.jurisdiction;
        if (updates.documentTypes !== undefined) updateData.documentTypes = JSON.stringify(updates.documentTypes);
        if (updates.usageCount !== undefined) updateData.usageCount = updates.usageCount;
        if (updates.lastUsedAt !== undefined) updateData.lastUsedAt = updates.lastUsedAt;
        if (updates.variations !== undefined) updateData.variations = JSON.stringify(updates.variations);
        if (updates.author !== undefined) updateData.author = updates.author;
        if (updates.isPublished !== undefined) updateData.isPublished = updates.isPublished;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.placeholders !== undefined) updateData.placeholders = JSON.stringify(updates.placeholders);

        const { data, errors } = await client.models.Clause.update(updateData as Parameters<typeof client.models.Clause.update>[0]);

        if (errors) {
            console.error('Error updating clause:', errors);
            return null;
        }

        return mapClauseFromDB(data as Record<string, unknown>);
    } catch (error) {
        console.error('Error in updateClause:', error);
        return null;
    }
}

/**
 * Delete a clause
 */
export async function deleteClause(id: string): Promise<boolean> {
    const client = getClient();

    try {
        const { errors } = await client.models.Clause.delete({ id });

        if (errors) {
            console.error('Error deleting clause:', errors);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in deleteClause:', error);
        return false;
    }
}

/**
 * Get a single clause by ID
 */
export async function getClause(id: string): Promise<Clause | null> {
    const client = getClient();

    try {
        const { data, errors } = await client.models.Clause.get({ id });

        if (errors || !data) {
            console.error('Error fetching clause:', errors);
            return null;
        }

        return mapClauseFromDB(data as Record<string, unknown>);
    } catch (error) {
        console.error('Error in getClause:', error);
        return null;
    }
}

/**
 * Search clauses with filtering and sorting
 */
export async function searchClauses(
    filter?: ClauseFilter,
    sort?: ClauseSort,
    limit: number = 50,
    nextToken?: string
): Promise<ClauseSearchResult> {
    const client = getClient();

    try {
        let result;

        // Use GSI for category or jurisdiction filtering when possible
        if (filter?.category && !filter.searchQuery) {
            result = await client.models.Clause.listClauseByCategoryAndTitle(
                { category: filter.category },
                { limit, nextToken: nextToken || undefined }
            );
        } else if (filter?.jurisdiction && !filter.searchQuery) {
            result = await client.models.Clause.listClauseByJurisdictionAndCategory(
                { jurisdiction: filter.jurisdiction },
                { limit, nextToken: nextToken || undefined }
            );
        } else {
            // Default: list all
            result = await client.models.Clause.list({
                limit: limit * 2, // Fetch more for client-side filtering
                nextToken: nextToken || undefined,
            });
        }

        if (result.errors) {
            console.error('Error searching clauses:', result.errors);
            return { clauses: [], totalCount: 0 };
        }

        let clauses = (result.data || []).map(d => mapClauseFromDB(d as Record<string, unknown>));

        // Apply client-side filtering for complex filters
        if (filter) {
            clauses = clauses.filter(clause => matchesFilter(clause, filter));
        }

        // Apply sorting
        if (sort) {
            clauses = sortClauses(clauses, sort);
        } else {
            // Default sort by title
            clauses = sortClauses(clauses, { field: 'title', direction: 'asc' });
        }

        return {
            clauses: clauses.slice(0, limit),
            totalCount: clauses.length,
            nextToken: result.nextToken || undefined,
        };
    } catch (error) {
        console.error('Error in searchClauses:', error);
        return { clauses: [], totalCount: 0 };
    }
}

/**
 * Get all clauses (for admin)
 */
export async function getAllClauses(): Promise<Clause[]> {
    const client = getClient();
    const allClauses: Clause[] = [];
    let nextToken: string | undefined;

    try {
        do {
            const { data, errors, nextToken: newToken } = await client.models.Clause.list({
                limit: 100,
                nextToken,
            });

            if (errors) {
                console.error('Error fetching all clauses:', errors);
                break;
            }

            const clauses = (data || []).map(d => mapClauseFromDB(d as Record<string, unknown>));
            allClauses.push(...clauses);
            nextToken = newToken || undefined;
        } while (nextToken);

        return sortClauses(allClauses, { field: 'category', direction: 'asc' });
    } catch (error) {
        console.error('Error in getAllClauses:', error);
        return [];
    }
}

/**
 * Increment usage count for a clause
 */
export async function incrementClauseUsage(id: string): Promise<void> {
    const client = getClient();

    try {
        // Get current clause
        const { data: clause } = await client.models.Clause.get({ id });
        if (!clause) return;

        // Update usage
        await client.models.Clause.update({
            id,
            usageCount: ((clause.usageCount as number) || 0) + 1,
            lastUsedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error incrementing clause usage:', error);
    }
}

/**
 * Get popular clauses (most used)
 */
export async function getPopularClauses(limit: number = 10): Promise<Clause[]> {
    const result = await searchClauses(
        { isPublished: true },
        { field: 'usageCount', direction: 'desc' },
        limit
    );
    return result.clauses;
}

/**
 * Get recently used clauses
 */
export async function getRecentClauses(limit: number = 10): Promise<Clause[]> {
    const result = await searchClauses(
        { isPublished: true },
        { field: 'lastUsedAt', direction: 'desc' },
        limit
    );
    return result.clauses.filter(c => c.lastUsedAt);
}

// ============================================
// User Favorites
// ============================================

/**
 * Add a clause to user's favorites
 */
export async function addToFavorites(clauseId: string, notes?: string): Promise<UserClauseFavorite | null> {
    const client = getClient();

    try {
        const { data, errors } = await client.models.UserClauseFavorite.create({
            clauseId,
            notes,
        });

        if (errors) {
            console.error('Error adding to favorites:', errors);
            return null;
        }

        return {
            id: data!.id,
            clauseId: data!.clauseId,
            notes: data!.notes || undefined,
            createdAt: data!.createdAt,
        };
    } catch (error) {
        console.error('Error in addToFavorites:', error);
        return null;
    }
}

/**
 * Remove a clause from user's favorites
 */
export async function removeFromFavorites(favoriteId: string): Promise<boolean> {
    const client = getClient();

    try {
        const { errors } = await client.models.UserClauseFavorite.delete({ id: favoriteId });

        if (errors) {
            console.error('Error removing from favorites:', errors);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in removeFromFavorites:', error);
        return false;
    }
}

/**
 * Get user's favorite clauses
 */
export async function getUserFavorites(): Promise<{ favorite: UserClauseFavorite; clause: Clause }[]> {
    const client = getClient();

    try {
        const { data: favorites, errors } = await client.models.UserClauseFavorite.list();

        if (errors) {
            console.error('Error fetching user favorites:', errors);
            return [];
        }

        const results: { favorite: UserClauseFavorite; clause: Clause }[] = [];

        for (const fav of favorites || []) {
            const clause = await getClause(fav.clauseId);
            if (clause) {
                results.push({
                    favorite: {
                        id: fav.id,
                        clauseId: fav.clauseId,
                        notes: fav.notes || undefined,
                        createdAt: fav.createdAt,
                    },
                    clause,
                });
            }
        }

        return results;
    } catch (error) {
        console.error('Error in getUserFavorites:', error);
        return [];
    }
}

// ============================================
// Context-Based Suggestions
// ============================================

/**
 * Get suggested clauses based on document context
 */
export async function getSuggestedClauses(
    documentType: string,
    jurisdiction?: string,
    existingClauseCategories?: string[]
): Promise<Clause[]> {
    // Get clauses matching the document type
    const result = await searchClauses({
        documentType,
        jurisdiction,
        isPublished: true,
    });

    let suggestions = result.clauses;

    // Filter out categories already in the document
    if (existingClauseCategories && existingClauseCategories.length > 0) {
        suggestions = suggestions.filter(
            clause => !existingClauseCategories.includes(clause.category)
        );
    }

    // Sort by usage count (most popular first)
    suggestions = sortClauses(suggestions, { field: 'usageCount', direction: 'desc' });

    // Return top suggestions
    return suggestions.slice(0, 10);
}

/**
 * Get clauses by category
 */
export async function getClausesByCategory(category: string): Promise<Clause[]> {
    const result = await searchClauses({ category, isPublished: true });
    return result.clauses;
}

/**
 * Get clause categories with counts
 */
export async function getClauseCategoryCounts(): Promise<{ category: string; count: number }[]> {
    const clauses = await getAllClauses();
    const counts: Record<string, number> = {};

    clauses.forEach(clause => {
        counts[clause.category] = (counts[clause.category] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
}

