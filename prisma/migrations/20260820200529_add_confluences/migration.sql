-- CreateTable
CREATE TABLE "Confluence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Confluence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeConfluence" (
    "tradeId" TEXT NOT NULL,
    "confluenceId" TEXT NOT NULL,

    CONSTRAINT "TradeConfluence_pkey" PRIMARY KEY ("tradeId","confluenceId")
);

-- CreateIndex
CREATE INDEX "Confluence_userId_idx" ON "Confluence"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Confluence_userId_name_key" ON "Confluence"("userId", "name");

-- CreateIndex
CREATE INDEX "TradeConfluence_confluenceId_idx" ON "TradeConfluence"("confluenceId");

-- AddForeignKey
ALTER TABLE "Confluence" ADD CONSTRAINT "Confluence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeConfluence" ADD CONSTRAINT "TradeConfluence_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeConfluence" ADD CONSTRAINT "TradeConfluence_confluenceId_fkey" FOREIGN KEY ("confluenceId") REFERENCES "Confluence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
