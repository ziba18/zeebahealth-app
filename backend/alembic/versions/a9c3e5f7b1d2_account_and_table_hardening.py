"""account and table hardening

Revision ID: a9c3e5f7b1d2
Revises: f5b2c7d1a9e3

- users.email_verified: lets Apple/Google sign-in tell a confirmed address from one that was only typed
  into the sign-up form (see services/auth.py get_or_create_social_user).
- one account per email whatever its letter case, enforced by the database (and an index the
  case-insensitive sign-in lookup can use, instead of reading every row).
- health_records: an index for "one user's records in created order", and a foreign key so a record
  cannot outlive its account.
- the roles Supabase exposes through its public API lose their table privileges. Row level security
  already blocks them; this is a second lock in case it is ever switched off on a table.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a9c3e5f7b1d2'
down_revision: Union[str, None] = 'f5b2c7d1a9e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables this backend owns. The website's own tables (waitlist, research_responses) are left alone.
_APP_TABLES = (
    "users", "profiles", "health_records", "connected_accounts", "cycle_logs", "symptom_logs",
    "cycle_predictions", "symptom_captures", "health_metrics", "alert_logs", "emergency_contacts",
    "alembic_version",
)


def upgrade() -> None:
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index('ix_health_records_user_created', 'health_records', ['user_id', 'created_at'])
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON public.users (lower(email))")
    op.create_foreign_key(
        'fk_health_records_user_id', 'health_records', 'users', ['user_id'], ['id'], ondelete='CASCADE',
    )
    tables = ", ".join(f"public.{t}" for t in _APP_TABLES)
    op.execute(f"""
        DO $$
        DECLARE r text;
        BEGIN
            FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
                    EXECUTE format('REVOKE ALL ON {tables} FROM %I', r);
                END IF;
            END LOOP;
        END $$;
    """)


def downgrade() -> None:
    # The privileges stay revoked on purpose, as with row level security in d4a8f1c3b9e2.
    if op.get_bind().dialect.name == "postgresql":
        op.drop_constraint('fk_health_records_user_id', 'health_records', type_='foreignkey')
        op.execute("DROP INDEX IF EXISTS public.uq_users_email_lower")
    op.drop_index('ix_health_records_user_created', table_name='health_records')
    op.drop_column('users', 'email_verified')
