"""SQLite 连接。数据库文件由用户按 docs/schema.sql 手工建好，启动时不建表。"""

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

# backend/app.db（本文件在 backend/db/ 下，上溯一级到 backend 根目录）
DB_PATH = Path(__file__).resolve().parent.parent / "app.db"

# 与 conventions.md 一致：本地时间 YYYY-MM-DD HH:MM:SS
TIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def now_local() -> str:
    return datetime.now().strftime(TIME_FORMAT)


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
