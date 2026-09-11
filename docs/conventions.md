# 数据约定与词汇表

> 本文件是所有**枚举值、字段名、拼写**的唯一登记处。代码、数据库、JSON、API 中出现的这些词，
> 必须与本文件完全一致（大小写敏感）。新增词汇（如新图元）必须**先登记到这里再写代码**。
> 标注 🔜 的条目表示后续期才实现，但拼写现在就定死。

## 1. 全局约定


| 项        | 约定                                                                     |
| -------- | ---------------------------------------------------------------------- |
| 长度单位     | 毫米（mm），数据层不带单位，UI 层展示单位                                                |
| 角度单位     | 度（角度制），包括旋转和表达式中的三角函数                                                  |
| 坐标系      | 右手系，**Z 轴向上**（工程习惯；Three.js 默认 Y-up，前端渲染层负责适配）                         |
| 旋转表示     | 欧拉角 `[rx, ry, rz]`，按 X → Y → Z 顺序依次施加（对应 Three.js Euler order `'XYZ'`） |
| JSON 字段名 | camelCase（如 `templateId`、`sortOrder`）                                  |
| 数据库表/字段名 | snake_case（如 `template_id`、`sort_order`）                               |
| API 路径   | 复数名词、kebab-case（如 `/api/projects`、`/api/component-templates`）          |
| 模板 id    | `tpl_` 前缀 + uuid（如 `tpl_3f2a…`）                                        |
| 项目 id    | `prj_` 前缀 + uuid（如 `prj_3f2a…`）                                        |
| 模型节点 id  | `node_` 前缀 + uuid（如 `node_3f2a…`）                                      |
| 时间字符串   | `YYYY-MM-DD HH:MM:SS`（本地时间，如 `2026-09-11 05:30:26`）；库字段用 TEXT 存     |
| 表达式      | 存字符串；常数也写成字符串（`"300"`）；乘方用 `^`；语法与函数白名单见 `design.md` 4.1               |




## 2. 元件模板 JSON 词汇



### 2.1 零件类型 `kind`


| 值           | 含义                |
| ----------- | ----------------- |
| `primitive` | 基本图元              |
| `ref`       | 引用另一个元件模板（第 19 期） |




### 2.2 图元类型 `shape` 及其 `dims` 字段

`dims` 里所有值均为表达式字符串。各图元的参数含义、局部坐标系、与 Three.js 默认几何的差异见 [`docs/primitives.md`](primitives.md)（几何细节只在那份文档维护）。


| shape        | dims 字段                               | 说明                                 |
| ------------ | ------------------------------------- | ---------------------------------- |
| `box`        | `x`, `y`, `z`                         | 长方体，三个边长，几何中心在原点                   |
| `cylinder`   | `radius`, `height`                    | 圆柱，轴向为局部 Z，几何中心在原点                 |
| `cone`       | `radiusBottom`, `radiusTop`, `height` | 圆台（`radiusTop` 为 `"0"` 即圆锥），轴向局部 Z |
| `sphere`     | `radius`                              | 球                                  |
| `torus`      | `radius`, `tubeRadius`                | 圆环：环中心线半径 + 管半径，环面在局部 XY 平面        |
| `extrusion`  | 🔜 第 14 期定稿（2D 轮廓 + 拉伸高度）             | 轮廓在局部 XY 平面，沿 Z 拉伸                 |
| `revolution` | 🔜 第 15 期定稿（2D 轮廓 + 旋转角度）             | 轮廓绕局部 Z 轴旋转                        |
| `sweep`      | 🔜 第 16/17 期定稿（截面 + 路径）               | 截面沿路径扫掠                            |




### 2.3 模板其余字段


| 字段              | 说明                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `params[]`      | `name`（参数名，字母开头、字母数字下划线）、`type`、`default`、`min`、`max`、`desc`                                       |
| `params[].type` | 目前仅 `number`；`bool` / `enum` 🔜 未排期，拼写预留                                                           |
| `items[]`       | 零件列表；通用字段 `kind`、`name`、`transform`；`primitive` 另有 `shape`、`dims`；`ref` 另有 `templateId`、`bindings` |
| `transform`     | `{ "pos": [x, y, z], "rot": [rx, ry, rz] }`，模板内为表达式字符串数组                                           |
| `ppoints[]`     | 🔜 第 18 期。`name`（惯例 `P0`, `P1`…）、`pos`、`dir`（单位向量）、`desc`                                          |




## 3. 工程模型词汇



### 3.1 模型树节点类型 `nodeType`（库字段 `node_type`）


| 值           | 含义                                        |
| ----------- | ----------------------------------------- |
| `group`     | 分组节点，纯组织层级（类似 PDMS 的 SITE/ZONE）           |
| `primitive` | 裸图元直接摆进场景，携带 `shape` + `dims`             |
| `instance`  | 元件实例，携带 `templateId` + `paramValues`，不存几何 |




### 3.2 节点其余字段


| JSON 字段         | 库字段          | 说明                                       |
| ------------- | ------------ | ---------------------------------------- |
| `id`          | `id`         | 节点唯一标识，见 §1「模型节点 id」                      |
| `name`        | `name`       | 显示名称（如 `box_1`）                          |
| `parentId`    | `parent_id`  | 父节点 `id`；挂在树根下时为 `null`                   |
| `sortOrder`   | `sort_order` | 同级排序，从 0 起的整数；保存时按当前数组顺序重写               |
| `transform`   | `transform`  | JSON `{ pos, rot }`；**工程侧存具体数字**（不是表达式） |
| `shape`       | `shape`      | 仅 `primitive`；取值见 §2.2                    |
| `dims`        | `dims`       | 仅 `primitive`；JSON，值为表达式字符串              |
| `templateId`  | `template_id` | 仅 `instance`；指向元件模板                       |
| `paramValues` | `param_values` | `{ "参数名": 数值 }`，仅 `instance` 节点有         |
| `color`       | `color`      | 可空；`#` 开头的 6 位十六进制颜色字符串（如 `#ff8800`，大小写均可）；为 null 时前端按图元类型默认色渲染。目前仅 `primitive` 渲染用到 |




## 4. 登记规则

- 新增 `shape` / `kind` / `nodeType` / 参数 `type` 等枚举值：先在本文件登记拼写和字段结构，再动代码。
- 🔜 条目实现时：去掉标记、补全字段定义，并确认与实际代码一致。
- 如发现代码与本文件不一致，以本文件为准修正代码；若确需改约定，先改本文件并检查存量数据迁移。

