/**
 * 第 3 期临时求值器：只接受纯数字字符串（可带正负号、小数、科学计数法）。
 * 第 11 期将整文件换成 math.js + AST 白名单，调用方接口尽量保持
 * 「字符串 → 数字 | 错误」，避免大面积返工。
 */

export type EvalOk = { ok: true; value: number };
export type EvalErr = { ok: false; message: string };
export type EvalResult = EvalOk | EvalErr;

const NUMERIC_LITERAL =
  /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/** 求值纯数字字符串。 */
export function evalNumericLiteral(expr: string): EvalResult {
  const text = expr.trim();
  if (text === "") {
    return { ok: false, message: "不能为空" };
  }
  if (!NUMERIC_LITERAL.test(text)) {
    return {
      ok: false,
      message: "目前只支持纯数字（表达式引擎在第 11 期）",
    };
  }
  const value = Number(text);
  if (!Number.isFinite(value)) {
    return { ok: false, message: "不是有效数字" };
  }
  return { ok: true, value };
}

/** 求值正数表达式（必须 > 0）。 */
export function evalPositiveDim(expr: string): EvalResult {
  const result = evalNumericLiteral(expr);
  if (!result.ok) return result;
  if (result.value <= 0) {
    return { ok: false, message: "尺寸必须大于 0" };
  }
  return result;
}

/** 求值非负尺寸（允许 0，供圆台顶半径用）。 */
export function evalNonNegativeDim(expr: string): EvalResult {
  const result = evalNumericLiteral(expr);
  if (!result.ok) return result;
  if (result.value < 0) {
    return { ok: false, message: "尺寸不能为负" };
  }
  return result;
}
