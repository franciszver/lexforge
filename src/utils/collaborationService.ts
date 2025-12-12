/**
 * Collaboration Service
 * 
 * Handles document sharing, collaborator invitations, and permission checks.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Types
// ============================================

export type CollaboratorRole = 'viewer' | 'editor' | 'admin';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked';
export type ShareAccessLevel = 'view' | 'comment' | 'edit';

export interface Collaborator {
    id: string;
    documentId: string;
    email: string;
    userId?: string;
    role: CollaboratorRole;
    status: InviteStatus;
    invitedBy: string;
    invitedByName?: string;
    invitedAt: string;
    acceptedAt?: string;
}

export interface ShareLinkData {
    id: string;
    documentId: string;
    token: string;
    passcode: string;
    accessLevel: ShareAccessLevel;
    expiresAt: string;
    accessCount: number;
    isActive: boolean;
    createdAt: string;
}

export interface DocumentAccess {
    hasAccess: boolean;
    role: CollaboratorRole | 'owner';
    source: 'owner' | 'collaborator' | 'share_link' | 'none';
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
// Collaborator Management
// ============================================

/**
 * Invite a collaborator to a document by email
 */
export async function inviteCollaborator(
    documentId: string,
    documentOwnerId: string,
    email: string,
    role: CollaboratorRole,
    invitedBy: string,
    invitedByName?: string
): Promise<Collaborator> {
    const client = getClient();
    
    // Check if already invited
    const existing = await client.models.DocumentCollaborator.list({
        filter: {
            documentId: { eq: documentId },
            collaboratorEmail: { eq: email.toLowerCase() },
            status: { ne: 'revoked' },
        },
    });
    
    if (existing.data.length > 0) {
        const existingCollab = existing.data[0];
        if (existingCollab.status === 'pending' || existingCollab.status === 'accepted') {
            throw new Error('This user has already been invited to this document');
        }
    }
    
    // Generate invite token
    const inviteToken = uuidv4();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    
    const result = await client.models.DocumentCollaborator.create({
        documentId,
        documentOwnerId,
        collaboratorEmail: email.toLowerCase(),
        role,
        invitedBy,
        invitedByName,
        invitedAt: new Date().toISOString(),
        status: 'pending',
        inviteToken,
        inviteExpiresAt,
    });
    
    if (!result.data) {
        throw new Error('Failed to create collaborator invitation');
    }
    
    console.log('[Collaboration] Invited collaborator:', email, 'to document:', documentId);
    
    return {
        id: result.data.id,
        documentId: result.data.documentId,
        email: result.data.collaboratorEmail,
        userId: result.data.collaboratorUserId || undefined,
        role: result.data.role as CollaboratorRole,
        status: result.data.status as InviteStatus,
        invitedBy: result.data.invitedBy,
        invitedByName: result.data.invitedByName || undefined,
        invitedAt: result.data.invitedAt,
        acceptedAt: result.data.acceptedAt || undefined,
    };
}

/**
 * Accept an invitation to collaborate on a document
 */
export async function acceptInvitation(
    inviteToken: string,
    userId: string
): Promise<Collaborator> {
    const client = getClient();
    
    // Find the invitation by token
    const result = await client.models.DocumentCollaborator.list({
        filter: { inviteToken: { eq: inviteToken } },
    });
    
    if (result.data.length === 0) {
        throw new Error('Invalid invitation token');
    }
    
    const invitation = result.data[0];
    
    // Check if expired
    if (invitation.inviteExpiresAt && new Date(invitation.inviteExpiresAt) < new Date()) {
        throw new Error('This invitation has expired');
    }
    
    // Check status
    if (invitation.status !== 'pending') {
        throw new Error(`This invitation has already been ${invitation.status}`);
    }
    
    // Update the invitation
    const updated = await client.models.DocumentCollaborator.update({
        id: invitation.id,
        collaboratorUserId: userId,
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        inviteToken: null, // Clear token after use
    });
    
    if (!updated.data) {
        throw new Error('Failed to accept invitation');
    }
    
    console.log('[Collaboration] Accepted invitation for document:', invitation.documentId);
    
    return {
        id: updated.data.id,
        documentId: updated.data.documentId,
        email: updated.data.collaboratorEmail,
        userId: updated.data.collaboratorUserId || undefined,
        role: updated.data.role as CollaboratorRole,
        status: updated.data.status as InviteStatus,
        invitedBy: updated.data.invitedBy,
        invitedByName: updated.data.invitedByName || undefined,
        invitedAt: updated.data.invitedAt,
        acceptedAt: updated.data.acceptedAt || undefined,
    };
}

/**
 * Get all collaborators for a document
 */
export async function getDocumentCollaborators(documentId: string): Promise<Collaborator[]> {
    const client = getClient();
    
    const result = await client.models.DocumentCollaborator.list({
        filter: {
            documentId: { eq: documentId },
            status: { ne: 'revoked' },
        },
    });
    
    return result.data.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        email: c.collaboratorEmail,
        userId: c.collaboratorUserId || undefined,
        role: c.role as CollaboratorRole,
        status: c.status as InviteStatus,
        invitedBy: c.invitedBy,
        invitedByName: c.invitedByName || undefined,
        invitedAt: c.invitedAt,
        acceptedAt: c.acceptedAt || undefined,
    }));
}

/**
 * Get all documents shared with a user
 */
export async function getSharedWithMe(userId: string, email: string): Promise<Collaborator[]> {
    const client = getClient();
    
    // Get by userId (accepted invites) and by email (pending invites)
    const [byUserId, byEmail] = await Promise.all([
        client.models.DocumentCollaborator.list({
            filter: {
                collaboratorUserId: { eq: userId },
                status: { eq: 'accepted' },
            },
        }),
        client.models.DocumentCollaborator.list({
            filter: {
                collaboratorEmail: { eq: email.toLowerCase() },
                status: { eq: 'pending' },
            },
        }),
    ]);
    
    const allCollabs = [...byUserId.data, ...byEmail.data];
    
    // Dedupe by id
    const seen = new Set<string>();
    const unique = allCollabs.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
    });
    
    return unique.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        email: c.collaboratorEmail,
        userId: c.collaboratorUserId || undefined,
        role: c.role as CollaboratorRole,
        status: c.status as InviteStatus,
        invitedBy: c.invitedBy,
        invitedByName: c.invitedByName || undefined,
        invitedAt: c.invitedAt,
        acceptedAt: c.acceptedAt || undefined,
    }));
}

/**
 * Update a collaborator's role
 */
export async function updateCollaboratorRole(
    collaboratorId: string,
    newRole: CollaboratorRole
): Promise<void> {
    const client = getClient();
    
    await client.models.DocumentCollaborator.update({
        id: collaboratorId,
        role: newRole,
    });
    
    console.log('[Collaboration] Updated collaborator role to:', newRole);
}

/**
 * Remove a collaborator from a document
 */
export async function removeCollaborator(collaboratorId: string): Promise<void> {
    const client = getClient();
    
    await client.models.DocumentCollaborator.update({
        id: collaboratorId,
        status: 'revoked',
    });
    
    console.log('[Collaboration] Removed collaborator:', collaboratorId);
}

// ============================================
// Share Links
// ============================================

/**
 * Generate a passcode for share links
 */
function generatePasscode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Create a share link for a document
 */
export async function createShareLink(
    documentId: string,
    documentOwnerId: string,
    accessLevel: ShareAccessLevel = 'view',
    expiryHours: number = 72
): Promise<ShareLinkData> {
    const client = getClient();
    
    const token = uuidv4();
    const passcode = generatePasscode();
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
    
    const result = await client.models.ShareLink.create({
        documentId,
        documentOwnerId,
        token,
        passcode,
        accessLevel,
        expiresAt,
        accessCount: 0,
        isActive: true,
    });
    
    if (!result.data) {
        throw new Error('Failed to create share link');
    }
    
    console.log('[Collaboration] Created share link for document:', documentId);
    
    return {
        id: result.data.id,
        documentId: result.data.documentId,
        token: result.data.token,
        passcode: result.data.passcode,
        accessLevel: result.data.accessLevel as ShareAccessLevel,
        expiresAt: result.data.expiresAt,
        accessCount: result.data.accessCount || 0,
        isActive: result.data.isActive ?? true,
        createdAt: result.data.createdAt,
    };
}

/**
 * Verify a share link and passcode
 */
export async function verifyShareLink(
    token: string,
    passcode: string
): Promise<{ documentId: string; accessLevel: ShareAccessLevel } | null> {
    const client = getClient();
    
    const result = await client.models.ShareLink.list({
        filter: { token: { eq: token } },
    });
    
    if (result.data.length === 0) {
        return null;
    }
    
    const link = result.data[0];
    
    // Check if active
    if (!link.isActive) {
        return null;
    }
    
    // Check if expired
    if (new Date(link.expiresAt) < new Date()) {
        return null;
    }
    
    // Verify passcode
    if (link.passcode !== passcode) {
        return null;
    }
    
    // Increment access count
    await client.models.ShareLink.update({
        id: link.id,
        accessCount: (link.accessCount || 0) + 1,
        lastAccessedAt: new Date().toISOString(),
    });
    
    return {
        documentId: link.documentId,
        accessLevel: link.accessLevel as ShareAccessLevel,
    };
}

/**
 * Get share links for a document
 */
export async function getDocumentShareLinks(documentId: string): Promise<ShareLinkData[]> {
    const client = getClient();
    
    const result = await client.models.ShareLink.list({
        filter: {
            documentId: { eq: documentId },
            isActive: { eq: true },
        },
    });
    
    return result.data.map((l) => ({
        id: l.id,
        documentId: l.documentId,
        token: l.token,
        passcode: l.passcode,
        accessLevel: l.accessLevel as ShareAccessLevel,
        expiresAt: l.expiresAt,
        accessCount: l.accessCount || 0,
        isActive: l.isActive ?? true,
        createdAt: l.createdAt,
    }));
}

/**
 * Revoke a share link
 */
export async function revokeShareLink(linkId: string, revokedBy: string): Promise<void> {
    const client = getClient();
    
    await client.models.ShareLink.update({
        id: linkId,
        isActive: false,
        revokedAt: new Date().toISOString(),
        revokedBy,
    });
    
    console.log('[Collaboration] Revoked share link:', linkId);
}

// ============================================
// Permission Checks
// ============================================

/**
 * Check if a user has access to a document and what level
 */
export async function checkDocumentAccess(
    documentId: string,
    userId: string,
    userEmail: string,
    documentOwnerId: string
): Promise<DocumentAccess> {
    // Owner always has full access
    if (userId === documentOwnerId) {
        return { hasAccess: true, role: 'owner', source: 'owner' };
    }
    
    const client = getClient();
    
    try {
        // Check if user is a collaborator by userId first
        const byUserId = await client.models.DocumentCollaborator.list({
            filter: {
                documentId: { eq: documentId },
                status: { eq: 'accepted' },
                collaboratorUserId: { eq: userId },
            },
        });
        
        if (byUserId.data.length > 0) {
            const collab = byUserId.data[0];
            return {
                hasAccess: true,
                role: collab.role as CollaboratorRole,
                source: 'collaborator',
            };
        }
        
        // Check by email as fallback
        const byEmail = await client.models.DocumentCollaborator.list({
            filter: {
                documentId: { eq: documentId },
                status: { eq: 'accepted' },
                collaboratorEmail: { eq: userEmail.toLowerCase() },
            },
        });
        
        if (byEmail.data.length > 0) {
            const collab = byEmail.data[0];
            return {
                hasAccess: true,
                role: collab.role as CollaboratorRole,
                source: 'collaborator',
            };
        }
    } catch (error) {
        console.error('Error checking document access:', error);
    }
    
    return { hasAccess: false, role: 'viewer', source: 'none' };
}

/**
 * Check if role allows editing
 */
export function canEdit(role: CollaboratorRole | 'owner'): boolean {
    return role === 'owner' || role === 'editor' || role === 'admin';
}

/**
 * Check if role allows admin actions (inviting others, changing settings)
 */
export function canAdmin(role: CollaboratorRole | 'owner'): boolean {
    return role === 'owner' || role === 'admin';
}

