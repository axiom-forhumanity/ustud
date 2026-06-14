"""SQLite database for progress tracking and metadata."""

import aiosqlite
from pathlib import Path

from .config import DB_PATH


async def init_db(db_path: Path = DB_PATH) -> None:
    """Create tables if they don't exist."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS progress (
                user_id TEXT NOT NULL,
                module_id TEXT NOT NULL,
                lesson_id TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                score REAL,
                completed_at TEXT,
                PRIMARY KEY (user_id, module_id, lesson_id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS translation_cache (
                source_text_hash TEXT NOT NULL,
                target_lang TEXT NOT NULL,
                translated_text TEXT NOT NULL,
                PRIMARY KEY (source_text_hash, target_lang)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS rag_cache (
                query_hash TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                result TEXT NOT NULL,
                PRIMARY KEY (query_hash, content_hash)
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_progress_module ON progress(module_id)")
        await db.commit()


async def get_progress(db_path: Path, user_id: str, module_id: str) -> dict:
    """Get completion status for all lessons in a module."""
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT lesson_id, completed, score, completed_at FROM progress WHERE user_id = ? AND module_id = ?",
            (user_id, module_id),
        ) as cursor:
            rows = await cursor.fetchall()
    return {row["lesson_id"]: dict(row) for row in rows}


async def mark_lesson_complete(
    db_path: Path,
    user_id: str,
    module_id: str,
    lesson_id: str,
    score: float | None = None,
) -> None:
    """Mark a lesson as completed."""
    from datetime import datetime

    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            """
            INSERT INTO progress (user_id, module_id, lesson_id, completed, score, completed_at)
            VALUES (?, ?, ?, 1, ?, ?)
            ON CONFLICT(user_id, module_id, lesson_id) DO UPDATE SET
                completed = 1,
                score = excluded.score,
                completed_at = excluded.completed_at
            """,
            (user_id, module_id, lesson_id, score, datetime.utcnow().isoformat()),
        )
        await db.commit()


async def is_lesson_unlocked(
    db_path: Path,
    user_id: str,
    module_id: str,
    prerequisites: list[str],
) -> bool:
    """Check if all prerequisite lessons are completed."""
    if not prerequisites:
        return True
    async with aiosqlite.connect(db_path) as db:
        placeholders = ",".join("?" * len(prerequisites))
        async with db.execute(
            f"SELECT COUNT(*) FROM progress WHERE user_id = ? AND module_id = ? AND lesson_id IN ({placeholders}) AND completed = 1",
            (user_id, module_id, *prerequisites),
        ) as cursor:
            row = await cursor.fetchone()
    return row[0] == len(prerequisites)


async def get_cached_translation(db_path: Path, source_hash: str, target_lang: str) -> str | None:
    """Get cached translation if exists."""
    async with aiosqlite.connect(db_path) as db:
        async with db.execute(
            "SELECT translated_text FROM translation_cache WHERE source_text_hash = ? AND target_lang = ?",
            (source_hash, target_lang),
        ) as cursor:
            row = await cursor.fetchone()
    return row[0] if row else None


async def cache_translation(
    db_path: Path,
    source_hash: str,
    target_lang: str,
    translated_text: str,
) -> None:
    """Cache a translation."""
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            "INSERT OR REPLACE INTO translation_cache (source_text_hash, target_lang, translated_text) VALUES (?, ?, ?)",
            (source_hash, target_lang, translated_text),
        )
        await db.commit()
