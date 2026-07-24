/**
 * Demo Mode Fixtures
 *
 * Bundled, entirely fictional data used to make the app explorable without
 * an AWS backend. No real client, case, or personal data.
 */

export const DEMO_USER = {
    userId: 'demo-user-1',
    email: 'demo@lexforge.app',
    isAdmin: true,
};

export const DEMO_DOCUMENT_ID = 'demo-doc-1';

const DEMO_DOCUMENT_CONTENT = `
<h1>DEMAND FOR SETTLEMENT</h1>
<p><strong>Re: Slip and Fall Incident — Meridian Logistics LLC Distribution Center</strong></p>
<p>To Whom It May Concern:</p>
<p>This firm represents <strong>Dana Whitfield</strong> in connection with injuries sustained on
March 14, 2026, at the Meridian Logistics LLC distribution facility located at 4820 Harbor
Freight Road, Millbrook, GA 31059.</p>
<h2>Statement of Facts</h2>
<p>On the date in question, our client was making a scheduled delivery when she slipped on an
unmarked wet floor near the loading dock entrance. The area had recently been mopped and no
warning signage was present. As a direct result of this fall, Ms. Whitfield suffered a fractured
wrist and a lumbar strain requiring ongoing physical therapy.</p>
<h2>Liability</h2>
<p>Meridian Logistics LLC owed a duty of reasonable care to maintain its premises in a safe
condition for invitees. The failure to post warning signage after mopping the loading dock floor
constitutes a breach of that duty.</p>
<h2>Damages</h2>
<ul>
  <li>Medical expenses to date: $18,420</li>
  <li>Estimated future physical therapy: $6,500</li>
  <li>Lost wages (6 weeks): $9,200</li>
</ul>
<p>[DRAFT IN PROGRESS — additional argument sections and settlement demand to be added.]</p>
`.trim();

export const DEMO_DOCUMENT = {
    id: DEMO_DOCUMENT_ID,
    userId: DEMO_USER.userId,
    owner: DEMO_USER.email,
    title: 'Whitfield v. Meridian Logistics LLC — Demand Letter',
    content: DEMO_DOCUMENT_CONTENT,
    status: 'draft',
    metadata: JSON.stringify({
        jurisdiction: 'Georgia',
        practiceArea: 'Personal Injury',
        docType: 'Demand Letter',
        opponentName: 'Meridian Logistics LLC',
    }),
    intakeData: JSON.stringify({
        clientGoal: 'Obtain a fair settlement covering medical costs and lost wages without litigation.',
        keyFacts: [
            'Unmarked wet floor near loading dock',
            'No warning signage posted',
            'Fractured wrist and lumbar strain',
        ],
    }),
    createdAt: '2026-06-01T14:00:00.000Z',
    updatedAt: '2026-07-20T09:30:00.000Z',
};

export const DEMO_CLAUSES = [
    {
        id: 'demo-clause-1',
        title: 'Standard Indemnification (Mutual)',
        content: '<p>Each party shall indemnify, defend, and hold harmless the other party from and against any third-party claims arising out of its own negligence or willful misconduct.</p>',
        description: 'Mutual indemnification for third-party claims.',
        category: 'Indemnification',
        subcategory: 'Mutual',
        tags: JSON.stringify(['indemnification', 'liability']),
        jurisdiction: 'Federal',
        documentTypes: JSON.stringify(['Contract', 'Agreement', 'Demand Letter']),
        usageCount: 42,
        lastUsedAt: '2026-07-10T00:00:00.000Z',
        variations: JSON.stringify([]),
        placeholders: JSON.stringify([]),
        isPublished: true,
        author: 'Demo User',
    },
    {
        id: 'demo-clause-2',
        title: 'Mutual Confidentiality',
        content: '<p>Each party agrees to keep confidential all non-public information disclosed by the other party and to use it solely for purposes of this Agreement.</p>',
        description: 'Standard two-way confidentiality obligation.',
        category: 'Confidentiality',
        subcategory: 'Mutual',
        tags: JSON.stringify(['NDA', 'confidentiality']),
        jurisdiction: 'Federal',
        documentTypes: JSON.stringify(['NDA', 'Agreement', 'Demand Letter']),
        usageCount: 37,
        lastUsedAt: '2026-07-08T00:00:00.000Z',
        variations: JSON.stringify([]),
        placeholders: JSON.stringify([]),
        isPublished: true,
        author: 'Demo User',
    },
    {
        id: 'demo-clause-3',
        title: 'Termination for Convenience',
        content: '<p>Either party may terminate this Agreement for any reason upon thirty (30) days’ written notice to the other party.</p>',
        description: 'Allows either party to walk away with notice.',
        category: 'Termination',
        tags: JSON.stringify(['termination']),
        jurisdiction: 'Federal',
        documentTypes: JSON.stringify(['Contract', 'Service Agreement', 'Demand Letter']),
        usageCount: 21,
        variations: JSON.stringify([]),
        placeholders: JSON.stringify([]),
        isPublished: true,
        author: 'Demo User',
    },
    {
        id: 'demo-clause-4',
        title: 'Limitation of Liability (Cap at Fees Paid)',
        content: '<p>In no event shall either party’s aggregate liability exceed the total fees paid under this Agreement in the twelve (12) months preceding the claim.</p>',
        description: 'Caps liability at fees paid.',
        category: 'Limitation of Liability',
        tags: JSON.stringify(['liability', 'cap']),
        jurisdiction: 'Federal',
        documentTypes: JSON.stringify(['Contract', 'Service Agreement', 'Demand Letter']),
        usageCount: 30,
        variations: JSON.stringify([]),
        placeholders: JSON.stringify([]),
        isPublished: true,
        author: 'Demo User',
    },
    {
        id: 'demo-clause-5',
        title: 'Work Made for Hire / IP Assignment',
        content: '<p>All deliverables shall be deemed “works made for hire.” To the extent any deliverable does not qualify, the creating party hereby assigns all right, title, and interest to the receiving party.</p>',
        description: 'Assigns IP ownership of deliverables.',
        category: 'Intellectual Property',
        tags: JSON.stringify(['IP', 'assignment']),
        jurisdiction: 'Federal',
        documentTypes: JSON.stringify(['Service Agreement', 'License Agreement', 'Demand Letter']),
        usageCount: 18,
        variations: JSON.stringify([]),
        placeholders: JSON.stringify([]),
        isPublished: true,
        author: 'Demo User',
    },
    {
        id: 'demo-clause-6',
        title: 'Binding Arbitration',
        content: '<p>Any dispute arising out of or relating to this Agreement shall be resolved by binding arbitration administered by the American Arbitration Association.</p>',
        description: 'Routes disputes to arbitration instead of court.',
        category: 'Dispute Resolution',
        tags: JSON.stringify(['arbitration', 'dispute']),
        jurisdiction: 'Federal',
        documentTypes: JSON.stringify(['Contract', 'Agreement', 'Demand Letter']),
        usageCount: 15,
        variations: JSON.stringify([
            { jurisdiction: 'California', content: '<p>Any dispute shall be resolved by binding arbitration in accordance with California Code of Civil Procedure § 1280 et seq.</p>' },
        ]),
        placeholders: JSON.stringify([]),
        isPublished: true,
        author: 'Demo User',
    },
    {
        id: 'demo-clause-7',
        title: 'Force Majeure',
        content: '<p>Neither party shall be liable for delay or failure to perform resulting from causes beyond its reasonable control, including acts of God, natural disaster, or governmental action.</p>',
        description: 'Excuses performance during extraordinary events.',
        category: 'Force Majeure',
        tags: JSON.stringify(['force majeure']),
        jurisdiction: 'Federal',
        documentTypes: JSON.stringify(['Contract', 'Agreement', 'Lease', 'Demand Letter']),
        usageCount: 12,
        variations: JSON.stringify([]),
        placeholders: JSON.stringify([]),
        isPublished: true,
        author: 'Demo User',
    },
    {
        id: 'demo-clause-8',
        title: 'Governing Law (California)',
        content: '<p>This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of laws principles.</p>',
        description: 'Sets California as the governing jurisdiction.',
        category: 'Governing Law',
        jurisdiction: 'California',
        tags: JSON.stringify(['governing law']),
        documentTypes: JSON.stringify(['Contract', 'Agreement', 'Demand Letter']),
        usageCount: 25,
        variations: JSON.stringify([]),
        placeholders: JSON.stringify([]),
        isPublished: true,
        author: 'Demo User',
    },
    {
        id: 'demo-clause-9',
        title: 'Non-Solicitation of Employees',
        content: '<p>During the term of this Agreement and for twelve (12) months thereafter, neither party shall solicit for employment any employee of the other party.</p>',
        description: 'Prevents poaching employees post-engagement.',
        category: 'Non-Solicitation',
        tags: JSON.stringify(['non-solicitation', 'employment']),
        jurisdiction: 'Federal',
        documentTypes: JSON.stringify(['Service Agreement', 'Partnership Agreement', 'Demand Letter']),
        usageCount: 9,
        variations: JSON.stringify([]),
        placeholders: JSON.stringify([]),
        isPublished: true,
        author: 'Demo User',
    },
    {
        id: 'demo-clause-10',
        title: 'Notices',
        content: '<p>All notices under this Agreement shall be in writing and delivered by email with confirmation of receipt, or by certified mail to the addresses set forth above.</p>',
        description: 'Standard formal notice mechanism.',
        category: 'Notices',
        tags: JSON.stringify(['notices']),
        jurisdiction: 'Federal',
        documentTypes: JSON.stringify(['Contract', 'Agreement', 'Lease', 'Demand Letter']),
        usageCount: 14,
        variations: JSON.stringify([]),
        placeholders: JSON.stringify([]),
        isPublished: true,
        author: 'Demo User',
    },
];

export const DEMO_CITATIONS = [
    {
        id: 'demo-citation-1',
        title: 'Robinson v. Harveston Freight Co.',
        citation: '312 Ga. App. 118 (2019)',
        type: 'case',
        court: 'Georgia Court of Appeals',
        year: 2019,
        volume: '312',
        reporter: 'Ga. App.',
        page: '118',
        jurisdiction: 'Georgia',
        category: 'Tort Law',
        tags: JSON.stringify(['premises liability', 'slip and fall']),
        usageCount: 11,
        isVerified: true,
        createdBy: DEMO_USER.email,
    },
    {
        id: 'demo-citation-2',
        title: 'O.C.G.A. § 51-3-1',
        citation: 'O.C.G.A. § 51-3-1',
        type: 'statute',
        jurisdiction: 'Georgia',
        codeTitle: 'O.C.G.A.',
        section: '51-3-1',
        category: 'Premises Liability',
        tags: JSON.stringify(['duty of care', 'invitee']),
        usageCount: 8,
        isVerified: true,
        createdBy: DEMO_USER.email,
    },
    {
        id: 'demo-citation-3',
        title: 'Brown v. Board of Education',
        citation: '347 U.S. 483 (1954)',
        type: 'case',
        court: 'Supreme Court of the United States',
        year: 1954,
        volume: '347',
        reporter: 'U.S.',
        page: '483',
        jurisdiction: 'Federal',
        category: 'Constitutional Law',
        tags: JSON.stringify(['landmark']),
        usageCount: 3,
        isVerified: true,
        createdBy: DEMO_USER.email,
    },
    {
        id: 'demo-citation-4',
        title: 'Restatement (Second) of Contracts § 90',
        citation: 'Restatement (Second) of Contracts § 90',
        type: 'secondary',
        category: 'Contract Law',
        tags: JSON.stringify(['promissory estoppel']),
        usageCount: 6,
        isVerified: false,
        createdBy: DEMO_USER.email,
    },
    {
        id: 'demo-citation-5',
        title: 'Hadley v. Baxendale',
        citation: '9 Ex. 341 (1854)',
        type: 'case',
        court: 'Court of Exchequer',
        year: 1854,
        jurisdiction: 'Federal',
        category: 'Contract Law',
        tags: JSON.stringify(['damages', 'foreseeability']),
        usageCount: 5,
        isVerified: true,
        createdBy: DEMO_USER.email,
    },
    {
        id: 'demo-citation-6',
        title: '29 C.F.R. § 1910.22',
        citation: '29 C.F.R. § 1910.22',
        type: 'regulation',
        jurisdiction: 'Federal',
        category: 'Employment Law',
        tags: JSON.stringify(['OSHA', 'workplace safety']),
        usageCount: 4,
        isVerified: true,
        createdBy: DEMO_USER.email,
    },
];

/**
 * Canned AI response for the argument-generation seam.
 * Clearly labeled as demo content — P2.3 replaces this with a proxy call
 * to the real generate-argument Lambda.
 */
export const DEMO_ARGUMENT_OUTLINE = {
    id: 'demo-outline-1',
    title: '[DEMO MODE] Sample Argument Outline — Whitfield v. Meridian Logistics LLC',
    description: 'This is a canned demo response, not a live AI generation.',
    documentType: 'Demand Letter',
    jurisdiction: 'Georgia',
    category: 'Personal Injury',
    introduction: '[DEMO MODE] This outline illustrates the shape of a generated argument. In the live app, this section is produced by the generate-argument Lambda.',
    arguments: [
        {
            id: 'demo-arg-1',
            type: 'factual',
            title: 'Breach of Duty of Care',
            thesis: 'Meridian Logistics LLC failed to warn invitees of a known hazardous condition on its premises.',
            supportingPoints: [
                {
                    id: 'demo-point-1',
                    text: 'The loading dock floor was mopped without warning signage.',
                    type: 'fact',
                    strength: 'strong',
                    citations: ['O.C.G.A. § 51-3-1'],
                },
                {
                    id: 'demo-point-2',
                    text: 'Georgia premises-liability law imposes a duty of ordinary care toward invitees.',
                    type: 'law',
                    strength: 'strong',
                    citations: ['Robinson v. Harveston Freight Co.'],
                },
            ],
            counterArguments: [
                {
                    id: 'demo-counter-1',
                    text: 'The hazard was open and obvious.',
                    strength: 'moderate',
                    rebuttal: 'No signage or barrier made the wet floor apparent to a reasonable invitee.',
                    rebuttalStrength: 'strong',
                },
            ],
            conclusion: '[DEMO MODE] Sample conclusion paragraph would appear here.',
            strength: 'strong',
            confidenceScore: 0.82,
            citations: ['O.C.G.A. § 51-3-1', 'Robinson v. Harveston Freight Co.'],
            order: 0,
        },
    ],
    conclusion: '[DEMO MODE] This is placeholder conclusion text generated for demo purposes only.',
    createdAt: '2026-07-20T09:00:00.000Z',
    updatedAt: '2026-07-20T09:00:00.000Z',
    createdBy: DEMO_USER.email,
    overallStrength: 'moderate',
    coherenceScore: 0.75,
    completenessScore: 0.6,
    suggestions: ['[DEMO MODE] Add a damages section.', '[DEMO MODE] Address comparative negligence.'],
};

export const DEMO_COUNTER_ARGUMENTS = [
    {
        id: 'demo-counter-arg-1',
        text: '[DEMO MODE] Opposing counsel may argue the condition was open and obvious.',
        strength: 'moderate',
        rebuttal: 'No warning signage was posted despite recent mopping.',
        rebuttalStrength: 'strong',
    },
];

export const DEMO_COHERENCE_ANALYSIS = {
    overallScore: 0.75,
    logicalFlow: 0.8,
    factConsistency: 0.8,
    citationSupport: 0.7,
    counterArgumentCoverage: 0.6,
    conclusionAlignment: 0.75,
    issues: [
        {
            type: 'missing_counter',
            severity: 'low',
            location: 'Argument 1',
            description: '[DEMO MODE] Sample coherence issue for illustration purposes.',
            suggestion: 'Add a rebuttal for comparative negligence.',
        },
    ],
    suggestions: ['[DEMO MODE] This is a canned coherence analysis, not a live AI result.'],
};

export const DEMO_AUDIT_LOGS = [
    {
        id: 'demo-audit-1',
        timestamp: '2026-07-20T09:30:00.000Z',
        userId: DEMO_USER.userId,
        userEmail: DEMO_USER.email,
        eventType: 'DOCUMENT_UPDATE',
        action: 'update',
        resourceType: 'draft',
        resourceId: DEMO_DOCUMENT_ID,
        metadata: JSON.stringify({ title: DEMO_DOCUMENT.title }),
        previousHash: 'GENESIS',
        hash: 'demo-hash-1',
    },
    {
        id: 'demo-audit-2',
        timestamp: '2026-07-15T11:05:00.000Z',
        userId: DEMO_USER.userId,
        userEmail: DEMO_USER.email,
        eventType: 'AI_SUGGESTION_GENERATED',
        action: 'generate',
        resourceType: 'draft',
        resourceId: DEMO_DOCUMENT_ID,
        metadata: JSON.stringify({ count: 3 }),
        previousHash: 'demo-hash-1',
        hash: 'demo-hash-2',
    },
    {
        id: 'demo-audit-3',
        timestamp: '2026-07-05T16:20:00.000Z',
        userId: DEMO_USER.userId,
        userEmail: DEMO_USER.email,
        eventType: 'DOCUMENT_CREATE',
        action: 'create',
        resourceType: 'draft',
        resourceId: DEMO_DOCUMENT_ID,
        metadata: JSON.stringify({ title: DEMO_DOCUMENT.title }),
        previousHash: 'GENESIS',
        hash: 'demo-hash-0',
    },
    {
        id: 'demo-audit-4',
        timestamp: '2026-06-01T14:00:00.000Z',
        userId: DEMO_USER.userId,
        userEmail: DEMO_USER.email,
        eventType: 'AUTH_LOGIN',
        action: 'login',
        previousHash: 'GENESIS',
        hash: 'demo-hash-login',
    },
    {
        id: 'demo-audit-5',
        timestamp: '2026-05-28T08:45:00.000Z',
        userId: DEMO_USER.userId,
        userEmail: DEMO_USER.email,
        eventType: 'DOCUMENT_EXPORT',
        action: 'export',
        resourceType: 'draft',
        resourceId: DEMO_DOCUMENT_ID,
        metadata: JSON.stringify({ format: 'docx' }),
        previousHash: 'GENESIS',
        hash: 'demo-hash-export',
    },
];
