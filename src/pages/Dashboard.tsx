import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { useAppDispatch, useAppSelector } from '../store';
import { loadAllDocuments, duplicateDocument } from '../features/documentSlice';
import { setShowNewDocModal, setShowDeleteConfirm } from '../features/uiSlice';
import { logout } from '../features/authSlice';
import { formatDistanceToNow } from 'date-fns';
import {
    Plus, FileText, Edit3, Eye, CheckCircle, LogOut,
    Settings, Copy, Trash2
} from 'lucide-react';

/**
 * Dashboard Page (Documents Page)
 * Main landing page for authenticated users. Displays recent documents.
 */
export const Dashboard: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { allDocuments, loadingAll } = useAppSelector((state) => state.document);
    const { user } = useAppSelector((state) => state.auth);

    // Load documents on mount
    useEffect(() => {
        dispatch(loadAllDocuments());
    }, [dispatch]);

    const handleLogout = async () => {
        try {
            await signOut();
            dispatch(logout());
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleNewDocument = () => {
        dispatch(setShowNewDocModal(true));
    };

    const handleDuplicate = (docId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(duplicateDocument(docId));
    };

    const handleDelete = (docId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(setShowDeleteConfirm(docId));
    };

    const getStatusBadge = (status: 'draft' | 'review' | 'final') => {
        const styles = {
            draft: 'bg-amber-100 text-amber-700',
            review: 'bg-blue-100 text-blue-700',
            final: 'bg-green-100 text-green-700',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const docStats = {
        total: allDocuments.length,
        drafts: allDocuments.filter(d => d.status === 'draft').length,
        review: allDocuments.filter(d => d.status === 'review').length,
        final: allDocuments.filter(d => d.status === 'final').length,
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-slate-900">LexForge</span>
                        </Link>
                        <div className="h-6 w-px bg-slate-200" />
                        <h1 className="text-lg font-medium text-slate-700">Documents</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNewDocument}
                            className="btn-primary btn-sm"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            New Document
                        </button>

                        <Link to="/admin" className="btn-ghost btn-sm">
                            <Settings className="w-4 h-4" />
                        </Link>

                        <div className="h-6 w-px bg-slate-200" />

                        <span className="text-sm text-slate-500">{user?.email}</span>

                        <button
                            onClick={handleLogout}
                            className="btn-ghost btn-sm text-slate-500"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto p-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{docStats.total}</p>
                                <p className="text-sm text-slate-500">Total Documents</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Edit3 className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{docStats.drafts}</p>
                                <p className="text-sm text-slate-500">Drafts</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Eye className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{docStats.review}</p>
                                <p className="text-sm text-slate-500">In Review</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{docStats.final}</p>
                                <p className="text-sm text-slate-500">Finalized</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Start Templates */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Start Templates</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: 'Demand Letter', icon: 'mail' },
                            { name: 'Cease and Desist', icon: 'shield' },
                            { name: 'Contract', icon: 'file-text' },
                            { name: 'Legal Memo', icon: 'clipboard' },
                        ].map((template) => (
                            <button
                                key={template.name}
                                onClick={handleNewDocument}
                                className="card-hover p-4 text-center group"
                            >
                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-100 transition-colors">
                                    <FileText className="w-6 h-6 text-slate-600 group-hover:text-primary-600 transition-colors" />
                                </div>
                                <p className="text-sm font-medium text-slate-900">{template.name}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Documents list */}
                {loadingAll ? (
                    <div className="text-center py-12">
                        <div className="spinner w-8 h-8 text-primary-600 mx-auto mb-4" />
                        <p className="text-slate-500">Loading documents...</p>
                    </div>
                ) : allDocuments.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h2 className="text-lg font-medium text-slate-900 mb-2">No documents yet</h2>
                        <p className="text-slate-500 mb-4">Create your first document to get started</p>
                        <button onClick={handleNewDocument} className="btn-primary">
                            <Plus className="w-4 h-4 mr-1" />
                            Create Document
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Title
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Updated
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {allDocuments.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => navigate(`/draft/${doc.id}`)}
                                                className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline text-left"
                                            >
                                                {doc.title || 'Untitled'}
                                            </button>
                                            <p className="text-xs text-slate-400 mt-0.5">{doc.jurisdiction}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {doc.docType}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(doc.status)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => navigate(`/draft/${doc.id}`)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                                    title="Open"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDuplicate(doc.id, e)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                                    title="Duplicate"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(doc.id, e)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};
