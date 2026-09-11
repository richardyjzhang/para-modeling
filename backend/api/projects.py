"""项目与模型树 CRUD。路径见 docs/conventions.md §3.0。"""

from flask import Blueprint, jsonify

from api.http_util import error, normalize_name, read_json
from api.node_validate import validate_nodes
from models import model_node as node_model
from models import project as project_model

projects_bp = Blueprint("projects", __name__)


@projects_bp.get("/api/projects")
def list_projects():
    return jsonify({"projects": project_model.list_projects()})


@projects_bp.post("/api/projects")
def create_project():
    data = read_json()
    if data is None:
        return error("请求体必须是 JSON 对象", 400)
    name = normalize_name(data.get("name"))
    if name is None:
        return error("name 不能为空", 400)
    project = project_model.create_project(name)
    return jsonify(project), 201


@projects_bp.get("/api/projects/<project_id>")
def get_project(project_id: str):
    project = project_model.get_project(project_id)
    if project is None:
        return error("项目不存在", 404)
    return jsonify(project)


@projects_bp.put("/api/projects/<project_id>")
def rename_project(project_id: str):
    data = read_json()
    if data is None:
        return error("请求体必须是 JSON 对象", 400)
    name = normalize_name(data.get("name"))
    if name is None:
        return error("name 不能为空", 400)
    project = project_model.rename_project(project_id, name)
    if project is None:
        return error("项目不存在", 404)
    return jsonify(project)


@projects_bp.delete("/api/projects/<project_id>")
def delete_project(project_id: str):
    ok = project_model.delete_project(project_id)
    if not ok:
        return error("项目不存在", 404)
    return "", 204


@projects_bp.get("/api/projects/<project_id>/nodes")
def get_nodes(project_id: str):
    project = project_model.get_project(project_id)
    if project is None:
        return error("项目不存在", 404)
    return jsonify({"nodes": node_model.list_nodes(project_id)})


@projects_bp.put("/api/projects/<project_id>/nodes")
def put_nodes(project_id: str):
    data = read_json()
    if data is None:
        return error("请求体必须是 JSON 对象", 400)
    err = validate_nodes(data.get("nodes"))
    if err:
        return error(err, 400)
    ok = node_model.replace_nodes(project_id, data["nodes"])
    if not ok:
        return error("项目不存在", 404)
    return jsonify({"nodes": node_model.list_nodes(project_id)})
