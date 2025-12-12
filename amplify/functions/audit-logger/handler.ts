import type { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Table name will be set by environment variable from Amplify
const AUDIT_LOG_TABLE = process.env.AUDIT_LOG_TABLE_NAME || 'AuditLog';

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
 */
async function getPreviousHash(userId: string): Promise<string> {
    try {
        const result = await docClient.send(new QueryCommand({
            TableName: AUDIT_LOG_TABLE,
            IndexName: 'userId-timestamp-index',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
            ScanIndexForward: false, // Descending order (newest first)
            Limit: 1,
        }));

        if (result.Items && result.Items.length > 0) {
            return result.Items[0].hash || 'GENESIS';
        }
        
        return 'GENESIS'; // First entry for this user
    } catch (error) {
        console.warn('Could not fetch previous hash, using GENESIS:', error);
        return 'GENESIS';
    }
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
        
        // Get previous hash for chain integrity
        const previousHash = await getPreviousHash(userId);
        
        // Create the audit entry
        const timestamp = new Date().toISOString();
        const id = uuidv4();
        
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

