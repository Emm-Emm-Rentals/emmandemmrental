ALTER TABLE "Listing"
ADD COLUMN "dynamicPricingRules" JSONB[] DEFAULT ARRAY[]::JSONB[];
