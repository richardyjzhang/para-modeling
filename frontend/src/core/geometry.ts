import * as THREE from "three";
import { evalPositiveDim } from "./expression";
import type { PlaceableShape, PrimitiveNode, PrimitiveShape } from "./types";
import { DIM_FIELDS } from "./types";

const RADIAL_SEGMENTS = 32;

export type EvalDimsOk = { ok: true; values: Record<string, number> };
export type EvalDimsErr = { ok: false; message: string };
export type EvalDimsResult = EvalDimsOk | EvalDimsErr;

/**
 * 把 primitive 的 dims 表达式求成数字。
 * 第 3 期只允许纯数字；字段缺失或 ≤ 0 都视为错误。
 */
export function evaluatePrimitiveDims(node: PrimitiveNode): EvalDimsResult {
  const values: Record<string, number> = {};
  for (const field of DIM_FIELDS[node.shape]) {
    const raw = (node.dims as Record<string, string>)[field.key];
    if (raw === undefined) {
      return { ok: false, message: `${field.label} 缺失` };
    }
    const result = evalPositiveDim(raw);
    if (!result.ok) {
      return { ok: false, message: `${field.label}：${result.message}` };
    }
    values[field.key] = result.value;
  }
  return { ok: true, values };
}


/** 创建基础图元的几何体。 */
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
      // Three.js 的 CylinderGeometry 默认沿 Y，这里 rotateX(90°) 纠正。
      geo.rotateX(Math.PI / 2);
      return geo;
    }
    default:
      throw new Error(`图元 ${shape} 将在第 4 期实现`);
  }
}

/** 计算基础图元的高度。 */
export function primitiveHeight(shape: PlaceableShape, dims: Record<string, number>): number {
  if (shape === "box") return dims.z;
  return dims.height;
}
