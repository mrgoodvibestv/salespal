-- Add sequence_regeneration to credit_action enum
-- Required for the sequences route which charges 2 credits on regeneration.
-- IF NOT EXISTS prevents errors if migration is applied more than once.
ALTER TYPE credit_action ADD VALUE IF NOT EXISTS 'sequence_regeneration';
