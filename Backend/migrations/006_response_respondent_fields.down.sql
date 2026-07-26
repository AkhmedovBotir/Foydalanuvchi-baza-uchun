ALTER TABLE survey_responses
    DROP COLUMN IF EXISTS respondent_name,
    DROP COLUMN IF EXISTS respondent_phone;
