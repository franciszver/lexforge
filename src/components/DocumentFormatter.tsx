/**
 * DocumentFormatter Component
 * Formats legal documents according to court-specific rules.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FileText,
    Eye,
    Download,
    AlertCircle,
    CheckCircle,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Scale,
    Building,
    User,
    RefreshCw,
    X,
} from 'lucide-react';
import type {
    CourtFormattingRules,
    CaptionData,
    AttorneyInfo,
    ServiceInfo,
    PartyInfo,
    FormattedDocument,
} from '../utils/courtFormattingTypes';
import {
    calculateWordCount,
} from '../utils/courtFormattingTypes';
import {
    getAllCourts,
    getCourtById,
    getJurisdictions,
} from '../utils/courtRulesDatabase';
import {
    formatDocument,
    generateFullHtml,
} from '../utils/documentFormatter';

// ============================================
// Types
// ============================================

interface DocumentFormatterProps {
    documentContent: string;
    documentTitle: string;
    onFormatted?: (html: string) => void;
    onClose?: () => void;
    initialCourtId?: string;
}

// ============================================
// Sub-Components
// ============================================

interface CourtSelectorProps {
    selectedCourt: CourtFormattingRules | null;
    onSelect: (court: CourtFormattingRules) => void;
}

function CourtSelector({ selectedCourt, onSelect }: CourtSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('');
    
    const courts = useMemo(() => {
        let filtered = getAllCourts();
        
        if (selectedJurisdiction) {
            filtered = filtered.filter(c => c.jurisdiction === selectedJurisdiction);
        }
        
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(c => 
                c.courtName.toLowerCase().includes(lowerQuery) ||
                c.jurisdiction.toLowerCase().includes(lowerQuery)
            );
        }
        
        return filtered;
    }, [searchQuery, selectedJurisdiction]);
    
    const jurisdictions = useMemo(() => getJurisdictions(), []);
    
    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <select
                    value={selectedJurisdiction}
                    onChange={(e) => setSelectedJurisdiction(e.target.value)}
                    className="input flex-1"
                >
                    <option value="">All Jurisdictions</option>
                    {jurisdictions.map(j => (
                        <option key={j} value={j}>{j}</option>
                    ))}
                </select>
            </div>
            
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search courts..."
                    className="input w-full"
                />
                
                {showDropdown && courts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {courts.map(court => (
                            <button
                                key={court.id}
                                onClick={() => {
                                    onSelect(court);
                                    setShowDropdown(false);
                                    setSearchQuery('');
                                }}
                                className={`w-full text-left px-4 py-2 hover:bg-slate-50 ${
                                    selectedCourt?.id === court.id ? 'bg-primary-50' : ''
                                }`}
                            >
                                <div className="font-medium text-slate-800">{court.courtName}</div>
                                <div className="text-xs text-slate-500">{court.jurisdiction}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            {selectedCourt && (
                <div className="p-3 bg-primary-50 rounded-lg">
                    <div className="font-medium text-primary-800">{selectedCourt.courtName}</div>
                    <div className="text-sm text-primary-600">{selectedCourt.jurisdiction}</div>
                    {selectedCourt.localRulesCitation && (
                        <div className="text-xs text-primary-500 mt-1">
                            Rules: {selectedCourt.localRulesCitation}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface CaptionFormProps {
    captionData: CaptionData;
    onChange: (data: CaptionData) => void;
}

function CaptionForm({ captionData, onChange }: CaptionFormProps) {
    const [showPlaintiffs, setShowPlaintiffs] = useState(true);
    const [showDefendants, setShowDefendants] = useState(true);
    
    const addParty = (side: 'plaintiffs' | 'defendants') => {
        const newParty: PartyInfo = {
            name: '',
            role: side === 'plaintiffs' ? 'plaintiff' : 'defendant',
            isLeadParty: captionData[side].length === 0,
        };
        onChange({
            ...captionData,
            [side]: [...captionData[side], newParty],
        });
    };
    
    const updateParty = (side: 'plaintiffs' | 'defendants', index: number, updates: Partial<PartyInfo>) => {
        const updated = captionData[side].map((p, i) => i === index ? { ...p, ...updates } : p);
        onChange({ ...captionData, [side]: updated });
    };
    
    const removeParty = (side: 'plaintiffs' | 'defendants', index: number) => {
        onChange({
            ...captionData,
            [side]: captionData[side].filter((_, i) => i !== index),
        });
    };
    
    return (
        <div className="space-y-4">
            {/* Court Info */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Case Number</label>
                    <input
                        type="text"
                        value={captionData.caseNumber}
                        onChange={(e) => onChange({ ...captionData, caseNumber: e.target.value })}
                        className="input"
                        placeholder="e.g., 2:24-cv-01234"
                    />
                </div>
                <div>
                    <label className="label">Judge Name (Optional)</label>
                    <input
                        type="text"
                        value={captionData.judgeName || ''}
                        onChange={(e) => onChange({ ...captionData, judgeName: e.target.value })}
                        className="input"
                        placeholder="e.g., John Smith"
                    />
                </div>
            </div>
            
            <div>
                <label className="label">Document Title</label>
                <input
                    type="text"
                    value={captionData.documentTitle}
                    onChange={(e) => onChange({ ...captionData, documentTitle: e.target.value })}
                    className="input"
                    placeholder="e.g., MOTION FOR SUMMARY JUDGMENT"
                />
            </div>
            
            {/* Plaintiffs */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                    onClick={() => setShowPlaintiffs(!showPlaintiffs)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100"
                >
                    <span className="font-medium">Plaintiffs/Petitioners ({captionData.plaintiffs.length})</span>
                    {showPlaintiffs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showPlaintiffs && (
                    <div className="p-3 space-y-3">
                        {captionData.plaintiffs.map((party, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="text"
                                        value={party.name}
                                        onChange={(e) => updateParty('plaintiffs', index, { name: e.target.value })}
                                        className="input w-full"
                                        placeholder="Party name"
                                    />
                                    <div className="flex items-center gap-4">
                                        <select
                                            value={party.role}
                                            onChange={(e) => updateParty('plaintiffs', index, { role: e.target.value as PartyInfo['role'] })}
                                            className="input flex-1"
                                        >
                                            <option value="plaintiff">Plaintiff</option>
                                            <option value="petitioner">Petitioner</option>
                                            <option value="appellant">Appellant</option>
                                            <option value="cross-appellee">Cross-Appellee</option>
                                        </select>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={party.isLeadParty}
                                                onChange={(e) => updateParty('plaintiffs', index, { isLeadParty: e.target.checked })}
                                            />
                                            Lead Party
                                        </label>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeParty('plaintiffs', index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => addParty('plaintiffs')}
                            className="btn btn-secondary btn-sm"
                        >
                            Add Plaintiff
                        </button>
                    </div>
                )}
            </div>
            
            {/* Defendants */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                    onClick={() => setShowDefendants(!showDefendants)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100"
                >
                    <span className="font-medium">Defendants/Respondents ({captionData.defendants.length})</span>
                    {showDefendants ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showDefendants && (
                    <div className="p-3 space-y-3">
                        {captionData.defendants.map((party, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="text"
                                        value={party.name}
                                        onChange={(e) => updateParty('defendants', index, { name: e.target.value })}
                                        className="input w-full"
                                        placeholder="Party name"
                                    />
                                    <div className="flex items-center gap-4">
                                        <select
                                            value={party.role}
                                            onChange={(e) => updateParty('defendants', index, { role: e.target.value as PartyInfo['role'] })}
                                            className="input flex-1"
                                        >
                                            <option value="defendant">Defendant</option>
                                            <option value="respondent">Respondent</option>
                                            <option value="appellee">Appellee</option>
                                            <option value="cross-appellant">Cross-Appellant</option>
                                        </select>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={party.isLeadParty}
                                                onChange={(e) => updateParty('defendants', index, { isLeadParty: e.target.checked })}
                                            />
                                            Lead Party
                                        </label>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeParty('defendants', index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => addParty('defendants')}
                            className="btn btn-secondary btn-sm"
                        >
                            Add Defendant
                        </button>
                    </div>
                )}
            </div>
            
            {/* Hearing Info (Optional) */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="label">Hearing Date (Optional)</label>
                    <input
                        type="date"
                        value={captionData.hearingDate || ''}
                        onChange={(e) => onChange({ ...captionData, hearingDate: e.target.value })}
                        className="input"
                    />
                </div>
                <div>
                    <label className="label">Hearing Time</label>
                    <input
                        type="time"
                        value={captionData.hearingTime || ''}
                        onChange={(e) => onChange({ ...captionData, hearingTime: e.target.value })}
                        className="input"
                    />
                </div>
                <div>
                    <label className="label">Location</label>
                    <input
                        type="text"
                        value={captionData.hearingLocation || ''}
                        onChange={(e) => onChange({ ...captionData, hearingLocation: e.target.value })}
                        className="input"
                        placeholder="e.g., Courtroom 5"
                    />
                </div>
            </div>
        </div>
    );
}

interface AttorneyFormProps {
    attorney: AttorneyInfo;
    onChange: (attorney: AttorneyInfo) => void;
}

function AttorneyForm({ attorney, onChange }: AttorneyFormProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Attorney Name</label>
                    <input
                        type="text"
                        value={attorney.name}
                        onChange={(e) => onChange({ ...attorney, name: e.target.value })}
                        className="input"
                        placeholder="e.g., Jane Doe"
                    />
                </div>
                <div>
                    <label className="label">Firm Name (Optional)</label>
                    <input
                        type="text"
                        value={attorney.firmName || ''}
                        onChange={(e) => onChange({ ...attorney, firmName: e.target.value })}
                        className="input"
                        placeholder="e.g., Smith & Associates LLP"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Bar Number</label>
                    <input
                        type="text"
                        value={attorney.barNumber}
                        onChange={(e) => onChange({ ...attorney, barNumber: e.target.value })}
                        className="input"
                        placeholder="e.g., 123456"
                    />
                </div>
                <div>
                    <label className="label">Bar State</label>
                    <input
                        type="text"
                        value={attorney.barState}
                        onChange={(e) => onChange({ ...attorney, barState: e.target.value })}
                        className="input"
                        placeholder="e.g., California"
                    />
                </div>
            </div>
            
            <div>
                <label className="label">Address (one line per field)</label>
                {attorney.address.map((line, index) => (
                    <input
                        key={index}
                        type="text"
                        value={line}
                        onChange={(e) => {
                            const newAddress = [...attorney.address];
                            newAddress[index] = e.target.value;
                            onChange({ ...attorney, address: newAddress });
                        }}
                        className="input mb-2"
                        placeholder={index === 0 ? 'Street Address' : index === 1 ? 'City, State ZIP' : 'Additional line'}
                    />
                ))}
                <button
                    onClick={() => onChange({ ...attorney, address: [...attorney.address, ''] })}
                    className="text-sm text-primary-600 hover:text-primary-700"
                >
                    + Add Address Line
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Phone</label>
                    <input
                        type="tel"
                        value={attorney.phone}
                        onChange={(e) => onChange({ ...attorney, phone: e.target.value })}
                        className="input"
                        placeholder="e.g., (555) 123-4567"
                    />
                </div>
                <div>
                    <label className="label">Fax (Optional)</label>
                    <input
                        type="tel"
                        value={attorney.fax || ''}
                        onChange={(e) => onChange({ ...attorney, fax: e.target.value })}
                        className="input"
                        placeholder="e.g., (555) 123-4568"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Email</label>
                    <input
                        type="email"
                        value={attorney.email}
                        onChange={(e) => onChange({ ...attorney, email: e.target.value })}
                        className="input"
                        placeholder="e.g., jane.doe@firm.com"
                    />
                </div>
                <div>
                    <label className="label">Representing</label>
                    <input
                        type="text"
                        value={attorney.representingParty}
                        onChange={(e) => onChange({ ...attorney, representingParty: e.target.value })}
                        className="input"
                        placeholder="e.g., Plaintiff ABC Corp."
                    />
                </div>
            </div>
        </div>
    );
}

interface ComplianceDisplayProps {
    compliance: FormattedDocument['compliance'];
}

function ComplianceDisplay({ compliance }: ComplianceDisplayProps) {
    return (
        <div className="space-y-4">
            {/* Status */}
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
                compliance.isCompliant ? 'bg-green-50' : 'bg-red-50'
            }`}>
                {compliance.isCompliant ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                    <div className={`font-medium ${compliance.isCompliant ? 'text-green-800' : 'text-red-800'}`}>
                        {compliance.isCompliant ? 'Document is compliant' : 'Compliance issues found'}
                    </div>
                    <div className={`text-sm ${compliance.isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                        {compliance.violations.length} violation(s), {compliance.warnings.length} warning(s)
                    </div>
                </div>
            </div>
            
            {/* Violations */}
            {compliance.violations.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Violations</h4>
                    <div className="space-y-2">
                        {compliance.violations.map((v, i) => (
                            <div key={i} className={`p-3 rounded-lg ${
                                v.severity === 'error' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                            }`}>
                                <div className="flex items-start gap-2">
                                    {v.severity === 'error' ? (
                                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                                    )}
                                    <div>
                                        <div className={`font-medium text-sm ${
                                            v.severity === 'error' ? 'text-red-800' : 'text-amber-800'
                                        }`}>
                                            {v.rule}
                                        </div>
                                        <div className={`text-sm ${
                                            v.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                                        }`}>
                                            {v.description}
                                        </div>
                                        {v.suggestion && (
                                            <div className="text-xs mt-1 text-slate-500">
                                                Suggestion: {v.suggestion}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Warnings */}
            {compliance.warnings.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Warnings</h4>
                    <div className="space-y-2">
                        {compliance.warnings.map((w, i) => (
                            <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-slate-500 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-sm text-slate-700">{w.rule}</div>
                                        <div className="text-sm text-slate-600">{w.description}</div>
                                        {w.suggestion && (
                                            <div className="text-xs mt-1 text-slate-500">
                                                Suggestion: {w.suggestion}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// Main Component
// ============================================

export function DocumentFormatter({
    documentContent,
    documentTitle,
    onFormatted,
    onClose,
    initialCourtId,
}: DocumentFormatterProps) {
    // State
    const [selectedCourt, setSelectedCourt] = useState<CourtFormattingRules | null>(
        initialCourtId ? getCourtById(initialCourtId) || null : null
    );
    const [activeTab, setActiveTab] = useState<'court' | 'caption' | 'attorney' | 'preview'>('court');
    const [captionData, setCaptionData] = useState<CaptionData>({
        courtName: '',
        caseNumber: '',
        plaintiffs: [{ name: '', role: 'plaintiff', isLeadParty: true }],
        defendants: [{ name: '', role: 'defendant', isLeadParty: true }],
        documentTitle: documentTitle || 'MOTION',
    });
    const [attorney, setAttorney] = useState<AttorneyInfo>({
        name: '',
        barNumber: '',
        barState: '',
        address: ['', ''],
        phone: '',
        email: '',
        representingParty: '',
    });
    const [services, _setServices] = useState<ServiceInfo[]>([]);
    const [formattedDoc, setFormattedDoc] = useState<FormattedDocument | null>(null);
    
    // Update caption when court changes
    useEffect(() => {
        if (selectedCourt) {
            setCaptionData(prev => ({
                ...prev,
                courtName: selectedCourt.courtName,
            }));
        }
    }, [selectedCourt]);
    
    // Generate formatted document
    const handleFormat = useCallback(() => {
        if (!selectedCourt) return;
        
        const formatted = formatDocument(
            documentContent,
            captionData,
            attorney,
            services,
            selectedCourt
        );
        
        setFormattedDoc(formatted);
        setActiveTab('preview');
    }, [selectedCourt, documentContent, captionData, attorney, services]);
    
    // Export to HTML
    const handleExport = useCallback(() => {
        if (!formattedDoc || !selectedCourt) return;
        
        const html = generateFullHtml(formattedDoc, selectedCourt, documentTitle);
        
        // Create and download file
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentTitle.replace(/\s+/g, '_')}_formatted.html`;
        a.click();
        URL.revokeObjectURL(url);
    }, [formattedDoc, selectedCourt, documentTitle]);
    
    // Apply to editor
    const handleApply = useCallback(() => {
        if (!formattedDoc || !onFormatted) return;
        
        const fullContent = [
            formattedDoc.caption,
            formattedDoc.tableOfContents,
            formattedDoc.tableOfAuthorities,
            formattedDoc.body,
            formattedDoc.signature,
            formattedDoc.certificateOfService,
        ].filter(Boolean).join('\n\n');
        
        onFormatted(fullContent);
        onClose?.();
    }, [formattedDoc, onFormatted, onClose]);
    
    // Word count
    const wordCount = useMemo(() => calculateWordCount(documentContent), [documentContent]);
    
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Document Formatter</h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">
                        {wordCount.toLocaleString()} words
                    </span>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                {[
                    { key: 'court', label: 'Court Rules', icon: Building },
                    { key: 'caption', label: 'Caption', icon: FileText },
                    { key: 'attorney', label: 'Attorney', icon: User },
                    { key: 'preview', label: 'Preview', icon: Eye },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.key
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'court' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-slate-800 mb-4">Select Court</h3>
                            <CourtSelector
                                selectedCourt={selectedCourt}
                                onSelect={setSelectedCourt}
                            />
                        </div>
                        
                        {selectedCourt && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-slate-800">Formatting Rules</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Font</div>
                                        <div className="text-sm font-medium">{selectedCourt.font.family[0]}</div>
                                        <div className="text-xs text-slate-500">
                                            {selectedCourt.font.sizeBody}pt body, {selectedCourt.font.lineHeight}x line spacing
                                        </div>
                                    </div>
                                    
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Margins</div>
                                        <div className="text-sm font-medium">
                                            {selectedCourt.margins.top}" top, {selectedCourt.margins.bottom}" bottom
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {selectedCourt.margins.left}" left, {selectedCourt.margins.right}" right
                                        </div>
                                    </div>
                                    
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Page Limit</div>
                                        <div className="text-sm font-medium">
                                            {selectedCourt.page.maxPages 
                                                ? `${selectedCourt.page.maxPages} pages`
                                                : 'No limit'
                                            }
                                        </div>
                                    </div>
                                    
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Word Limit</div>
                                        <div className="text-sm font-medium">
                                            {selectedCourt.wordCount?.maxWords 
                                                ? `${selectedCourt.wordCount.maxWords.toLocaleString()} words`
                                                : 'No limit'
                                            }
                                        </div>
                                    </div>
                                </div>
                                
                                {selectedCourt.additionalRequirements && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="text-xs text-amber-600 uppercase mb-2">Additional Requirements</div>
                                        <ul className="text-sm text-amber-800 space-y-1">
                                            {selectedCourt.additionalRequirements.map((req, i) => (
                                                <li key={i}>- {req}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'caption' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-slate-800">Caption Information</h3>
                        <CaptionForm captionData={captionData} onChange={setCaptionData} />
                    </div>
                )}
                
                {activeTab === 'attorney' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-slate-800">Attorney Information</h3>
                        <AttorneyForm attorney={attorney} onChange={setAttorney} />
                    </div>
                )}
                
                {activeTab === 'preview' && (
                    <div className="space-y-6">
                        {formattedDoc ? (
                            <>
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-slate-800">
                                            {formattedDoc.wordCount.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-slate-500">Words</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-slate-800">
                                            {formattedDoc.pageCount}
                                        </div>
                                        <div className="text-xs text-slate-500">Est. Pages</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                        <div className={`text-2xl font-bold ${
                                            formattedDoc.compliance.isCompliant ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {formattedDoc.compliance.isCompliant ? 'Pass' : 'Fail'}
                                        </div>
                                        <div className="text-xs text-slate-500">Compliance</div>
                                    </div>
                                </div>
                                
                                {/* Compliance */}
                                <ComplianceDisplay compliance={formattedDoc.compliance} />
                                
                                {/* Preview */}
                                <div>
                                    <h4 className="text-sm font-medium text-slate-700 mb-2">Document Preview</h4>
                                    <div 
                                        className="border border-slate-200 rounded-lg p-6 bg-white max-h-96 overflow-y-auto prose prose-sm"
                                        dangerouslySetInnerHTML={{ 
                                            __html: [
                                                formattedDoc.caption,
                                                formattedDoc.body.substring(0, 2000) + (formattedDoc.body.length > 2000 ? '...' : ''),
                                            ].join('<hr/>') 
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <Eye className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-600 mb-4">
                                    Click "Format Document" to preview the formatted document
                                </p>
                                <button
                                    onClick={handleFormat}
                                    disabled={!selectedCourt}
                                    className="btn btn-primary"
                                >
                                    Format Document
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200">
                <div className="text-sm text-slate-500">
                    {selectedCourt ? selectedCourt.courtName : 'No court selected'}
                </div>
                
                <div className="flex items-center gap-2">
                    {activeTab !== 'preview' ? (
                        <button
                            onClick={handleFormat}
                            disabled={!selectedCourt}
                            className="btn btn-primary"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Format Document
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleExport}
                                disabled={!formattedDoc}
                                className="btn btn-secondary"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export HTML
                            </button>
                            {onFormatted && (
                                <button
                                    onClick={handleApply}
                                    disabled={!formattedDoc}
                                    className="btn btn-primary"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Apply to Document
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DocumentFormatter;

