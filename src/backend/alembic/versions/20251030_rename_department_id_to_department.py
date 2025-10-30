"""
Rename department_id to department and change type to String

Revision ID: auto_generated_department_string
Revises: a6f5fcf96e09
Create Date: 2025-10-30
"""
revision = 'auto_generated_department_string'
down_revision = 'a6f5fcf96e09'
from alembic import op
import sqlalchemy as sa

def upgrade():
    # No-op: department column already exists, department_id already removed
    pass

def downgrade():
    # Revert column name and type
    op.alter_column('admins', 'department', new_column_name='department_id', type_=sa.INTEGER(), existing_type=sa.String(length=100), nullable=True)
