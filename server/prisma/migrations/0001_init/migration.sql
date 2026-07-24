-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "metadata" JSONB,
    "intakeData" JSONB,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT,
    "skeletonContent" TEXT,
    "defaultMetadata" JSONB,
    "placeholders" JSONB,
    "sections" JSONB,
    "variables" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "parentTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clause" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "tags" JSONB,
    "jurisdiction" TEXT,
    "documentTypes" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "variations" JSONB,
    "author" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "placeholders" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserClauseFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clauseId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserClauseFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "court" TEXT,
    "year" INTEGER,
    "volume" TEXT,
    "reporter" TEXT,
    "page" TEXT,
    "pinpoint" TEXT,
    "jurisdiction" TEXT,
    "codeTitle" TEXT,
    "section" TEXT,
    "subdivision" TEXT,
    "shortForm" TEXT,
    "parenthetical" TEXT,
    "url" TEXT,
    "category" TEXT,
    "tags" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "notes" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCitationFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "citationId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCitationFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT,
    "eventType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "previousHash" TEXT,
    "hash" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCollaborator" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentOwnerId" TEXT NOT NULL,
    "collaboratorUserId" TEXT,
    "collaboratorEmail" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "invitedByName" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),

    CONSTRAINT "DocumentCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentOwnerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "passcode" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "lastAccessedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Draft_userId_idx" ON "Draft"("userId");

-- CreateIndex
CREATE INDEX "Template_category_idx" ON "Template"("category");

-- CreateIndex
CREATE INDEX "Clause_category_idx" ON "Clause"("category");

-- CreateIndex
CREATE INDEX "Clause_jurisdiction_category_idx" ON "Clause"("jurisdiction", "category");

-- CreateIndex
CREATE INDEX "UserClauseFavorite_userId_idx" ON "UserClauseFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserClauseFavorite_userId_clauseId_key" ON "UserClauseFavorite"("userId", "clauseId");

-- CreateIndex
CREATE INDEX "Citation_type_idx" ON "Citation"("type");

-- CreateIndex
CREATE INDEX "Citation_jurisdiction_idx" ON "Citation"("jurisdiction");

-- CreateIndex
CREATE INDEX "Citation_category_idx" ON "Citation"("category");

-- CreateIndex
CREATE INDEX "UserCitationFavorite_userId_idx" ON "UserCitationFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCitationFavorite_userId_citationId_key" ON "UserCitationFavorite"("userId", "citationId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_eventType_timestamp_idx" ON "AuditLog"("eventType", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_resourceId_timestamp_idx" ON "AuditLog"("resourceId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCollaborator_inviteToken_key" ON "DocumentCollaborator"("inviteToken");

-- CreateIndex
CREATE INDEX "DocumentCollaborator_documentId_idx" ON "DocumentCollaborator"("documentId");

-- CreateIndex
CREATE INDEX "DocumentCollaborator_collaboratorUserId_idx" ON "DocumentCollaborator"("collaboratorUserId");

-- CreateIndex
CREATE INDEX "DocumentCollaborator_collaboratorEmail_idx" ON "DocumentCollaborator"("collaboratorEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "ShareLink_documentId_idx" ON "ShareLink"("documentId");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClauseFavorite" ADD CONSTRAINT "UserClauseFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClauseFavorite" ADD CONSTRAINT "UserClauseFavorite_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "Clause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCitationFavorite" ADD CONSTRAINT "UserCitationFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCitationFavorite" ADD CONSTRAINT "UserCitationFavorite_citationId_fkey" FOREIGN KEY ("citationId") REFERENCES "Citation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCollaborator" ADD CONSTRAINT "DocumentCollaborator_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Draft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Draft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

