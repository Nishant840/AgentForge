# This file makes the models directory a Python package
# We will import all models here later so Alembic can discover them for migrations
# Import all models here so Alembic can discover them automatically during migrations
from apps.api.models.repository import Repository, RepositoryStatus
