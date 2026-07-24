// Seed script for local/dev Postgres, porting the demo fixtures from
// src/demo/fixtures.ts (Whitfield draft, clause library, citations, audit
// trail). Import-safe: only executes when run directly (`node prisma/seed.js`
// or `prisma db seed`), never as a side effect of importing this module.
//
// No live DB is available in this environment — this script is written and
// reviewed but intentionally NOT run here.

import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const DEMO_USER_EMAIL = 'demo@lexforge.app';
const DEMO_PASSWORD = 'demo1234';

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

const DEMO_CLAUSES = [
  {
    title: 'Standard Indemnification (Mutual)',
    content:
      '<p>Each party shall indemnify, defend, and hold harmless the other party from and against any third-party claims arising out of its own negligence or willful misconduct.</p>',
    description: 'Mutual indemnification for third-party claims.',
    category: 'Indemnification',
    subcategory: 'Mutual',
    tags: ['indemnification', 'liability'],
    jurisdiction: 'Federal',
    documentTypes: ['Contract', 'Agreement', 'Demand Letter'],
    usageCount: 42,
    lastUsedAt: new Date('2026-07-10T00:00:00.000Z'),
    variations: [],
    placeholders: [],
    isPublished: true,
    author: 'Demo User',
  },
  {
    title: 'Mutual Confidentiality',
    content:
      '<p>Each party agrees to keep confidential all non-public information disclosed by the other party and to use it solely for purposes of this Agreement.</p>',
    description: 'Standard two-way confidentiality obligation.',
    category: 'Confidentiality',
    subcategory: 'Mutual',
    tags: ['NDA', 'confidentiality'],
    jurisdiction: 'Federal',
    documentTypes: ['NDA', 'Agreement', 'Demand Letter'],
    usageCount: 37,
    lastUsedAt: new Date('2026-07-08T00:00:00.000Z'),
    variations: [],
    placeholders: [],
    isPublished: true,
    author: 'Demo User',
  },
  {
    title: 'Termination for Convenience',
    content:
      '<p>Either party may terminate this Agreement for any reason upon thirty (30) days’ written notice to the other party.</p>',
    description: 'Allows either party to walk away with notice.',
    category: 'Termination',
    tags: ['termination'],
    jurisdiction: 'Federal',
    documentTypes: ['Contract', 'Service Agreement', 'Demand Letter'],
    usageCount: 21,
    variations: [],
    placeholders: [],
    isPublished: true,
    author: 'Demo User',
  },
  {
    title: 'Limitation of Liability (Cap at Fees Paid)',
    content:
      '<p>In no event shall either party’s aggregate liability exceed the total fees paid under this Agreement in the twelve (12) months preceding the claim.</p>',
    description: 'Caps liability at fees paid.',
    category: 'Limitation of Liability',
    tags: ['liability', 'cap'],
    jurisdiction: 'Federal',
    documentTypes: ['Contract', 'Service Agreement', 'Demand Letter'],
    usageCount: 30,
    variations: [],
    placeholders: [],
    isPublished: true,
    author: 'Demo User',
  },
  {
    title: 'Work Made for Hire / IP Assignment',
    content:
      '<p>All deliverables shall be deemed “works made for hire.” To the extent any deliverable does not qualify, the creating party hereby assigns all right, title, and interest to the receiving party.</p>',
    description: 'Assigns IP ownership of deliverables.',
    category: 'Intellectual Property',
    tags: ['IP', 'assignment'],
    jurisdiction: 'Federal',
    documentTypes: ['Service Agreement', 'License Agreement', 'Demand Letter'],
    usageCount: 18,
    variations: [],
    placeholders: [],
    isPublished: true,
    author: 'Demo User',
  },
  {
    title: 'Binding Arbitration',
    content:
      '<p>Any dispute arising out of or relating to this Agreement shall be resolved by binding arbitration administered by the American Arbitration Association.</p>',
    description: 'Routes disputes to arbitration instead of court.',
    category: 'Dispute Resolution',
    tags: ['arbitration', 'dispute'],
    jurisdiction: 'Federal',
    documentTypes: ['Contract', 'Agreement', 'Demand Letter'],
    usageCount: 15,
    variations: [
      {
        jurisdiction: 'California',
        content:
          '<p>Any dispute shall be resolved by binding arbitration in accordance with California Code of Civil Procedure § 1280 et seq.</p>',
      },
    ],
    placeholders: [],
    isPublished: true,
    author: 'Demo User',
  },
  {
    title: 'Force Majeure',
    content:
      '<p>Neither party shall be liable for delay or failure to perform resulting from causes beyond its reasonable control, including acts of God, natural disaster, or governmental action.</p>',
    description: 'Excuses performance during extraordinary events.',
    category: 'Force Majeure',
    tags: ['force majeure'],
    jurisdiction: 'Federal',
    documentTypes: ['Contract', 'Agreement', 'Lease', 'Demand Letter'],
    usageCount: 12,
    variations: [],
    placeholders: [],
    isPublished: true,
    author: 'Demo User',
  },
  {
    title: 'Governing Law (California)',
    content:
      '<p>This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of laws principles.</p>',
    description: 'Sets California as the governing jurisdiction.',
    category: 'Governing Law',
    jurisdiction: 'California',
    tags: ['governing law'],
    documentTypes: ['Contract', 'Agreement', 'Demand Letter'],
    usageCount: 25,
    variations: [],
    placeholders: [],
    isPublished: true,
    author: 'Demo User',
  },
  {
    title: 'Non-Solicitation of Employees',
    content:
      '<p>During the term of this Agreement and for twelve (12) months thereafter, neither party shall solicit for employment any employee of the other party.</p>',
    description: 'Prevents poaching employees post-engagement.',
    category: 'Non-Solicitation',
    tags: ['non-solicitation', 'employment'],
    jurisdiction: 'Federal',
    documentTypes: ['Service Agreement', 'Partnership Agreement', 'Demand Letter'],
    usageCount: 9,
    variations: [],
    placeholders: [],
    isPublished: true,
    author: 'Demo User',
  },
  {
    title: 'Notices',
    content:
      '<p>All notices under this Agreement shall be in writing and delivered by email with confirmation of receipt, or by certified mail to the addresses set forth above.</p>',
    description: 'Standard formal notice mechanism.',
    category: 'Notices',
    tags: ['notices'],
    jurisdiction: 'Federal',
    documentTypes: ['Contract', 'Agreement', 'Lease', 'Demand Letter'],
    usageCount: 14,
    variations: [],
    placeholders: [],
    isPublished: true,
    author: 'Demo User',
  },
];

function citations(demoUserEmail) {
  return [
    {
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
      tags: ['premises liability', 'slip and fall'],
      usageCount: 11,
      isVerified: true,
      createdBy: demoUserEmail,
    },
    {
      title: 'O.C.G.A. § 51-3-1',
      citation: 'O.C.G.A. § 51-3-1',
      type: 'statute',
      jurisdiction: 'Georgia',
      codeTitle: 'O.C.G.A.',
      section: '51-3-1',
      category: 'Premises Liability',
      tags: ['duty of care', 'invitee'],
      usageCount: 8,
      isVerified: true,
      createdBy: demoUserEmail,
    },
    {
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
      tags: ['landmark'],
      usageCount: 3,
      isVerified: true,
      createdBy: demoUserEmail,
    },
    {
      title: 'Restatement (Second) of Contracts § 90',
      citation: 'Restatement (Second) of Contracts § 90',
      type: 'secondary',
      category: 'Contract Law',
      tags: ['promissory estoppel'],
      usageCount: 6,
      isVerified: false,
      createdBy: demoUserEmail,
    },
    {
      title: 'Hadley v. Baxendale',
      citation: '9 Ex. 341 (1854)',
      type: 'case',
      court: 'Court of Exchequer',
      year: 1854,
      jurisdiction: 'Federal',
      category: 'Contract Law',
      tags: ['damages', 'foreseeability'],
      usageCount: 5,
      isVerified: true,
      createdBy: demoUserEmail,
    },
    {
      title: '29 C.F.R. § 1910.22',
      citation: '29 C.F.R. § 1910.22',
      type: 'regulation',
      jurisdiction: 'Federal',
      category: 'Employment Law',
      tags: ['OSHA', 'workplace safety'],
      usageCount: 4,
      isVerified: true,
      createdBy: demoUserEmail,
    },
  ];
}

function auditLogs(demoUserId, demoUserEmail, documentId, documentTitle) {
  return [
    {
      timestamp: new Date('2026-06-01T14:00:00.000Z'),
      userId: demoUserId,
      userEmail: demoUserEmail,
      eventType: 'AUTH_LOGIN',
      action: 'login',
      previousHash: 'GENESIS',
      hash: 'demo-hash-login',
    },
    {
      timestamp: new Date('2026-06-01T14:00:00.000Z'),
      userId: demoUserId,
      userEmail: demoUserEmail,
      eventType: 'DOCUMENT_CREATE',
      action: 'create',
      resourceType: 'draft',
      resourceId: documentId,
      metadata: { title: documentTitle },
      previousHash: 'GENESIS',
      hash: 'demo-hash-0',
    },
    {
      timestamp: new Date('2026-07-05T16:20:00.000Z'),
      userId: demoUserId,
      userEmail: demoUserEmail,
      eventType: 'AI_SUGGESTION_GENERATED',
      action: 'generate',
      resourceType: 'draft',
      resourceId: documentId,
      metadata: { count: 3 },
      previousHash: 'demo-hash-0',
      hash: 'demo-hash-2',
    },
    {
      timestamp: new Date('2026-07-20T09:30:00.000Z'),
      userId: demoUserId,
      userEmail: demoUserEmail,
      eventType: 'DOCUMENT_UPDATE',
      action: 'update',
      resourceType: 'draft',
      resourceId: documentId,
      metadata: { title: documentTitle },
      previousHash: 'demo-hash-2',
      hash: 'demo-hash-1',
    },
    {
      timestamp: new Date('2026-05-28T08:45:00.000Z'),
      userId: demoUserId,
      userEmail: demoUserEmail,
      eventType: 'DOCUMENT_EXPORT',
      action: 'export',
      resourceType: 'draft',
      resourceId: documentId,
      metadata: { format: 'docx' },
      previousHash: 'GENESIS',
      hash: 'demo-hash-export',
    },
  ];
}

export async function seed(prisma) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: { role: 'user' },
    create: {
      email: DEMO_USER_EMAIL,
      passwordHash,
      name: 'Demo User',
      role: 'user',
    },
  });

  const draft = await prisma.draft.create({
    data: {
      userId: user.id,
      title: 'Whitfield v. Meridian Logistics LLC — Demand Letter',
      content: DEMO_DOCUMENT_CONTENT,
      status: 'draft',
      metadata: {
        jurisdiction: 'Georgia',
        practiceArea: 'Personal Injury',
        docType: 'Demand Letter',
        opponentName: 'Meridian Logistics LLC',
      },
      intakeData: {
        clientGoal: 'Obtain a fair settlement covering medical costs and lost wages without litigation.',
        keyFacts: [
          'Unmarked wet floor near loading dock',
          'No warning signage posted',
          'Fractured wrist and lumbar strain',
        ],
      },
    },
  });

  for (const clause of DEMO_CLAUSES) {
    await prisma.clause.create({ data: clause });
  }

  for (const citation of citations(DEMO_USER_EMAIL)) {
    await prisma.citation.create({ data: citation });
  }

  for (const entry of auditLogs(user.id, DEMO_USER_EMAIL, draft.id, draft.title)) {
    await prisma.auditLog.create({ data: entry });
  }

  return { user, draft };
}

// Only run when executed directly (`node prisma/seed.js` / `prisma db seed`),
// never as a side effect of importing this module.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient();
  seed(prisma)
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

export { DEMO_USER_EMAIL };
