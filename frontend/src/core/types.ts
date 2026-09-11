/** 模型树节点类型，与 docs/conventions.md §3.1 一致。 */
export type NodeType = "group" | "primitive" | "instance";

/**
 * 已定稿的基础图元。第 3 期 UI 只创建 box / cylinder；
 * 其余 shape 预埋类型，几何工厂在第 4 期补全。
 */
export type PrimitiveShape = "box" // 长方体
  | "cylinder" // 圆柱
  | "cone" // 圆台
  | "sphere" // 球
  | "torus" // 圆环
  ;

export type Vec3 = [number, number, number];

/** 工程侧 transform：具体数字，不是表达式。 */
export type Transform = {
  pos: Vec3;
  rot: Vec3;
};

export type BoxDims = { x: string; y: string; z: string };
export type CylinderDims = { radius: string; height: string };
export type ConeDims = {
  radiusBottom: string;
  radiusTop: string;
  height: string;
};
export type SphereDims = { radius: string };
export type TorusDims = { radius: string; tubeRadius: string };

/** 基础图元的尺寸类型。 */
export type PrimitiveDims =
  | BoxDims
  | CylinderDims
  | ConeDims
  | SphereDims
  | TorusDims;

/** 模型树节点的基类型。 */
type ModelNodeBase = {
  id: string;
  name: string;
  parentId: string | null;
  transform: Transform;
};

export type GroupNode = ModelNodeBase & {
  nodeType: "group";
};

export type BoxNode = ModelNodeBase & {
  nodeType: "primitive";
  shape: "box";
  dims: BoxDims;
};

export type CylinderNode = ModelNodeBase & {
  nodeType: "primitive";
  shape: "cylinder";
  dims: CylinderDims;
};

export type ConeNode = ModelNodeBase & {
  nodeType: "primitive";
  shape: "cone";
  dims: ConeDims;
};

export type SphereNode = ModelNodeBase & {
  nodeType: "primitive";
  shape: "sphere";
  dims: SphereDims;
};

export type TorusNode = ModelNodeBase & {
  nodeType: "primitive";
  shape: "torus";
  dims: TorusDims;
};

/** 基础图元的节点类型。 */
export type PrimitiveNode =
  | BoxNode
  | CylinderNode
  | ConeNode
  | SphereNode
  | TorusNode;

/** 实例节点类型。 */
export type InstanceNode = ModelNodeBase & {
  nodeType: "instance";
  templateId: string;
  paramValues: Record<string, number>;
};

export type ModelNode = GroupNode | PrimitiveNode | InstanceNode;

/** 第 3 期工具栏可摆放的图元。 */
export type PlaceableShape = "box" | "cylinder";

export const PLACEABLE_SHAPES: readonly PlaceableShape[] = ["box", "cylinder"];

export type DimField = {
  key: string;
  label: string;
};

/** 属性面板用：每个 shape 要编辑的尺寸字段（标签给中文）。 */
export const DIM_FIELDS: Record<PrimitiveShape, readonly DimField[]> = {
  box: [
    { key: "x", label: "X（长）" },
    { key: "y", label: "Y（宽）" },
    { key: "z", label: "Z（高）" },
  ],
  cylinder: [
    { key: "radius", label: "半径" },
    { key: "height", label: "高" },
  ],
  cone: [
    { key: "radiusBottom", label: "底半径" },
    { key: "radiusTop", label: "顶半径" },
    { key: "height", label: "高" },
  ],
  sphere: [{ key: "radius", label: "半径" }],
  torus: [
    { key: "radius", label: "环半径" },
    { key: "tubeRadius", label: "管半径" },
  ],
};

export const SHAPE_LABEL: Record<PrimitiveShape, string> = {
  box: "长方体",
  cylinder: "圆柱",
  cone: "圆台",
  sphere: "球",
  torus: "圆环",
};

/** 判断节点是否为基础图元节点。 */
export function isPrimitiveNode(node: ModelNode): node is PrimitiveNode {
  return node.nodeType === "primitive";
}

/** 判断形状是否为可摆放的形状。 */
export function isPlaceableShape(shape: string): shape is PlaceableShape {
  return shape === "box" || shape === "cylinder";
}
