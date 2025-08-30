"""
VBS Server - AI-powered video frame search and retrieval system.

This package provides a modern, scalable backend service for video search
operations including semantic text search, object detection search, and
OCR-based text search.
"""

__version__ = "2.0.0"
__author__ = "VBS Team"
__email__ = "team@vbs.ai"

from .main import create_app

__all__ = ["create_app"]