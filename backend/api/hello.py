"""连通性探测：GET /api/hello，供第 1 期验证前后端链路。"""

from datetime import datetime

from flask import Blueprint, jsonify

hello_bp = Blueprint("hello", __name__)

# 后端版本号，随分期推进再改；本期仅用于页面展示
BACKEND_VERSION = "0.1.0"


@hello_bp.get("/api/hello")
def hello():
    return jsonify(
        {
            "message": "para-modeling 后端已连通",
            "version": BACKEND_VERSION,
            "serverTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
    )
