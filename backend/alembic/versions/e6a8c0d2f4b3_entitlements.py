"""paid plan: entitlements and purchase events

Revision ID: e6a8c0d2f4b3
Revises: c2e4a6b8d0f1

Both tables are written only by this server after it has asked the payment service; nothing the app
sends reaches them. Row level security on and no privileges for Supabase's API roles, as elsewhere.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e6a8c0d2f4b3'
down_revision: Union[str, None] = 'c2e4a6b8d0f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'entitlements',
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('plan', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('product_id', sa.String(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('user_id'),
    )
    op.create_table(
        'purchase_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_purchase_events_user_id', 'purchase_events', ['user_id'])
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in ("entitlements", "purchase_events"):
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
    op.execute("""
        DO $$
        DECLARE r text;
        BEGIN
            FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
                    EXECUTE format('REVOKE ALL ON public.entitlements, public.purchase_events FROM %I', r);
                END IF;
            END LOOP;
        END $$;
    """)


def downgrade() -> None:
    op.drop_index('ix_purchase_events_user_id', table_name='purchase_events')
    op.drop_table('purchase_events')
    op.drop_table('entitlements')
