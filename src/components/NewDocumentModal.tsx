import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store';
import { createDocument } from '../features/documentSlice';
import { setShowNewDocModal } from '../features/uiSlice';
import { X, Check } from 'lucide-react';

type Step = 'title' | 'jurisdiction' | 'practiceArea' | 'docType' | 'details';

const jurisdictions = [
  { id: 'federal', name: 'Federal', description: 'United States Federal Courts' },
  { id: 'new_york', name: 'New York', description: 'NY State Courts and regulations' },
  { id: 'california', name: 'California', description: 'CA State Courts and regulations' },
  { id: 'texas', name: 'Texas', description: 'TX State Courts and regulations' },
  { id: 'florida', name: 'Florida', description: 'FL State Courts and regulations' },
  { id: 'illinois', name: 'Illinois', description: 'IL State Courts and regulations' },
];

const practiceAreas = [
  { id: 'litigation', name: 'Litigation', description: 'Civil and commercial disputes' },
  { id: 'corporate', name: 'Corporate', description: 'Business formation and transactions' },
  { id: 'ip', name: 'Intellectual Property', description: 'Patents, trademarks, copyrights' },
  { id: 'employment', name: 'Employment', description: 'Labor and employment law' },
  { id: 'real_estate', name: 'Real Estate', description: 'Property and land use' },
  { id: 'regulatory', name: 'Regulatory', description: 'Government compliance' },
];

const docTypes = [
  { id: 'demand_letter', name: 'Demand Letter', description: 'Formal request for action or payment', template: true },
  { id: 'cease_desist', name: 'Cease and Desist', description: 'Letter demanding stop of activity', template: true },
  { id: 'contract', name: 'Contract', description: 'Legal agreement between parties', template: true },
  { id: 'motion', name: 'Motion', description: 'Request to the court', template: true },
  { id: 'memo', name: 'Legal Memorandum', description: 'Internal legal analysis', template: true },
  { id: 'brief', name: 'Brief', description: 'Legal argument submitted to court', template: true },
  { id: 'other', name: 'Other', description: 'Custom document type', template: false },
];

const templates: Record<string, string> = {
  demand_letter: `<h1>DEMAND LETTER</h1>
<p>[Date]</p>
<p><strong>VIA [METHOD OF DELIVERY]</strong></p>
<p>[Recipient Name]<br/>[Recipient Address]</p>
<p>Re: [Subject Matter]</p>
<p>Dear [Recipient]:</p>
<p>This letter is to formally notify you that [describe the issue or demand].</p>
<h2>FACTUAL BACKGROUND</h2>
<p>[Describe relevant facts]</p>
<h2>LEGAL BASIS</h2>
<p>[Cite applicable laws and precedents]</p>
<h2>DEMAND</h2>
<p>Based on the foregoing, we demand that you:</p>
<ol>
<li>[First demand]</li>
<li>[Second demand]</li>
</ol>
<p>Please respond within [X] days of receipt of this letter.</p>
<p>Sincerely,</p>
<p>[Your Name]<br/>[Title]</p>`,
  cease_desist: `<h1>CEASE AND DESIST</h1>
<p>[Date]</p>
<p><strong>SENT VIA CERTIFIED MAIL</strong></p>
<p>[Recipient Name]<br/>[Recipient Address]</p>
<p>Re: Cease and Desist - [Subject Matter]</p>
<p>Dear [Recipient]:</p>
<p>This firm represents [Client Name] regarding [subject matter].</p>
<h2>UNLAWFUL ACTIVITY</h2>
<p>[Describe the infringing or unlawful activity]</p>
<h2>DEMAND TO CEASE</h2>
<p>You are hereby demanded to immediately cease and desist from:</p>
<ul>
<li>[Activity 1]</li>
<li>[Activity 2]</li>
</ul>
<p>Failure to comply within [X] days will result in [consequences].</p>
<p>Govern yourself accordingly.</p>
<p>Very truly yours,</p>
<p>[Attorney Name]</p>`,
  contract: `<h1>AGREEMENT</h1>
<p>This Agreement ("Agreement") is entered into as of [Date] by and between:</p>
<p><strong>[Party A Name]</strong> ("Party A"), and<br/>
<strong>[Party B Name]</strong> ("Party B").</p>
<h2>RECITALS</h2>
<p>WHEREAS, [background and purpose];</p>
<p>NOW, THEREFORE, in consideration of the mutual covenants herein, the parties agree as follows:</p>
<h2>1. DEFINITIONS</h2>
<p>[Define key terms]</p>
<h2>2. OBLIGATIONS OF PARTY A</h2>
<p>[Party A's responsibilities]</p>
<h2>3. OBLIGATIONS OF PARTY B</h2>
<p>[Party B's responsibilities]</p>
<h2>4. TERM AND TERMINATION</h2>
<p>[Duration and termination conditions]</p>
<h2>5. MISCELLANEOUS</h2>
<p>[Standard provisions]</p>
<p><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement.</p>`,
  motion: `<h1>MOTION FOR [RELIEF SOUGHT]</h1>
<p><strong>[COURT NAME]</strong></p>
<p>[Case Name]<br/>Case No. [Number]</p>
<h2>I. INTRODUCTION</h2>
<p>[Brief statement of relief sought]</p>
<h2>II. FACTUAL BACKGROUND</h2>
<p>[Relevant facts]</p>
<h2>III. LEGAL ARGUMENT</h2>
<h3>A. [First Argument]</h3>
<p>[Supporting analysis]</p>
<h3>B. [Second Argument]</h3>
<p>[Supporting analysis]</p>
<h2>IV. CONCLUSION</h2>
<p>For the foregoing reasons, [Party] respectfully requests that this Court [specific relief].</p>
<p>Respectfully submitted,</p>
<p>[Attorney Name]<br/>Counsel for [Party]</p>`,
  memo: `<h1>LEGAL MEMORANDUM</h1>
<p><strong>TO:</strong> [Recipient]<br/>
<strong>FROM:</strong> [Author]<br/>
<strong>DATE:</strong> [Date]<br/>
<strong>RE:</strong> [Subject]</p>
<h2>QUESTION PRESENTED</h2>
<p>[Concise statement of the legal question]</p>
<h2>BRIEF ANSWER</h2>
<p>[Short answer to the question]</p>
<h2>STATEMENT OF FACTS</h2>
<p>[Relevant facts]</p>
<h2>DISCUSSION</h2>
<h3>I. [First Issue]</h3>
<p>[Analysis]</p>
<h3>II. [Second Issue]</h3>
<p>[Analysis]</p>
<h2>CONCLUSION</h2>
<p>[Summary and recommendations]</p>`,
  brief: `<h1>BRIEF IN SUPPORT OF [MOTION/APPEAL]</h1>
<p><strong>[COURT NAME]</strong></p>
<p>[Case Name]<br/>Case No. [Number]</p>
<h2>TABLE OF CONTENTS</h2>
<p>[To be completed]</p>
<h2>TABLE OF AUTHORITIES</h2>
<p>[To be completed]</p>
<h2>STATEMENT OF THE ISSUES</h2>
<ol>
<li>[Issue 1]</li>
<li>[Issue 2]</li>
</ol>
<h2>STATEMENT OF THE CASE</h2>
<p>[Procedural history and facts]</p>
<h2>ARGUMENT</h2>
<h3>I. [POINT HEADING 1]</h3>
<p>[Legal argument with citations]</p>
<h3>II. [POINT HEADING 2]</h3>
<p>[Legal argument with citations]</p>
<h2>CONCLUSION</h2>
<p>[Relief requested]</p>`,
};

export function NewDocumentModal() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('title');
  const [title, setTitle] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [practiceArea, setPracticeArea] = useState('');
  const [docType, setDocType] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [clientGoal, setClientGoal] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    dispatch(setShowNewDocModal(false));
  };

  const getStepNumber = () => {
    const steps: Step[] = ['title', 'jurisdiction', 'practiceArea', 'docType', 'details'];
    return steps.indexOf(step) + 1;
  };

  const handleBack = () => {
    switch (step) {
      case 'jurisdiction': setStep('title'); break;
      case 'practiceArea': setStep('jurisdiction'); break;
      case 'docType': setStep('practiceArea'); break;
      case 'details': setStep('docType'); break;
    }
  };

  const handleCreate = useCallback(async () => {
    setLoading(true);
    try {
      const templateContent = useTemplate && templates[docType] ? templates[docType] : '';
      const result = await dispatch(createDocument({
        title,
        content: templateContent,
        jurisdiction,
        practiceArea,
        docType: docTypes.find(d => d.id === docType)?.name || 'Other',
        opponentName,
        clientGoal,
      })).unwrap();

      dispatch(setShowNewDocModal(false));
      navigate(`/draft/${result.id}`);
    } catch (error) {
      console.error('Failed to create document:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, navigate, title, jurisdiction, practiceArea, docType, opponentName, clientGoal, useTemplate]);

  const selectedDocType = docTypes.find(d => d.id === docType);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slide-up max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">New Document</h2>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    num < getStepNumber()
                      ? 'bg-primary-600 text-white'
                      : num === getStepNumber()
                        ? 'bg-primary-100 text-primary-600 ring-2 ring-primary-600'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {num < getStepNumber() ? <Check className="w-4 h-4" /> : num}
                </div>
                {num < 5 && (
                  <div className={`w-8 h-0.5 ${num < getStepNumber() ? 'bg-primary-600' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Title */}
          {step === 'title' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="docTitle" className="label">Document Title</label>
                <input
                  id="docTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  placeholder="e.g., Smith v. Jones - Demand Letter"
                  autoFocus
                />
                <p className="mt-1 text-xs text-slate-500">
                  Give your document a descriptive name
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setStep('jurisdiction')}
                  disabled={!title.trim()}
                  className="btn-primary"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Jurisdiction */}
          {step === 'jurisdiction' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Select Jurisdiction</label>
                <button onClick={handleBack} className="text-sm text-primary-600 hover:underline">
                  Back
                </button>
              </div>
              <div className="space-y-2">
                {jurisdictions.map((j) => (
                  <label
                    key={j.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      jurisdiction === j.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="jurisdiction"
                      value={j.id}
                      checked={jurisdiction === j.id}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{j.name}</p>
                      <p className="text-xs text-slate-500">{j.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setStep('practiceArea')}
                  disabled={!jurisdiction}
                  className="btn-primary"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Practice Area */}
          {step === 'practiceArea' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Practice Area</label>
                <button onClick={handleBack} className="text-sm text-primary-600 hover:underline">
                  Back
                </button>
              </div>
              <div className="space-y-2">
                {practiceAreas.map((pa) => (
                  <label
                    key={pa.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      practiceArea === pa.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="practiceArea"
                      value={pa.id}
                      checked={practiceArea === pa.id}
                      onChange={(e) => setPracticeArea(e.target.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{pa.name}</p>
                      <p className="text-xs text-slate-500">{pa.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setStep('docType')}
                  disabled={!practiceArea}
                  className="btn-primary"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Document Type */}
          {step === 'docType' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Document Type</label>
                <button onClick={handleBack} className="text-sm text-primary-600 hover:underline">
                  Back
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {docTypes.map((dt) => (
                  <label
                    key={dt.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      docType === dt.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="docType"
                      value={dt.id}
                      checked={docType === dt.id}
                      onChange={(e) => setDocType(e.target.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 text-sm">{dt.name}</p>
                        {dt.template && (
                          <span className="badge-primary text-xs">Template</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{dt.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Template option */}
              {selectedDocType?.template && (
                <label className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:border-primary-300">
                  <input
                    type="checkbox"
                    checked={useTemplate}
                    onChange={(e) => setUseTemplate(e.target.checked)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      Pre-populate with template
                    </p>
                    <p className="text-xs text-slate-500">
                      Start with a {selectedDocType.name.toLowerCase()} template with standard sections
                    </p>
                  </div>
                </label>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setStep('details')}
                  disabled={!docType}
                  className="btn-primary"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Additional Details (Optional)</label>
                <button onClick={handleBack} className="text-sm text-primary-600 hover:underline">
                  Back
                </button>
              </div>
              
              <div>
                <label className="label">Opposing Party Name</label>
                <input
                  type="text"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  className="input"
                  placeholder="e.g., Acme Corporation"
                />
              </div>

              <div>
                <label className="label">Client Objective</label>
                <textarea
                  value={clientGoal}
                  onChange={(e) => setClientGoal(e.target.value)}
                  className="input min-h-[80px]"
                  placeholder="e.g., Recover $50,000 in unpaid invoices"
                />
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Summary</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li><strong>Title:</strong> {title}</li>
                  <li><strong>Jurisdiction:</strong> {jurisdictions.find(j => j.id === jurisdiction)?.name}</li>
                  <li><strong>Practice Area:</strong> {practiceAreas.find(pa => pa.id === practiceArea)?.name}</li>
                  <li><strong>Document Type:</strong> {selectedDocType?.name}</li>
                  <li><strong>Template:</strong> {useTemplate && selectedDocType?.template ? 'Yes' : 'No'}</li>
                </ul>
              </div>

              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <span className="spinner mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Document'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

