import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { updateField } from '../features/intakeSlice';
import { generateDraft } from '../services/templateEngine';
import type { Jurisdiction, PracticeArea, DocType } from '../types';
import { setContent } from '../features/editorSlice';
import { ArrowRight, FileText, Scale, Gavel } from 'lucide-react';

/**
 * Multi-step Intake Wizard.
 * Collects user input (Jurisdiction, DocType, Specifics) to generate an initial draft.
 * Pushes the generated draft to the Editor upon completion.
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
            // Final Step: Generate Draft
            const draftContent = generateDraft(intake);
            dispatch(setContent(draftContent));
            navigate(`/draft/${Date.now()}`); // Pseudo-ID for now
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-[var(--bg-app)] to-[#1a1d24]">
            <div className="w-full max-w-2xl p-8 glass-panel rounded-xl shadow-2xl">
                {/* Progress Bar */}
                <div className="flex justify-between mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`h-2 flex-1 mx-1 rounded-full transition-all ${s <= step ? 'bg-[var(--primary-brand)]' : 'bg-[var(--border-strong)]'}`} />
                    ))}
                </div>

                <h1 className="text-3xl font-bold mb-2 font-serif">Let's start your draft</h1>
                <p className="text-[var(--text-secondary)] mb-8">Step {step} of 3</p>

                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-semibold flex items-center gap-2"><Gavel size={20} /> Jurisdiction & Practice</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {['California', 'New York', 'Texas', 'Delaware', 'Federal'].map((j) => (
                                <button
                                    key={j}
                                    onClick={() => dispatch(updateField({ jurisdiction: j as Jurisdiction }))}
                                    className={`p-4 rounded-lg border text-left transition-all ${intake.jurisdiction === j
                                        ? 'border-[var(--primary-brand)] bg-[var(--bg-surface-hover)]'
                                        : 'border-[var(--border-strong)] hover:border-[var(--text-secondary)]'
                                        }`}
                                >
                                    {j}
                                </button>
                            ))}
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium mb-2">Practice Area</label>
                            <select
                                className="w-full p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] focus:border-[var(--primary-brand)] outline-none"
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
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-semibold flex items-center gap-2"><FileText size={20} /> Document Type</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {['Demand Letter', 'Settlement Agreement', 'Opinion Letter', 'Client Update'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => dispatch(updateField({ docType: type as DocType }))}
                                    className={`p-4 rounded-lg border flex items-center justify-between group transition-all ${intake.docType === type
                                        ? 'border-[var(--primary-brand)] bg-[var(--bg-surface-hover)]'
                                        : 'border-[var(--border-strong)] hover:border-[var(--text-secondary)]'
                                        }`}
                                >
                                    <span className="font-medium">{type}</span>
                                    {intake.docType === type && <ArrowRight size={18} className="text-[var(--primary-brand)]" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-semibold flex items-center gap-2"><Scale size={20} /> Specifics</h2>
                        <div>
                            <label className="block text-sm font-medium mb-2">Opposing Counsel / Party Name</label>
                            <input
                                type="text"
                                className="w-full p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] focus:border-[var(--primary-brand)] outline-none"
                                placeholder="e.g. Acme Corp Legal Dept."
                                value={intake.opponentName}
                                onChange={(e) => dispatch(updateField({ opponentName: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Client Goal</label>
                            <textarea
                                className="w-full p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] focus:border-[var(--primary-brand)] outline-none h-32"
                                placeholder="Describe the desired outcome (e.g. Full settlement of $50k)"
                                value={intake.clientGoal}
                                onChange={(e) => dispatch(updateField({ clientGoal: e.target.value }))}
                            />
                        </div>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleNext}
                        className="px-6 py-3 bg-[var(--primary-brand)] hover:bg-[var(--primary-brand-hover)] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        {step === 3 ? 'Generate Draft' : 'Continue'} <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
