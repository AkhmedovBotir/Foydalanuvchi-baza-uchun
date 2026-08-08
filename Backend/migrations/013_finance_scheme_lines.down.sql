ALTER TABLE finance_schemes DROP COLUMN IF EXISTS lines;

ALTER TABLE finance_allocations DROP CONSTRAINT IF EXISTS finance_allocations_category_check;
ALTER TABLE finance_allocations ADD CONSTRAINT finance_allocations_category_check CHECK (
    category IN (
        'worker', 'ads', 'doctor', 'owner_sales', 'owner_deposit', 'referral', 'residual'
    )
);
