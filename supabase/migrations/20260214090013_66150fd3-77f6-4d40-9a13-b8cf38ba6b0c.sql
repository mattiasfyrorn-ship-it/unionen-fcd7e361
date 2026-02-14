
-- daily_checks: support multiple selections for turn_toward
ALTER TABLE daily_checks ADD COLUMN turn_toward_options text[] DEFAULT '{}';

-- weekly_entries: new fields for meeting notes, logistics, intention, checkout
ALTER TABLE weekly_entries ADD COLUMN meeting_notes jsonb DEFAULT '{}';
ALTER TABLE weekly_entries ADD COLUMN logistics jsonb DEFAULT '{}';
ALTER TABLE weekly_entries ADD COLUMN intention text;
ALTER TABLE weekly_entries ADD COLUMN checkout_feeling text;
