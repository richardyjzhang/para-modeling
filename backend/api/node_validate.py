"""模型树节点请求体校验。通过返回 None，失败返回错误文案。"""

import re

NODE_TYPES = {"group", "primitive", "instance"}

# "#" + 6 位十六进制，大小写均可（与 conventions.md §3.2 一致）
COLOR_RE = re.compile(r"#[0-9a-fA-F]{6}$")


"""
校验 transform 对象
如果 transform 不是对象，则返回 "transform 必须是对象"，否则返回 None
"""
def validate_transform(transform) -> str | None:
    if not isinstance(transform, dict):
        return "transform 必须是对象"
    for key in ("pos", "rot"):
        value = transform.get(key)
        if not isinstance(value, list) or len(value) != 3:
            return f"transform.{key} 必须是长度为 3 的数组"
        for item in value:
            if not isinstance(item, (int, float)) or isinstance(item, bool):
                return f"transform.{key} 必须是数字"
    return None


"""
校验节点对象
如果节点不是对象，则返回 "nodes[index] 必须是对象"，否则返回 None
"""
def validate_node(node, index: int) -> str | None:
    prefix = f"nodes[{index}]"
    if not isinstance(node, dict):
        return f"{prefix} 必须是对象"
    node_id = node.get("id")
    if not isinstance(node_id, str) or not node_id:
        return f"{prefix}.id 不能为空"
    node_type = node.get("nodeType")
    if node_type not in NODE_TYPES:
        return f"{prefix}.nodeType 必须是 group / primitive / instance"
    name = node.get("name")
    if not isinstance(name, str) or not name.strip():
        return f"{prefix}.name 不能为空"
    parent_id = node.get("parentId")
    if parent_id is not None and not isinstance(parent_id, str):
        return f"{prefix}.parentId 必须是字符串或 null"
    sort_order = node.get("sortOrder")
    if not isinstance(sort_order, int) or isinstance(sort_order, bool):
        return f"{prefix}.sortOrder 必须是整数"
    err = validate_transform(node.get("transform"))
    if err:
        return f"{prefix}.{err}"
    color = node.get("color")
    if color is not None and (
        not isinstance(color, str) or not COLOR_RE.fullmatch(color)
    ):
        return f"{prefix}.color 必须是 # 开头的 6 位十六进制颜色（如 #ff8800）或 null"

    # 校验图元节点
    if node_type == "primitive":
        shape = node.get("shape")
        if not isinstance(shape, str) or not shape:
            return f"{prefix}.shape 不能为空"
        dims = node.get("dims")
        if not isinstance(dims, dict) or not dims:
            return f"{prefix}.dims 必须是对象"
        for key, value in dims.items():
            if not isinstance(value, str):
                return f"{prefix}.dims.{key} 必须是表达式字符串"

    # 校验实例节点
    elif node_type == "instance":
        template_id = node.get("templateId")
        if not isinstance(template_id, str) or not template_id:
            return f"{prefix}.templateId 不能为空"
        param_values = node.get("paramValues")
        if not isinstance(param_values, dict):
            return f"{prefix}.paramValues 必须是对象"

    return None


"""
校验节点数组
如果节点数组不是数组，则返回 "nodes 必须是数组"，否则返回 None
"""
def validate_nodes(nodes) -> str | None:
    if not isinstance(nodes, list):
        return "nodes 必须是数组"
    ids: set[str] = set()
    for index, node in enumerate(nodes):
        err = validate_node(node, index)
        if err:
            return err
        node_id = node["id"]
        if node_id in ids:
            return f"nodes[{index}].id 重复：{node_id}"
        ids.add(node_id)
    id_set = {node["id"] for node in nodes}
    for index, node in enumerate(nodes):
        parent_id = node.get("parentId")
        if parent_id is not None and parent_id not in id_set:
            return f"nodes[{index}].parentId 指向不存在的节点"
    return None
