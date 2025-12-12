import type { Handler } from 'aws-lambda';
import { createHash, randomUUID } from 'crypto';

interface AuditEventInput {
    eventType: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
}

interface AuditLogEntry {
    id: string;
    timestamp: string;
    userId: string;
    userEmail?: string;
    eventType: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    previousHash: string;
    hash: string;
}

/**
 * Compute SHA-256 hash of the audit entry for integrity verification
 */
function computeHash(entry: Omit<AuditLogEntry, 'hash'>): string {
    const hashInput = JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        userId: entry.userId,
        eventType: entry.eventType,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata,
        previousHash: entry.previousHash,
    });
    
    return createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Get the hash of the most recent audit log entry for this user
 * This creates a per-user hash chain for integrity verification
 * 
 * Note: In the current implementation, hash chaining is handled client-side.
 * This function returns 'GENESIS' as the previous hash will be computed
 * by the client before calling this Lambda.
 */
async function getPreviousHash(userId: string): Promise<string> {
    // Hash chaining is handled client-side in auditSlice.ts
    // The client computes the previous hash before creating the entry
    // This Lambda just returns the entry for AppSync to store
    return 'GENESIS';
}

/**
 * Extract user info from the Lambda event context
 */
function extractUserInfo(event: Record<string, unknown>): { userId: string; userEmail?: string } {
    // AppSync resolver context provides identity info
    const identity = event.identity as Record<string, unknown> | undefined;
    
    if (identity) {
        // Cognito User Pool identity
        if (identity.sub) {
            return {
                userId: identity.sub as string,
                userEmail: (identity.claims as Record<string, unknown>)?.email as string | undefined,
            };
        }
        // IAM identity
        if (identity.username) {
            return {
                userId: identity.username as string,
            };
        }
    }
    
    // Fallback - check for userId in arguments
    const args = event.arguments as Record<string, unknown> | undefined;
    if (args?.userId) {
        return { userId: args.userId as string };
    }
    
    return { userId: 'system' };
}

/**
 * Extract client info from request headers
 */
function extractClientInfo(event: Record<string, unknown>): { ipAddress?: string; userAgent?: string; sessionId?: string } {
    const request = event.request as Record<string, unknown> | undefined;
    const headers = request?.headers as Record<string, string> | undefined;
    
    return {
        ipAddress: headers?.['x-forwarded-for']?.split(',')[0]?.trim() || headers?.['x-real-ip'],
        userAgent: headers?.['user-agent'],
        sessionId: headers?.['x-session-id'],
    };
}

export const handler: Handler = async (event) => {
    console.log('Audit logger received event:', JSON.stringify(event, null, 2));
    
    try {
        const args = event.arguments as AuditEventInput;
        
        if (!args.eventType || !args.action) {
            throw new Error('eventType and action are required');
        }
        
        const { userId, userEmail } = extractUserInfo(event);
        const { ipAddress, userAgent, sessionId } = extractClientInfo(event);
        
        // Previous hash should be provided by the client in metadata
        // For now, we'll use GENESIS (client-side hash chaining handles this)
        const previousHash = (args.metadata as Record<string, unknown>)?.previousHash as string || 'GENESIS';
        
        // Create the audit entry
        const timestamp = new Date().toISOString();
        const id = randomUUID();
        
        const entry: Omit<AuditLogEntry, 'hash'> = {
            id,
            timestamp,
            userId,
            userEmail,
            eventType: args.eventType,
            action: args.action,
            resourceType: args.resourceType,
            resourceId: args.resourceId,
            metadata: args.metadata,
            ipAddress,
            userAgent,
            sessionId,
            previousHash,
        };
        
        // Compute hash
        const hash = computeHash(entry);
        
        const fullEntry: AuditLogEntry = {
            ...entry,
            hash,
        };
        
        // Store in DynamoDB
        // Note: In Amplify Gen 2, the actual table name includes environment prefix
        // We'll use the Data API client in the frontend instead of direct DynamoDB access
        // This Lambda returns the entry for AppSync to store via the model
        
        console.log('Audit entry created:', JSON.stringify(fullEntry, null, 2));
        
        // Return the entry - AppSync will handle the actual storage
        return fullEntry;
        
    } catch (error) {
        console.error('Error in audit logger:', error);
        throw error;
    }
};

