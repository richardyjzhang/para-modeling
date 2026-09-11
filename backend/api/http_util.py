"""API 层通用的请求/响应小工具。"""

from flask import jsonify, request


"""
返回错误响应
"""
def error(message: str, status: int):
    return jsonify({"error": message}), status


"""
读取请求体中的 JSON 数据
如果请求体不是 JSON 对象，则返回 None，否则返回 JSON 对象
"""
def read_json() -> dict | None:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None
    return data


"""
规范化名称
如果名称不是字符串，则返回 None， 否则返回规范化后的名称
"""
def normalize_name(raw) -> str | None:
    if not isinstance(raw, str):
        return None
    name = raw.strip()
    if not name:
        return None
    return name
