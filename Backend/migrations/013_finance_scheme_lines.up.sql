-- Dinamik moliya taqsimoti: daraxt qatorlari (JSON)

ALTER TABLE finance_schemes
    ADD COLUMN IF NOT EXISTS lines JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Avvalgi sxemalarni lines ga ko‘chirish
UPDATE finance_schemes
SET lines = jsonb_build_array(
    jsonb_build_object(
        'id', 'legacy-worker',
        'label', 'Ishchi',
        'pct', worker_pct,
        'role', 'worker',
        'children', '[]'::jsonb
    ),
    jsonb_build_object(
        'id', 'legacy-ads',
        'label', 'Reklama',
        'pct', ads_pct,
        'role', 'ads',
        'children', '[]'::jsonb
    ),
    jsonb_build_object(
        'id', 'legacy-doctor',
        'label', 'Shifokor',
        'pct', doctor_pct,
        'role', 'doctor',
        'children', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', 'legacy-doc-' || d.doctor_id::text,
                    'label', COALESCE(cd.name, 'Shifokor'),
                    'pct', d.pct,
                    'role', 'doctor_share',
                    'doctorId', d.doctor_id::text,
                    'children', '[]'::jsonb
                )
                ORDER BY d.pct DESC
            )
            FROM finance_scheme_doctors d
            LEFT JOIN company_doctors cd ON cd.id = d.doctor_id
            WHERE d.scheme_id = finance_schemes.id
        ), '[]'::jsonb)
    ),
    jsonb_build_object(
        'id', 'legacy-owner',
        'label', 'Biznes egasi',
        'pct', owner_pct,
        'role', 'owner',
        'children', jsonb_build_array(
            jsonb_build_object(
                'id', 'legacy-owner-sales',
                'label', 'Savdo (bank)',
                'pct', owner_sales_pct,
                'role', 'owner_sales',
                'children', '[]'::jsonb
            ),
            jsonb_build_object(
                'id', 'legacy-owner-deposit',
                'label', 'Omonat',
                'pct', owner_deposit_pct,
                'role', 'owner_deposit',
                'children', '[]'::jsonb
            )
        )
    ),
    jsonb_build_object(
        'id', 'legacy-referral',
        'label', 'Referal',
        'pct', referral_pct,
        'role', 'referral',
        'onlyIfReferral', true,
        'children', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', 'legacy-ref-' || r.referral_id::text,
                    'label', COALESCE(cr.name, 'Referal'),
                    'pct', r.pct,
                    'role', 'referral_share',
                    'referralId', r.referral_id::text,
                    'children', '[]'::jsonb
                )
                ORDER BY r.pct DESC
            )
            FROM finance_scheme_referrals r
            LEFT JOIN company_referrals cr ON cr.id = r.referral_id
            WHERE r.scheme_id = finance_schemes.id
        ), '[]'::jsonb)
    )
)
WHERE lines = '[]'::jsonb OR lines IS NULL;

-- custom kategoriya uchun cheklovni kengaytirish
ALTER TABLE finance_allocations DROP CONSTRAINT IF EXISTS finance_allocations_category_check;
ALTER TABLE finance_allocations ADD CONSTRAINT finance_allocations_category_check CHECK (
    category IN (
        'worker', 'ads', 'doctor', 'owner_sales', 'owner_deposit',
        'referral', 'residual', 'custom'
    )
);
