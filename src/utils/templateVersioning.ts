/**
 * Template Versioning Service
 * Manages template versions and history tracking.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import {
    PlaceholderDefinition,
    TemplateSection,
    VariableMap,
    EnhancedTemplate,
    TemplateVersion,
} from './templateTypes';

// Lazy client initialization
let _client: ReturnType<typeof generateClient<Schema>> | null = null;
function getClient() {
    if (!_client) {
        _client = generateClient<Schema>();
    }
    return _client;
}

// ============================================
// Types
// ============================================

interface CreateVersionParams {
    templateId: string;
    name: string;
    category: string;
    skeletonContent: string;
    placeholders: PlaceholderDefinition[];
    sections: TemplateSection[];
    variables: VariableMap;
    createdBy: string;
    changeNotes?: string;
}

interface TemplateWithVersions extends EnhancedTemplate {
    versions: TemplateVersion[];
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

// ============================================
// Version Management
// ============================================

/**
 * Create a new version of a template
 */
export async function createTemplateVersion(params: CreateVersionParams): Promise<TemplateVersion | null> {
    const client = getClient();

    try {
        // Get current version number
        const { data: existingVersions } = await client.models.TemplateVersion.listTemplateVersionByTemplateIdAndVersion(
            { templateId: params.templateId },
            { sortDirection: 'DESC', limit: 1 }
        );

        const currentVersion = existingVersions?.[0]?.version || 0;
        const newVersion = currentVersion + 1;

        // Create the version record
        const { data, errors } = await client.models.TemplateVersion.create({
            templateId: params.templateId,
            version: newVersion,
            name: params.name,
            category: params.category,
            skeletonContent: params.skeletonContent,
            placeholders: JSON.stringify(params.placeholders),
            sections: JSON.stringify(params.sections),
            variables: JSON.stringify(params.variables),
            createdBy: params.createdBy,
            changeNotes: params.changeNotes,
        });

        if (errors) {
            console.error('Error creating template version:', errors);
            return null;
        }

        // Update the main template with new version number
        await client.models.Template.update({
            id: params.templateId,
            version: newVersion,
            skeletonContent: params.skeletonContent,
            placeholders: JSON.stringify(params.placeholders),
            sections: JSON.stringify(params.sections),
            variables: JSON.stringify(params.variables),
        });

        return {
            id: data!.id,
            templateId: data!.templateId,
            version: data!.version,
            name: data!.name || '',
            category: data!.category || '',
            skeletonContent: data!.skeletonContent || '',
            placeholders: parseJsonField(data!.placeholders, []),
            sections: parseJsonField(data!.sections, []),
            variables: parseJsonField(data!.variables, {}),
            createdBy: data!.createdBy || '',
            changeNotes: data!.changeNotes || undefined,
            createdAt: data!.createdAt,
        };
    } catch (error) {
        console.error('Error in createTemplateVersion:', error);
        return null;
    }
}

/**
 * Get all versions of a template
 */
export async function getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    const client = getClient();

    try {
        const { data, errors } = await client.models.TemplateVersion.listTemplateVersionByTemplateIdAndVersion(
            { templateId },
            { sortDirection: 'DESC' }
        );

        if (errors) {
            console.error('Error fetching template versions:', errors);
            return [];
        }

        return (data || []).map(v => ({
            id: v.id,
            templateId: v.templateId,
            version: v.version,
            name: v.name || '',
            category: v.category || '',
            skeletonContent: v.skeletonContent || '',
            placeholders: parseJsonField(v.placeholders, []),
            sections: parseJsonField(v.sections, []),
            variables: parseJsonField(v.variables, {}),
            createdBy: v.createdBy || '',
            changeNotes: v.changeNotes || undefined,
            createdAt: v.createdAt,
        }));
    } catch (error) {
        console.error('Error in getTemplateVersions:', error);
        return [];
    }
}

/**
 * Get a specific version of a template
 */
export async function getTemplateVersion(templateId: string, version: number): Promise<TemplateVersion | null> {
    const client = getClient();

    try {
        const { data, errors } = await client.models.TemplateVersion.listTemplateVersionByTemplateIdAndVersion(
            { templateId, version: { eq: version } }
        );

        if (errors || !data?.[0]) {
            console.error('Error fetching template version:', errors);
            return null;
        }

        const v = data[0];
        return {
            id: v.id,
            templateId: v.templateId,
            version: v.version,
            name: v.name || '',
            category: v.category || '',
            skeletonContent: v.skeletonContent || '',
            placeholders: parseJsonField(v.placeholders, []),
            sections: parseJsonField(v.sections, []),
            variables: parseJsonField(v.variables, {}),
            createdBy: v.createdBy || '',
            changeNotes: v.changeNotes || undefined,
            createdAt: v.createdAt,
        };
    } catch (error) {
        console.error('Error in getTemplateVersion:', error);
        return null;
    }
}

/**
 * Restore a template to a specific version
 */
export async function restoreTemplateVersion(
    templateId: string,
    version: number,
    restoredBy: string
): Promise<boolean> {
    const client = getClient();

    try {
        // Get the version to restore
        const versionToRestore = await getTemplateVersion(templateId, version);
        if (!versionToRestore) {
            console.error('Version not found');
            return false;
        }

        // Create a new version with the restored content
        await createTemplateVersion({
            templateId,
            name: versionToRestore.name,
            category: versionToRestore.category,
            skeletonContent: versionToRestore.skeletonContent,
            placeholders: versionToRestore.placeholders,
            sections: versionToRestore.sections,
            variables: versionToRestore.variables,
            createdBy: restoredBy,
            changeNotes: `Restored from version ${version}`,
        });

        return true;
    } catch (error) {
        console.error('Error in restoreTemplateVersion:', error);
        return false;
    }
}

/**
 * Compare two versions of a template
 */
export function compareVersions(
    versionA: TemplateVersion,
    versionB: TemplateVersion
): {
    contentChanged: boolean;
    placeholdersChanged: boolean;
    sectionsChanged: boolean;
    summary: string[];
} {
    const summary: string[] = [];

    const contentChanged = versionA.skeletonContent !== versionB.skeletonContent;
    if (contentChanged) {
        summary.push('Content was modified');
    }

    const placeholdersChanged = JSON.stringify(versionA.placeholders) !== JSON.stringify(versionB.placeholders);
    if (placeholdersChanged) {
        const addedPlaceholders = versionB.placeholders.filter(
            p => !versionA.placeholders.some(ap => ap.name === p.name)
        );
        const removedPlaceholders = versionA.placeholders.filter(
            p => !versionB.placeholders.some(bp => bp.name === p.name)
        );
        
        if (addedPlaceholders.length > 0) {
            summary.push(`Added placeholders: ${addedPlaceholders.map(p => p.name).join(', ')}`);
        }
        if (removedPlaceholders.length > 0) {
            summary.push(`Removed placeholders: ${removedPlaceholders.map(p => p.name).join(', ')}`);
        }
    }

    const sectionsChanged = JSON.stringify(versionA.sections) !== JSON.stringify(versionB.sections);
    if (sectionsChanged) {
        const addedSections = versionB.sections.filter(
            s => !versionA.sections.some(as => as.id === s.id)
        );
        const removedSections = versionA.sections.filter(
            s => !versionB.sections.some(bs => bs.id === s.id)
        );
        
        if (addedSections.length > 0) {
            summary.push(`Added sections: ${addedSections.map(s => s.name).join(', ')}`);
        }
        if (removedSections.length > 0) {
            summary.push(`Removed sections: ${removedSections.map(s => s.name).join(', ')}`);
        }
    }

    if (summary.length === 0) {
        summary.push('No significant changes detected');
    }

    return {
        contentChanged,
        placeholdersChanged,
        sectionsChanged,
        summary,
    };
}

/**
 * Publish a template (make it available for use)
 */
export async function publishTemplate(templateId: string): Promise<boolean> {
    const client = getClient();

    try {
        const { errors } = await client.models.Template.update({
            id: templateId,
            isPublished: true,
            publishedAt: new Date().toISOString(),
        });

        if (errors) {
            console.error('Error publishing template:', errors);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in publishTemplate:', error);
        return false;
    }
}

/**
 * Unpublish a template
 */
export async function unpublishTemplate(templateId: string): Promise<boolean> {
    const client = getClient();

    try {
        const { errors } = await client.models.Template.update({
            id: templateId,
            isPublished: false,
        });

        if (errors) {
            console.error('Error unpublishing template:', errors);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in unpublishTemplate:', error);
        return false;
    }
}

/**
 * Duplicate a template (creates a new template based on an existing one)
 */
export async function duplicateTemplate(
    sourceTemplateId: string,
    newName: string,
    createdBy: string
): Promise<string | null> {
    const client = getClient();

    try {
        // Get the source template
        const { data: sourceTemplate, errors: fetchErrors } = await client.models.Template.get({
            id: sourceTemplateId,
        });

        if (fetchErrors || !sourceTemplate) {
            console.error('Error fetching source template:', fetchErrors);
            return null;
        }

        // Create the new template
        const { data: newTemplate, errors: createErrors } = await client.models.Template.create({
            name: newName,
            category: sourceTemplate.category,
            skeletonContent: sourceTemplate.skeletonContent,
            placeholders: sourceTemplate.placeholders,
            sections: sourceTemplate.sections,
            variables: sourceTemplate.variables,
            defaultMetadata: sourceTemplate.defaultMetadata,
            version: 1,
            isPublished: false,
            parentTemplateId: sourceTemplateId,
        });

        if (createErrors || !newTemplate) {
            console.error('Error creating duplicate template:', createErrors);
            return null;
        }

        // Create initial version
        await createTemplateVersion({
            templateId: newTemplate.id,
            name: newName,
            category: sourceTemplate.category,
            skeletonContent: sourceTemplate.skeletonContent || '',
            placeholders: parseJsonField(sourceTemplate.placeholders, []),
            sections: parseJsonField(sourceTemplate.sections, []),
            variables: parseJsonField(sourceTemplate.variables, {}),
            createdBy,
            changeNotes: `Duplicated from template: ${sourceTemplate.name}`,
        });

        return newTemplate.id;
    } catch (error) {
        console.error('Error in duplicateTemplate:', error);
        return null;
    }
}

/**
 * Get template with all its versions
 */
export async function getTemplateWithVersions(templateId: string): Promise<TemplateWithVersions | null> {
    const client = getClient();

    try {
        const { data: template, errors } = await client.models.Template.get({
            id: templateId,
        });

        if (errors || !template) {
            console.error('Error fetching template:', errors);
            return null;
        }

        const versions = await getTemplateVersions(templateId);

        return {
            id: template.id,
            name: template.name || '',
            category: template.category,
            skeletonContent: template.skeletonContent || '',
            placeholders: parseJsonField(template.placeholders, []),
            sections: parseJsonField(template.sections, []),
            variables: parseJsonField(template.variables, {}),
            version: template.version || 1,
            isPublished: template.isPublished || false,
            publishedAt: template.publishedAt || undefined,
            parentTemplateId: template.parentTemplateId || undefined,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            versions,
        };
    } catch (error) {
        console.error('Error in getTemplateWithVersions:', error);
        return null;
    }
}

