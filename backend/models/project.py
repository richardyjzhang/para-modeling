"""project 表的数据访问。返回给 API 的 dict 已转成 camelCase。"""

import uuid

from db.connection import get_connection, now_local


def new_project_id() -> str:
    return f"prj_{uuid.uuid4()}"


def row_to_project(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def list_projects() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, name, created_at, updated_at FROM project "
            "ORDER BY updated_at DESC, created_at DESC"
        ).fetchall()
    return [row_to_project(row) for row in rows]


def get_project(project_id: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, name, created_at, updated_at FROM project WHERE id = ?",
            (project_id,),
        ).fetchone()
    if row is None:
        return None
    return row_to_project(row)


def create_project(name: str) -> dict:
    project_id = new_project_id()
    stamp = now_local()
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO project (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (project_id, name, stamp, stamp),
        )
    return {
        "id": project_id,
        "name": name,
        "createdAt": stamp,
        "updatedAt": stamp,
    }


def rename_project(project_id: str, name: str) -> dict | None:
    stamp = now_local()
    with get_connection() as conn:
        cursor = conn.execute(
            "UPDATE project SET name = ?, updated_at = ? WHERE id = ?",
            (name, stamp, project_id),
        )
        if cursor.rowcount == 0:
            return None
    return get_project(project_id)


def delete_project(project_id: str) -> bool:
    """删除项目及其全部节点。不存在则返回 False。"""
    with get_connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM project WHERE id = ?", (project_id,)
        ).fetchone()
        if exists is None:
            return False
        conn.execute("DELETE FROM model_node WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM project WHERE id = ?", (project_id,))
    return True
