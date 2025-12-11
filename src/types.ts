export type Jurisdiction = 'California' | 'New York' | 'Texas' | 'Delaware' | 'Federal';
export type PracticeArea = 'Litigation' | 'Corporate' | 'Real Estate' | 'Family Law';
export type DocType = 'Demand Letter' | 'Settlement Agreement' | 'Opinion Letter' | 'Client Update';

export interface IntakeData {
    jurisdiction: Jurisdiction;
    practiceArea: PracticeArea;
    docType: DocType;
    opponentName?: string;
    clientGoal: string;
    keyFacts: string[];
}

export interface DraftMetadata {
    jurisdiction: Jurisdiction;
    docType: DocType;
    lastEdited: string; // ISO Date
    status: 'draft' | 'review' | 'final';
}

export interface Draft {
    id: string;
    userId: string;
    title: string;
    content: string; // HTML string from TipTap
    metadata: DraftMetadata;
    intakeData: IntakeData;
    createdAt: string;
    updatedAt: string;
}

export interface Suggestion {
    id: string;
    type: 'precision' | 'tone' | 'risk' | 'source';
    text: string; // The generated advice
    originalText?: string; // The text highlighted
    replacementText?: string; // Suggested fix
    confidence: number;
    source?: string; // Citation
}

export interface Template {
    id: string;
    category: DocType;
    name: string;
    skeletonContent: string; // HTML
    defaultMetadata: Partial<DraftMetadata>;
}
