"""Flask 入口。请在 backend 目录下执行：python run.py"""

from flask import Flask
from flask_cors import CORS

from api.hello import hello_bp


def create_app() -> Flask:
    app = Flask(__name__)
    # 开发期允许前端源跨域；生产部署时再收紧
    CORS(app)
    app.register_blueprint(hello_bp)
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=5000, debug=True)
