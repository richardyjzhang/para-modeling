import * as THREE from "three";
import { evalNonNegativeDim, evalPositiveDim } from "./expression";
import type { PlaceableShape, PrimitiveNode, PrimitiveShape } from "./types";
import { DIM_FIELDS } from "./types";

const RADIAL_SEGMENTS = 32;
const TORUS_RADIAL_SEGMENTS = 24;
const TORUS_TUBULAR_SEGMENTS = 48;

export type EvalDimsOk = { ok: true; values: Record<string, number> };
export type EvalDimsErr = { ok: false; message: string };
export type EvalDimsResult = EvalDimsOk | EvalDimsErr;

/**
 * 把 primitive 的 dims 表达式求成数字。
 * 第 4 期仍只允许纯数字；cone.radiusTop 允许 0，其余字段必须 > 0。
 */
export function evaluatePrimitiveDims(node: PrimitiveNode): EvalDimsResult {
  const values: Record<string, number> = {};
  for (const field of DIM_FIELDS[node.shape]) {
    const raw = (node.dims as Record<string, string>)[field.key];
    if (raw === undefined) {
      return { ok: false, message: `${field.label} 缺失` };
    }
    const result = field.allowZero
      ? evalNonNegativeDim(raw)
      : evalPositiveDim(raw);
    if (!result.ok) {
      return { ok: false, message: `${field.label}：${result.message}` };
    }
    values[field.key] = result.value;
  }
  return { ok: true, values };
}

/** 创建基础图元的几何体。局部系约定见 docs/primitives.md。 */
export function createPrimitiveGeometry(
  shape: PrimitiveShape,
  dims: Record<string, number>,
): THREE.BufferGeometry {
  switch (shape) {
    case "box":
      return new THREE.BoxGeometry(dims.x, dims.y, dims.z);
    case "cylinder": {
      const geo = new THREE.CylinderGeometry(
        dims.radius,
        dims.radius,
        dims.height,
        RADIAL_SEGMENTS,
      );
      // Three.js 的 CylinderGeometry 默认沿 Y，rotateX(90°) 后轴线落到局部 Z。
      geo.rotateX(Math.PI / 2);
      return geo;
    }
    case "cone": {
      // Three.js 第一个参数是顶半径，对应本约定的 radiusTop（落到局部 +Z）。
      const geo = new THREE.CylinderGeometry(
        dims.radiusTop,
        dims.radiusBottom,
        dims.height,
        RADIAL_SEGMENTS,
      );
      geo.rotateX(Math.PI / 2);
      return geo;
    }
    case "sphere":
      return new THREE.SphereGeometry(dims.radius, RADIAL_SEGMENTS, RADIAL_SEGMENTS);
    case "torus":
      // TorusGeometry 默认环面在 XY、洞沿 Z，与约定一致，无需旋转。
      return new THREE.TorusGeometry(
        dims.radius,
        dims.tubeRadius,
        TORUS_RADIAL_SEGMENTS,
        TORUS_TUBULAR_SEGMENTS,
      );
  }
}

/**
 * 计算图元沿局部 Z 的包围高度，供新建时抬高半高「坐」在 Z=0 地面上。
 * 球用直径、圆环用管直径（环面在 XY，高度即 2 * tubeRadius）。
 */
export function primitiveHeight(
  shape: PlaceableShape,
  dims: Record<string, number>,
): number {
  switch (shape) {
    case "box":
      return dims.z;
    case "cylinder":
    case "cone":
      return dims.height;
    case "sphere":
      return 2 * dims.radius;
    case "torus":
      return 2 * dims.tubeRadius;
  }
}
