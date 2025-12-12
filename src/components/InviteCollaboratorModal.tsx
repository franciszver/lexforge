import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setShowInviteModal } from '../features/uiSlice';
import { 
    inviteCollaborator, 
    getDocumentCollaborators,
    updateCollaboratorRole,
    removeCollaborator,
    type Collaborator,
    type CollaboratorRole 
} from '../utils/collaborationService';
import { X, UserPlus, Mail, Trash2, ChevronDown, Check, Users, Crown, Edit3, Eye } from 'lucide-react';
import { useEffect } from 'react';

const ROLE_OPTIONS: { value: CollaboratorRole; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'viewer', label: 'Viewer', icon: <Eye className="w-4 h-4" />, description: 'Can view only' },
    { value: 'editor', label: 'Editor', icon: <Edit3 className="w-4 h-4" />, description: 'Can view and edit' },
    { value: 'admin', label: 'Admin', icon: <Crown className="w-4 h-4" />, description: 'Can edit and invite others' },
];

export function InviteCollaboratorModal() {
    const dispatch = useAppDispatch();
    const { currentDocument } = useAppSelector((state) => state.document);
    const auth = useAppSelector((state) => state.auth);
    
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<CollaboratorRole>('editor');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [loadingCollabs, setLoadingCollabs] = useState(true);
    const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null);

    // Load existing collaborators
    useEffect(() => {
        async function loadCollaborators() {
            if (!currentDocument?.id) return;
            
            try {
                const collabs = await getDocumentCollaborators(currentDocument.id);
                setCollaborators(collabs);
            } catch (err) {
                console.error('Failed to load collaborators:', err);
            } finally {
                setLoadingCollabs(false);
            }
        }
        
        loadCollaborators();
    }, [currentDocument?.id]);

    const handleClose = () => {
        dispatch(setShowInviteModal(false));
    };

    const handleInvite = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentDocument || !auth.user) return;
        if (!email.trim()) {
            setError('Please enter an email address');
            return;
        }
        
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }
        
        // Can't invite yourself
        if (email.toLowerCase() === auth.user.email?.toLowerCase()) {
            setError("You can't invite yourself");
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const newCollab = await inviteCollaborator(
                currentDocument.id,
                currentDocument.userId,
                email,
                role,
                auth.user.userId,
                auth.user.email
            );
            
            setCollaborators(prev => [...prev, newCollab]);
            setEmail('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send invitation');
        } finally {
            setLoading(false);
        }
    }, [currentDocument, auth.user, email, role]);

    const handleRoleChange = useCallback(async (collaboratorId: string, newRole: CollaboratorRole) => {
        try {
            await updateCollaboratorRole(collaboratorId, newRole);
            setCollaborators(prev => 
                prev.map(c => c.id === collaboratorId ? { ...c, role: newRole } : c)
            );
        } catch (err) {
            console.error('Failed to update role:', err);
        }
        setShowRoleDropdown(null);
    }, []);

    const handleRemove = useCallback(async (collaboratorId: string) => {
        if (!window.confirm('Are you sure you want to remove this collaborator?')) return;
        
        try {
            await removeCollaborator(collaboratorId);
            setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
        } catch (err) {
            console.error('Failed to remove collaborator:', err);
        }
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">Pending</span>;
            case 'accepted':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Active</span>;
            case 'declined':
                return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Declined</span>;
            default:
                return null;
        }
    };

    const selectedRole = ROLE_OPTIONS.find(r => r.value === role);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slide-up max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Share Document</h2>
                                <p className="text-sm text-slate-500 truncate max-w-[200px]">{currentDocument?.title}</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Invite Form */}
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                            <label className="label">Invite by email</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="colleague@lawfirm.com"
                                        className="input pl-10 w-full"
                                    />
                                </div>
                                
                                {/* Role Selector */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowRoleDropdown(showRoleDropdown === 'new' ? null : 'new')}
                                        className="btn-secondary flex items-center gap-2 min-w-[120px]"
                                    >
                                        {selectedRole?.icon}
                                        {selectedRole?.label}
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    
                                    {showRoleDropdown === 'new' && (
                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                                            {ROLE_OPTIONS.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setRole(option.value);
                                                        setShowRoleDropdown(null);
                                                    }}
                                                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg"
                                                >
                                                    {option.icon}
                                                    <div>
                                                        <div className="font-medium text-sm">{option.label}</div>
                                                        <div className="text-xs text-slate-500">{option.description}</div>
                                                    </div>
                                                    {role === option.value && <Check className="w-4 h-4 text-primary-600 ml-auto" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Invitation sent successfully!
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={loading || !email.trim()}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Send Invitation
                                </>
                            )}
                        </button>
                    </form>

                    {/* Existing Collaborators */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-700 mb-3">People with access</h3>
                        
                        {loadingCollabs ? (
                            <div className="flex items-center justify-center py-8">
                                <span className="spinner" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Owner */}
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                            {auth.user?.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{auth.user?.email}</div>
                                            <div className="text-xs text-slate-500">Owner</div>
                                        </div>
                                    </div>
                                    <Crown className="w-5 h-5 text-amber-500" />
                                </div>
                                
                                {/* Collaborators */}
                                {collaborators.map((collab) => (
                                    <div key={collab.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-medium text-sm">
                                                {collab.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{collab.email}</div>
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(collab.status)}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {/* Role dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowRoleDropdown(showRoleDropdown === collab.id ? null : collab.id)}
                                                    className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100"
                                                >
                                                    {ROLE_OPTIONS.find(r => r.value === collab.role)?.label}
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                                
                                                {showRoleDropdown === collab.id && (
                                                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                                                        {ROLE_OPTIONS.map((option) => (
                                                            <button
                                                                key={option.value}
                                                                onClick={() => handleRoleChange(collab.id, option.value)}
                                                                className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg"
                                                            >
                                                                {option.icon}
                                                                <div>
                                                                    <div className="font-medium text-sm">{option.label}</div>
                                                                    <div className="text-xs text-slate-500">{option.description}</div>
                                                                </div>
                                                                {collab.role === option.value && <Check className="w-4 h-4 text-primary-600 ml-auto" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Remove button */}
                                            <button
                                                onClick={() => handleRemove(collab.id)}
                                                className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                title="Remove access"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                
                                {collaborators.length === 0 && (
                                    <p className="text-sm text-slate-500 text-center py-4">
                                        No collaborators yet. Invite someone to get started.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex-shrink-0">
                    <button onClick={handleClose} className="btn-secondary w-full">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

