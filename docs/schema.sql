-- para-modeling 表结构。
-- 后端启动时不自动建表；结构变更后由用户手工对数据库执行本文件。
-- 数据库文件位置：backend/app.db
-- 不使用 FOREIGN KEY：关联完整性由应用层维护（删项目时先删节点等）。
-- 时间字段一律 TEXT，本地时间字符串，格式 YYYY-MM-DD HH:MM:SS（如 2026-09-11 05:30:26）。

CREATE TABLE project (
  id         TEXT PRIMARY KEY,   -- prj_ + uuid
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL,      -- 创建时间，本地时间字符串，格式 "YYYY-MM-DD HH:MM:SS"（如 2026-09-11 05:30:26），由后端写入
  updated_at TEXT NOT NULL       -- 最近保存时间，格式同上；新建时等于 created_at，每次保存整树/改名时由后端更新
);

CREATE TABLE model_node (        -- 邻接表，见 design.md §5
  id           TEXT PRIMARY KEY, -- node_ + uuid（前端生成）
  project_id   TEXT NOT NULL,
  parent_id    TEXT,             -- NULL = 挂在树根
  node_type    TEXT NOT NULL,    -- group / primitive / instance
  name         TEXT NOT NULL,
  sort_order   INTEGER NOT NULL, -- 同级排序
  transform    TEXT NOT NULL,    -- JSON {pos, rot}，工程侧存数字
  shape        TEXT,             -- 仅 primitive
  dims         TEXT,             -- 仅 primitive，JSON，值为表达式字符串
  template_id  TEXT,             -- 仅 instance（预埋）
  param_values TEXT              -- 仅 instance，JSON（预埋）
);
CREATE INDEX idx_model_node_project ON model_node(project_id);
CREATE INDEX idx_model_node_parent  ON model_node(parent_id);
