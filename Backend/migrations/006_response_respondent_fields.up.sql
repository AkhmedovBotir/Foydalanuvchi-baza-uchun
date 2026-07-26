ALTER TABLE survey_responses
    ADD COLUMN IF NOT EXISTS respondent_name  VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS respondent_phone VARCHAR(30)  NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_survey_responses_phone ON survey_responses (respondent_phone);
