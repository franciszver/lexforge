import { useAppSelector } from '../../store';
import { Scale, MapPin, FileText, Target, User } from 'lucide-react';

/**
 * Domain panel showing jurisdiction, practice area, and document context.
 */
export function DomainPanel() {
  const { currentDocument } = useAppSelector((state) => state.document);

  if (!currentDocument) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <Scale className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            No document selected
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="space-y-3">
        {/* Jurisdiction */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary-600" />
            <h4 className="text-sm font-medium text-slate-700">Jurisdiction</h4>
          </div>
          <p className="text-sm text-slate-900">{currentDocument.jurisdiction || 'Not specified'}</p>
          <p className="text-xs text-slate-500 mt-1">
            AI suggestions will be tailored to this jurisdiction's laws and regulations
          </p>
        </div>

        {/* Practice Area */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-primary-600" />
            <h4 className="text-sm font-medium text-slate-700">Practice Area</h4>
          </div>
          <p className="text-sm text-slate-900">{currentDocument.practiceArea || 'Not specified'}</p>
        </div>

        {/* Document Type */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary-600" />
            <h4 className="text-sm font-medium text-slate-700">Document Type</h4>
          </div>
          <p className="text-sm text-slate-900">{currentDocument.docType || 'Not specified'}</p>
        </div>

        {/* Opposing Party */}
        {currentDocument.opponentName && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary-600" />
              <h4 className="text-sm font-medium text-slate-700">Opposing Party</h4>
            </div>
            <p className="text-sm text-slate-900">{currentDocument.opponentName}</p>
          </div>
        )}

        {/* Client Objective */}
        {currentDocument.clientGoal && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary-600" />
              <h4 className="text-sm font-medium text-slate-700">Client Objective</h4>
            </div>
            <p className="text-sm text-slate-900">{currentDocument.clientGoal}</p>
          </div>
        )}
      </div>

      {/* AI Context Info */}
      <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
        <h4 className="text-sm font-medium text-primary-700 mb-2">AI Context</h4>
        <p className="text-xs text-primary-600">
          The AI assistant uses this domain information to provide relevant legal suggestions,
          cite applicable precedents, and ensure jurisdiction-specific compliance.
        </p>
      </div>
    </div>
  );
}

