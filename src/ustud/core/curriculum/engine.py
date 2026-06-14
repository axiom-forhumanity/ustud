"""Curriculum engine - YAML-driven progression, prerequisites, unlock logic."""

from pathlib import Path
from typing import Any

import yaml


def load_yaml(path: Path) -> dict:
    """Load YAML file."""
    if not path.exists():
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


class CurriculumEngine:
    """Manages curriculum structure: units, lessons, prerequisites, difficulty."""

    def __init__(self, curriculum_path: Path):
        self.path = curriculum_path
        self.data = load_yaml(curriculum_path)

    @property
    def units(self) -> list[dict]:
        """Get all units."""
        return self.data.get("units", [])

    def get_lesson(self, unit_id: str, lesson_id: str) -> dict | None:
        """Get a specific lesson by unit and lesson id."""
        for unit in self.units:
            if unit.get("id") == unit_id:
                for lesson in unit.get("lessons", []):
                    if lesson.get("id") == lesson_id:
                        return lesson
        return None

    def get_all_lessons_flat(self) -> list[tuple[str, dict]]:
        """Get all lessons as (unit_id, lesson) pairs in order."""
        result = []
        for unit in self.units:
            uid = unit.get("id", "")
            for lesson in unit.get("lessons", []):
                result.append((uid, lesson))
        return result

    def get_prerequisites(self, unit_id: str, lesson_id: str) -> list[str]:
        """Get prerequisite lesson ids for a lesson."""
        lesson = self.get_lesson(unit_id, lesson_id)
        if not lesson:
            return []
        prereqs = lesson.get("prerequisites", [])
        if isinstance(prereqs, list):
            return prereqs
        return []

    def get_lesson_order(self, unit_id: str) -> list[str]:
        """Get ordered lesson ids within a unit (for sequential unlock)."""
        for unit in self.units:
            if unit.get("id") == unit_id:
                lessons = unit.get("lessons", [])
                return [l.get("id") for l in lessons if l.get("id")]
        return []

    def is_unlocked(
        self,
        unit_id: str,
        lesson_id: str,
        completed_lessons: set[str],
    ) -> bool:
        """
        Check if a lesson is unlocked based on completed prerequisites.
        Also requires previous lesson in same unit to be done (sequential).
        """
        prereqs = self.get_prerequisites(unit_id, lesson_id)
        if not all(pl in completed_lessons for pl in prereqs):
            return False

        # Sequential within unit
        order = self.get_lesson_order(unit_id)
        idx = next((i for i, lid in enumerate(order) if lid == lesson_id), -1)
        if idx <= 0:
            return True  # First lesson or not found
        prev_lesson = order[idx - 1]
        return prev_lesson in completed_lessons
