/**
 * Clause Library Service
 * 
 * Manages the searchable clause library for legal documents.
 * Supports browsing, searching, and inserting clauses into documents.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { Clause, ClauseVariation } from './clauseTypes';
import type { PlaceholderDefinition } from './templateTypes';

// Re-export types for convenience
export type { Clause, ClauseVariation } from './clauseTypes';

// ============================================
// Types
// ============================================

export interface ClauseSearchParams {
    query?: string;
    category?: string;
    jurisdiction?: string;
    documentType?: string;
    tags?: string[];
    limit?: number;
}

export interface ClauseCategory {
    name: string;
    count: number;
    subcategories?: string[];
}

// ============================================
// Client
// ============================================

let client: ReturnType<typeof generateClient<Schema>> | null = null;

function getClient() {
    if (!client) {
        client = generateClient<Schema>();
    }
    return client;
}

// ============================================
// Clause Operations
// ============================================

/**
 * Search clauses with filters
 */
export async function searchClauses(params: ClauseSearchParams): Promise<Clause[]> {
    const client = getClient();
    
    // Build filter
    const filter: Record<string, unknown> = {
        isPublished: { eq: true },
    };
    
    if (params.category) {
        filter.category = { eq: params.category };
    }
    
    if (params.jurisdiction) {
        filter.jurisdiction = { eq: params.jurisdiction };
    }
    
    const result = await client.models.Clause.list({
        filter,
        limit: params.limit || 50,
    });
    
    let clauses = result.data.map(mapClause);
    
    // Client-side search if query provided
    if (params.query) {
        const query = params.query.toLowerCase();
        clauses = clauses.filter(c => 
            c.title.toLowerCase().includes(query) ||
            c.content.toLowerCase().includes(query) ||
            c.description?.toLowerCase().includes(query) ||
            c.tags?.some(t => t.toLowerCase().includes(query))
        );
    }
    
    // Filter by document type if provided
    if (params.documentType) {
        clauses = clauses.filter(c => 
            !c.documentTypes || c.documentTypes.includes(params.documentType!)
        );
    }
    
    // Filter by tags if provided
    if (params.tags && params.tags.length > 0) {
        clauses = clauses.filter(c => 
            c.tags?.some(t => params.tags!.includes(t))
        );
    }
    
    // Sort by usage count (most popular first)
    clauses.sort((a, b) => b.usageCount - a.usageCount);
    
    return clauses;
}

/**
 * Get a single clause by ID
 */
export async function getClause(id: string): Promise<Clause | null> {
    const client = getClient();
    
    const result = await client.models.Clause.get({ id });
    
    if (!result.data) return null;
    
    return mapClause(result.data);
}

/**
 * Get all categories with counts
 */
export async function getCategories(): Promise<ClauseCategory[]> {
    const client = getClient();
    
    const result = await client.models.Clause.list({
        filter: { isPublished: { eq: true } },
    });
    
    // Group by category
    const categoryMap = new Map<string, number>();
    
    for (const clause of result.data) {
        const category = clause.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    }
    
    return Array.from(categoryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Increment usage count when a clause is inserted
 */
export async function recordClauseUsage(clauseId: string): Promise<void> {
    const client = getClient();
    
    const clause = await client.models.Clause.get({ id: clauseId });
    if (!clause.data) return;
    
    await client.models.Clause.update({
        id: clauseId,
        usageCount: (clause.data.usageCount || 0) + 1,
        lastUsedAt: new Date().toISOString(),
    });
    
    console.log('[Clause] Recorded usage for clause:', clauseId);
}

/**
 * Toggle favorite status for current user
 */
export async function toggleFavorite(clauseId: string): Promise<boolean> {
    const client = getClient();
    
    // Check if already favorited
    const existing = await client.models.UserClauseFavorite.list({
        filter: { clauseId: { eq: clauseId } },
    });
    
    if (existing.data.length > 0) {
        // Remove favorite
        await client.models.UserClauseFavorite.delete({ id: existing.data[0].id });
        return false;
    } else {
        // Add favorite
        await client.models.UserClauseFavorite.create({
            clauseId,
        });
        return true;
    }
}

/**
 * Get user's favorite clause IDs
 */
export async function getUserFavorites(): Promise<string[]> {
    const client = getClient();
    
    const result = await client.models.UserClauseFavorite.list();
    
    return result.data.map(f => f.clauseId);
}

// ============================================
// Admin Operations
// ============================================

/**
 * Create a new clause (admin only)
 */
export async function createClause(data: Omit<Clause, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): Promise<Clause> {
    const client = getClient();
    
    const result = await client.models.Clause.create({
        title: data.title,
        content: data.content,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        jurisdiction: data.jurisdiction,
        documentTypes: data.documentTypes ? JSON.stringify(data.documentTypes) : null,
        usageCount: 0,
        variations: data.variations ? JSON.stringify(data.variations) : null,
        placeholders: data.placeholders ? JSON.stringify(data.placeholders) : null,
        isPublished: true,
    });
    
    if (!result.data) {
        throw new Error('Failed to create clause');
    }
    
    return mapClause(result.data);
}

/**
 * Update an existing clause (admin only)
 */
export async function updateClause(id: string, data: Partial<Omit<Clause, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Clause> {
    const client = getClient();
    
    const updateData: Record<string, unknown> = { id };
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.subcategory !== undefined) updateData.subcategory = data.subcategory;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.jurisdiction !== undefined) updateData.jurisdiction = data.jurisdiction;
    if (data.documentTypes !== undefined) updateData.documentTypes = JSON.stringify(data.documentTypes);
    if (data.variations !== undefined) updateData.variations = JSON.stringify(data.variations);
    if (data.placeholders !== undefined) updateData.placeholders = JSON.stringify(data.placeholders);
    
    const result = await client.models.Clause.update(updateData as Parameters<typeof client.models.Clause.update>[0]);
    
    if (!result.data) {
        throw new Error('Failed to update clause');
    }
    
    return mapClause(result.data);
}

/**
 * Delete a clause (admin only)
 */
export async function deleteClause(id: string): Promise<void> {
    const client = getClient();
    
    await client.models.Clause.delete({ id });
}

/**
 * Get popular clauses (most used)
 */
export async function getPopularClauses(limit: number = 10): Promise<Clause[]> {
    const clauses = await searchClauses({ limit: limit * 2 });
    return clauses
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limit);
}

/**
 * Get recently used clauses
 */
export async function getRecentClauses(limit: number = 10): Promise<Clause[]> {
    const clauses = await searchClauses({ limit: limit * 2 });
    return clauses
        .filter(c => c.lastUsedAt)
        .sort((a, b) => {
            const dateA = new Date(a.lastUsedAt || 0).getTime();
            const dateB = new Date(b.lastUsedAt || 0).getTime();
            return dateB - dateA;
        })
        .slice(0, limit);
}

/**
 * Increment clause usage count
 */
export async function incrementClauseUsage(clauseId: string): Promise<void> {
    return recordClauseUsage(clauseId);
}

/**
 * Add clause to favorites
 */
export async function addToFavorites(clauseId: string): Promise<string> {
    const client = getClient();
    
    const result = await client.models.UserClauseFavorite.create({
        clauseId,
    });
    
    return result.data?.id || '';
}

/**
 * Remove clause from favorites
 */
export async function removeFromFavorites(favoriteId: string): Promise<void> {
    const client = getClient();
    
    await client.models.UserClauseFavorite.delete({ id: favoriteId });
}

/**
 * Get user's favorites with clause data
 */
export async function getUserFavoritesWithClauses(): Promise<Array<{ clause: Clause; favoriteId: string }>> {
    const client = getClient();
    
    const favorites = await client.models.UserClauseFavorite.list();
    const result: Array<{ clause: Clause; favoriteId: string }> = [];
    
    for (const fav of favorites.data) {
        const clause = await getClause(fav.clauseId);
        if (clause) {
            result.push({ clause, favoriteId: fav.id });
        }
    }
    
    return result;
}

/**
 * Get suggested clauses based on document context
 */
export async function getSuggestedClauses(
    documentType?: string,
    jurisdiction?: string,
    excludeCategories?: string[]
): Promise<Clause[]> {
    const clauses = await searchClauses({
        documentType,
        jurisdiction,
        limit: 20,
    });
    
    if (excludeCategories && excludeCategories.length > 0) {
        return clauses.filter(c => !excludeCategories.includes(c.category));
    }
    
    return clauses;
}

/**
 * Get clauses by category
 */
export async function getClausesByCategory(category: string): Promise<Clause[]> {
    return searchClauses({ category });
}

// ============================================
// Helpers
// ============================================

function parseJsonField<T>(value: unknown, defaultValue: T): T {
    if (!value) return defaultValue;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as T;
        } catch {
            return defaultValue;
        }
    }
    return value as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClause(data: any): Clause {
    return {
        id: data.id,
        title: data.title,
        content: data.content,
        description: data.description || undefined,
        category: data.category,
        subcategory: data.subcategory || undefined,
        tags: parseJsonField<string[]>(data.tags, []),
        jurisdiction: data.jurisdiction || undefined,
        documentTypes: parseJsonField<string[]>(data.documentTypes, []),
        usageCount: data.usageCount || 0,
        lastUsedAt: data.lastUsedAt || undefined,
        variations: parseJsonField<ClauseVariation[]>(data.variations, []),
        placeholders: parseJsonField<PlaceholderDefinition[]>(data.placeholders, []),
        isPublished: data.isPublished ?? true,
        isFavorite: data.isFavorite ?? false,
        author: data.author || undefined,
        notes: data.notes || undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}

// Note: Sample clauses should be seeded to DynamoDB directly via Admin UI or seed script
