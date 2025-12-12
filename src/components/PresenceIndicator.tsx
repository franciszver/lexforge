/**
 * PresenceIndicator Component
 * Shows who is currently viewing/editing a document.
 */

import { useState, useEffect, useCallback } from 'react';
import { Users, Eye, Edit3, Clock, Wifi, WifiOff } from 'lucide-react';
import type { UserPresence, PresenceStatus } from '../utils/presenceTypes';
import { getUserInitials, getDisplayName, PRESENCE_CONFIG } from '../utils/presenceTypes';
import {
    joinDocument,
    leaveCurrentDocument,
    getDocumentPresences,
    subscribeToPresences,
    refreshPresences,
    updateStatus,
} from '../utils/presenceService';
import { useAppSelector } from '../store';

// ============================================
// Types
// ============================================

interface PresenceIndicatorProps {
    documentId: string;
    documentOwnerId: string;
    compact?: boolean;
    maxVisible?: number;
    onPresenceChange?: (presences: UserPresence[]) => void;
}

interface UserAvatarProps {
    presence: UserPresence;
    size?: 'sm' | 'md' | 'lg';
    showStatus?: boolean;
    showTooltip?: boolean;
}

// ============================================
// Status Config
// ============================================

const STATUS_CONFIG: Record<PresenceStatus, { icon: typeof Eye; label: string; color: string }> = {
    viewing: { icon: Eye, label: 'Viewing', color: 'bg-blue-500' },
    editing: { icon: Edit3, label: 'Editing', color: 'bg-green-500' },
    idle: { icon: Clock, label: 'Idle', color: 'bg-yellow-500' },
    disconnected: { icon: WifiOff, label: 'Disconnected', color: 'bg-gray-400' },
};

// ============================================
// User Avatar Component
// ============================================

function UserAvatar({ presence, size = 'md', showStatus = true, showTooltip = true }: UserAvatarProps) {
    const [showTooltipState, setShowTooltipState] = useState(false);
    
    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base',
    };
    
    const statusSizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
    };
    
    const initials = getUserInitials(presence.userName, presence.userEmail);
    const displayName = getDisplayName(presence.userName, presence.userEmail);
    const statusConfig = STATUS_CONFIG[presence.status];
    
    return (
        <div 
            className="relative"
            onMouseEnter={() => setShowTooltipState(true)}
            onMouseLeave={() => setShowTooltipState(false)}
        >
            {/* Avatar */}
            <div
                className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white ring-2 ring-white`}
                style={{ backgroundColor: presence.userColor }}
                title={showTooltip ? undefined : displayName}
            >
                {initials}
            </div>
            
            {/* Status indicator */}
            {showStatus && (
                <div
                    className={`absolute -bottom-0.5 -right-0.5 ${statusSizeClasses[size]} ${statusConfig.color} rounded-full ring-2 ring-white`}
                    title={statusConfig.label}
                />
            )}
            
            {/* Tooltip */}
            {showTooltip && showTooltipState && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
                    <div className="font-medium">{displayName}</div>
                    <div className="flex items-center gap-1 text-slate-300">
                        <statusConfig.icon className="w-3 h-3" />
                        <span>{statusConfig.label}</span>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                </div>
            )}
        </div>
    );
}

// ============================================
// Presence List Component
// ============================================

function PresenceList({ presences, currentSessionId }: { presences: UserPresence[]; currentUserId: string; currentSessionId?: string }) {
    // Filter by session, not user - allows same user to see their other sessions
    const otherSessions = presences.filter(p => p.sessionId !== currentSessionId);
    
    if (otherSessions.length === 0) {
        return (
            <div className="py-4 text-center text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No other sessions viewing this document</p>
            </div>
        );
    }
    
    return (
        <div className="divide-y divide-slate-100">
            {otherSessions.map(presence => (
                <div key={presence.id} className="flex items-center gap-3 p-3">
                    <UserAvatar presence={presence} size="md" showTooltip={false} />
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                            {getDisplayName(presence.userName, presence.userEmail)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            {(() => {
                                const config = STATUS_CONFIG[presence.status];
                                const Icon = config.icon;
                                return (
                                    <>
                                        <Icon className="w-3 h-3" />
                                        <span>{config.label}</span>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                    <div
                        className={`w-2 h-2 rounded-full ${STATUS_CONFIG[presence.status].color}`}
                    />
                </div>
            ))}
        </div>
    );
}

// ============================================
// Main Component
// ============================================

export function PresenceIndicator({
    documentId,
    documentOwnerId,
    compact = false,
    maxVisible = 4,
    onPresenceChange,
}: PresenceIndicatorProps) {
    const [presences, setPresences] = useState<UserPresence[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const auth = useAppSelector(state => state.auth);
    const currentUserId = auth.user?.userId || '';
    const currentUserEmail = auth.user?.email;
    
    // Join document and set up presence
    useEffect(() => {
        if (!documentId || !currentUserId) return;
        
        let mounted = true;
        
        const initPresence = async () => {
            setIsLoading(true);
            
            // Join the document
            const myPresence = await joinDocument(
                documentId,
                documentOwnerId,
                currentUserId,
                currentUserEmail,
                undefined // userName
            );
            
            if (!mounted) return;
            
            if (myPresence) {
                setIsConnected(true);
            }
            
            // Get initial presences
            const initialPresences = await getDocumentPresences(documentId);
            if (mounted) {
                setPresences(initialPresences);
                onPresenceChange?.(initialPresences);
            }
            
            setIsLoading(false);
        };
        
        initPresence();
        
        // Subscribe to presence updates
        const unsubscribe = subscribeToPresences((updatedPresences) => {
            if (mounted) {
                setPresences(updatedPresences);
                onPresenceChange?.(updatedPresences);
            }
        });
        
        // Cleanup on unmount
        return () => {
            mounted = false;
            unsubscribe();
            leaveCurrentDocument();
        };
    }, [documentId, documentOwnerId, currentUserId, currentUserEmail, onPresenceChange]);
    
    // Editing status is handled via the usePresenceEditing hook exported below
    
    // Refresh presences periodically
    useEffect(() => {
        const interval = setInterval(() => {
            refreshPresences();
        }, PRESENCE_CONFIG.CLEANUP_INTERVAL);
        
        return () => clearInterval(interval);
    }, []);
    
    // Get current session ID from presence service
    // Filter out current SESSION (not user) for display - allows same user to see other sessions
    const currentSessionId = presences.find(p => p.userId === currentUserId)?.sessionId;
    const otherSessions = presences.filter(p => p.sessionId !== currentSessionId);
    const visibleUsers = otherSessions.slice(0, maxVisible);
    const hiddenCount = otherSessions.length - visibleUsers.length;
    const totalViewers = presences.length; // Total including self
    
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-slate-400">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    
    // Compact mode - just avatars
    if (compact) {
        return (
            <div className="flex items-center">
                {/* Connection status */}
                <div className={`mr-2 ${isConnected ? 'text-green-500' : 'text-slate-400'}`}>
                    {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </div>
                
                {/* Avatar stack */}
                <div className="flex -space-x-2">
                    {visibleUsers.map(presence => (
                        <UserAvatar
                            key={presence.id}
                            presence={presence}
                            size="sm"
                            showStatus={true}
                        />
                    ))}
                    
                    {hiddenCount > 0 && (
                        <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-xs font-medium text-slate-700 ring-2 ring-white">
                            +{hiddenCount}
                        </div>
                    )}
                </div>
                
                {/* Count badge - show total viewers including self */}
                {totalViewers > 0 && (
                    <span className="ml-2 text-xs text-slate-500">
                        {totalViewers} {totalViewers === 1 ? 'viewer' : 'viewers'}
                    </span>
                )}
            </div>
        );
    }
    
    // Full mode with dropdown
    return (
        <div className="relative">
            {/* Trigger */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
                {/* Connection status */}
                <div className={isConnected ? 'text-green-500' : 'text-slate-400'}>
                    {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </div>
                
                {/* Avatar stack */}
                <div className="flex -space-x-2">
                    {visibleUsers.map(presence => (
                        <UserAvatar
                            key={presence.id}
                            presence={presence}
                            size="sm"
                            showStatus={true}
                            showTooltip={false}
                        />
                    ))}
                    
                    {hiddenCount > 0 && (
                        <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-xs font-medium text-slate-700 ring-2 ring-white">
                            +{hiddenCount}
                        </div>
                    )}
                </div>
                
                {/* Label */}
                <span className="text-sm text-slate-600">
                    {otherSessions.length === 0
                        ? 'Only you'
                        : `${totalViewers} viewing`}
                </span>
            </button>
            
            {/* Dropdown */}
            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />
                    
                    {/* Panel */}
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                        <div className="px-4 py-3 border-b border-slate-100">
                            <h3 className="font-medium text-slate-900 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Active Viewers
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {presences.length} {presences.length === 1 ? 'person' : 'people'} viewing this document
                            </p>
                        </div>
                        
                        {/* Current user */}
                        {presences.find(p => p.userId === currentUserId) && (
                            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <UserAvatar
                                        presence={presences.find(p => p.userId === currentUserId)!}
                                        size="sm"
                                        showTooltip={false}
                                    />
                                    <span className="text-sm text-slate-600">You</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Other sessions */}
                        <PresenceList presences={presences} currentUserId={currentUserId} currentSessionId={currentSessionId} />
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================
// Export editing handlers hook
// ============================================

export function usePresenceEditing() {
    const startEditing = useCallback(() => {
        updateStatus('editing');
    }, []);
    
    const stopEditing = useCallback(() => {
        updateStatus('viewing');
    }, []);
    
    return { startEditing, stopEditing };
}

export default PresenceIndicator;

