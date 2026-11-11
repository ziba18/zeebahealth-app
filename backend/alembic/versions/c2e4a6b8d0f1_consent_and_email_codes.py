"""health-data consent and email codes

Revision ID: c2e4a6b8d0f1
Revises: a9c3e5f7b1d2

- users.health_consent_at / health_consent_version: the record of explicit consent (UK GDPR Art. 9).
- email_codes: six-digit codes for confirming an address and resetting a password (hash only).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c2e4a6b8d0f1'
down_revision: Union[str, None] = 'a9c3e5f7b1d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('health_consent_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('health_consent_version', sa.String(), nullable=True))
    op.create_table(
        'email_codes',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('purpose', sa.String(), nullable=False),
        sa.Column('code_hash', sa.String(), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_email_codes_user_id', 'email_codes', ['user_id'])
    if op.get_bind().dialect.name != "postgresql":
        return
    # Same two locks as every other table: row level security on, and nothing for Supabase's API roles.
    op.execute("ALTER TABLE public.email_codes ENABLE ROW LEVEL SECURITY")
    op.execute("""
        DO $$
        DECLARE r text;
        BEGIN
            FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
                    EXECUTE format('REVOKE ALL ON public.email_codes FROM %I', r);
                END IF;
            END LOOP;
        END $$;
    """)


def downgrade() -> None:
    op.drop_index('ix_email_codes_user_id', table_name='email_codes')
    op.drop_table('email_codes')
    op.drop_column('users', 'health_consent_version')
    op.drop_column('users', 'health_consent_at')
