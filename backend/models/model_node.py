"""model_node 表的数据访问。整树加载 / 全量替换。"""

import json

from db.connection import get_connection, now_local


def row_to_node(row) -> dict:
    return {
        "id": row["id"],
        "parentId": row["parent_id"],
        "nodeType": row["node_type"],
        "name": row["name"],
        "sortOrder": row["sort_order"],
        "transform": json.loads(row["transform"]),
        "shape": row["shape"],
        "dims": json.loads(row["dims"]) if row["dims"] else None,
        "templateId": row["template_id"],
        "paramValues": json.loads(row["param_values"]) if row["param_values"] else None,
        "color": row["color"],
    }


def list_nodes(project_id: str) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, parent_id, node_type, name, sort_order, transform, "
            "shape, dims, template_id, param_values, color "
            "FROM model_node WHERE project_id = ? ORDER BY sort_order ASC",
            (project_id,),
        ).fetchall()
    return [row_to_node(row) for row in rows]


def replace_nodes(project_id: str, nodes: list[dict]) -> bool:
    """
    事务内先删后插，整树替换。项目不存在返回 False。
    调用方应已校验 nodes 结构。成功时同步更新 project.updated_at。
    """
    stamp = now_local()
    with get_connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM project WHERE id = ?", (project_id,)
        ).fetchone()
        if exists is None:
            return False
        conn.execute("DELETE FROM model_node WHERE project_id = ?", (project_id,))
        for node in nodes:
            dims = node.get("dims")
            param_values = node.get("paramValues")
            conn.execute(
                "INSERT INTO model_node ("
                "id, project_id, parent_id, node_type, name, sort_order, "
                "transform, shape, dims, template_id, param_values, color"
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    node["id"],
                    project_id,
                    node.get("parentId"),
                    node["nodeType"],
                    node["name"],
                    node["sortOrder"],
                    json.dumps(node["transform"], ensure_ascii=False),
                    node.get("shape"),
                    json.dumps(dims, ensure_ascii=False) if dims is not None else None,
                    node.get("templateId"),
                    json.dumps(param_values, ensure_ascii=False)
                    if param_values is not None
                    else None,
                    node.get("color"),
                ),
            )
        conn.execute(
            "UPDATE project SET updated_at = ? WHERE id = ?",
            (stamp, project_id),
        )
    return True
