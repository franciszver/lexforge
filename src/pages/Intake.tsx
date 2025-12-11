import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { updateField } from '../features/intakeSlice';
import { generateDraft } from '../services/templateEngine';
import type { Jurisdiction, PracticeArea, DocType } from '../types';
import { setContent } from '../features/editorSlice';

const STEP_LABELS = ['Jurisdiction', 'Document Type', 'Details'];

/**
 * Multi-step Intake Wizard.
 * Collects user input to generate an initial draft.
 * Styled to match DraftWise theming.
 */
export const Intake = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const intake = useSelector((state: RootState) => state.intake);
    const [step, setStep] = React.useState(1);

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            const draftContent = generateDraft(intake);
            dispatch(setContent(draftContent));
            navigate(`/draft/${Date.now()}`);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="font-semibold text-slate-900">LexForge</span>
                        </Link>
                        <div className="h-6 w-px bg-slate-200" />
                        <h1 className="text-lg font-medium text-slate-700">New Document</h1>
                    </div>

                    <Link to="/" className="btn-ghost btn-sm">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                    </Link>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-6">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8">
                    {STEP_LABELS.map((label, idx) => {
                        const stepNum = idx + 1;
                        const isCompleted = step > stepNum;
                        const isCurrent = step === stepNum;
                        return (
                            <React.Fragment key={label}>
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                                        isCompleted 
                                            ? 'bg-success-500 text-white' 
                                            : isCurrent 
                                                ? 'bg-primary-600 text-white' 
                                                : 'bg-slate-100 text-slate-400 border-2 border-slate-300'
                                    }`}>
                                        {isCompleted ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : stepNum}
                                    </div>
                                    <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-primary-600' : 'text-slate-400'}`}>
                                        {label}
                                    </span>
                                </div>
                                {idx < STEP_LABELS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-4 rounded ${step > stepNum ? 'bg-success-500' : 'bg-slate-200'}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Form Card */}
                <div className="card p-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                    </svg>
                                    Select Jurisdiction
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">Choose the jurisdiction for your legal document</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {['California', 'New York', 'Texas', 'Delaware', 'Federal'].map((j) => (
                                    <button
                                        key={j}
                                        onClick={() => dispatch(updateField({ jurisdiction: j as Jurisdiction }))}
                                        className={`p-4 rounded-lg border text-left transition-all ${intake.jurisdiction === j
                                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                                            : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="font-medium">{j}</span>
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="label">Practice Area</label>
                                <select
                                    className="input"
                                    value={intake.practiceArea}
                                    onChange={(e) => dispatch(updateField({ practiceArea: e.target.value as PracticeArea }))}
                                >
                                    <option>Litigation</option>
                                    <option>Corporate</option>
                                    <option>Real Estate</option>
                                    <option>Family Law</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Choose Document Type
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">Select the type of document you need to create</p>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { type: 'Demand Letter', desc: 'Request payment or action from opposing party' },
                                    { type: 'Settlement Agreement', desc: 'Formally resolve disputes between parties' },
                                    { type: 'Opinion Letter', desc: 'Provide legal analysis and recommendations' },
                                    { type: 'Client Update', desc: 'Communicate case status and developments' },
                                ].map(({ type, desc }) => (
                                    <button
                                        key={type}
                                        onClick={() => dispatch(updateField({ docType: type as DocType }))}
                                        className={`w-full p-4 rounded-lg border text-left transition-all ${intake.docType === type
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`font-medium ${intake.docType === type ? 'text-primary-700' : 'text-slate-900'}`}>
                                                {type}
                                            </span>
                                            {intake.docType === type && (
                                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">{desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Case Details
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">Provide specifics to help generate a tailored draft</p>
                            </div>

                            <div>
                                <label className="label">Opposing Counsel / Party Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Acme Corp Legal Dept."
                                    value={intake.opponentName}
                                    onChange={(e) => dispatch(updateField({ opponentName: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="label">Client Goal</label>
                                <textarea
                                    className="input h-32 resize-none"
                                    placeholder="Describe the desired outcome (e.g. Full settlement of $50,000 for breach of contract)"
                                    value={intake.clientGoal}
                                    onChange={(e) => dispatch(updateField({ clientGoal: e.target.value }))}
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Be specific - this helps the AI generate more relevant suggestions
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
                        <button
                            onClick={handleBack}
                            disabled={step === 1}
                            className={`btn-ghost ${step === 1 ? 'opacity-0 cursor-default' : ''}`}
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            className="btn-primary"
                        >
                            {step === 3 ? 'Generate Draft' : 'Continue'}
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};
