import type { AnnotationConfig } from "./types";

/**
 * A normalized optimization direction. `undefined` stands for "NONE" and for a
 * missing config.
 */
export type OptimizationDirectionResult = "MAXIMIZE" | "MINIMIZE" | undefined;

export type AnnotationOptimizationConfig = {
  readonly annotationType: AnnotationConfig["annotationType"];
  readonly optimizationDirection?: string | null;
  readonly lowerBound?: number | null;
  readonly upperBound?: number | null;
  readonly threshold?: number | null;
  readonly values?: ReadonlyArray<{
    readonly label?: string;
    readonly score: number | null;
  }>;
};

/**
 * Normalizes the optimization direction, treating "NONE" as undefined.
 */
function normalizeOptimizationDirection(
  direction: string | null | undefined
): OptimizationDirectionResult {
  if (direction === "MAXIMIZE" || direction === "MINIMIZE") {
    return direction;
  }
  return undefined;
}

/**
 * Gets the optimization bounds from an annotation config.
 * For continuous configs, uses the lower/upper bounds directly.
 * For categorical configs, calculates bounds from the min/max scores of the values.
 * For freeform configs, returns an optional threshold that overrides the midpoint computation.
 */
export function getOptimizationBounds(
  config: AnnotationOptimizationConfig | undefined
): {
  lowerBound: number | undefined;
  upperBound: number | undefined;
  threshold: number | undefined;
  optimizationDirection: OptimizationDirectionResult;
} {
  if (config == null) {
    return {
      lowerBound: undefined,
      upperBound: undefined,
      threshold: undefined,
      optimizationDirection: undefined,
    };
  }

  if (config.annotationType === "FREEFORM") {
    return {
      lowerBound: config.lowerBound ?? undefined,
      upperBound: config.upperBound ?? undefined,
      threshold: config.threshold ?? undefined,
      optimizationDirection: normalizeOptimizationDirection(
        config.optimizationDirection
      ),
    };
  }

  const optimizationDirection = normalizeOptimizationDirection(
    config.optimizationDirection
  );

  if (config.annotationType === "CONTINUOUS") {
    return {
      lowerBound: config.lowerBound ?? undefined,
      upperBound: config.upperBound ?? undefined,
      threshold: undefined,
      optimizationDirection,
    };
  }

  // CATEGORICAL
  const lowerBound = config.values?.reduce((acc, value) => {
    if (value.score == null) {
      return acc;
    }
    return value.score < acc ? value.score : acc;
  }, Infinity);

  const upperBound = config.values?.reduce((acc, value) => {
    if (value.score == null) {
      return acc;
    }
    return value.score > acc ? value.score : acc;
  }, -Infinity);

  return {
    lowerBound: lowerBound === Infinity ? undefined : lowerBound,
    upperBound: upperBound === -Infinity ? undefined : upperBound,
    threshold: undefined,
    optimizationDirection,
  };
}

/**
 * Determines if a score represents a "positive" optimization result.
 *
 * Uses `threshold` as the pivot when provided; falls back to `(lowerBound + upperBound) / 2`
 * when both bounds are defined. Returns null when no pivot can be determined.
 * For MAXIMIZE direction: returns true if score is above the pivot.
 * For MINIMIZE direction: returns true if score is below the pivot.
 *
 * Returns null if the optimization status cannot be determined (missing pivot, score, or direction).
 */
export function getPositiveOptimization({
  score,
  lowerBound,
  upperBound,
  threshold,
  optimizationDirection,
}: {
  score: number | null | undefined;
  lowerBound: number | undefined;
  upperBound: number | undefined;
  threshold?: number | undefined;
  optimizationDirection: OptimizationDirectionResult;
}): boolean | null {
  if (score == null || optimizationDirection == null) {
    return null;
  }

  const pivot =
    threshold != null
      ? threshold
      : lowerBound != null && upperBound != null
        ? (lowerBound + upperBound) / 2
        : undefined;

  if (pivot == null) {
    return null;
  }

  return optimizationDirection === "MAXIMIZE" ? score > pivot : score < pivot;
}

/**
 * Determines if a score represents a "positive" optimization result based on an annotation config.
 *
 * This is a convenience function that combines `getOptimizationBounds` and `getPositiveOptimization`.
 *
 * @example
 * ```ts
 * const positiveOptimization = getPositiveOptimizationFromConfig({
 *   config: annotationConfig,
 *   score: annotation.score,
 * });
 * ```
 */
export function getPositiveOptimizationFromConfig({
  config,
  score,
}: {
  config: AnnotationOptimizationConfig | undefined;
  score: number | null | undefined;
}): boolean | null {
  const { lowerBound, upperBound, threshold, optimizationDirection } =
    getOptimizationBounds(config);

  return getPositiveOptimization({
    score,
    lowerBound,
    upperBound,
    threshold,
    optimizationDirection,
  });
}

export type OptimizationTrendVerdict = "better" | "worse" | "flat";

export type OptimizationTrendPoint = {
  readonly x: number;
  readonly meanScore?: number | null;
};

export type OptimizationTrend = {
  readonly verdict: OptimizationTrendVerdict;
  /**
   * The raw change from start to end, so a rising MINIMIZE metric has a
   * positive delta and a "worse" verdict.
   */
  readonly delta: number;
  readonly start: { readonly x: number; readonly score: number };
  readonly end: { readonly x: number; readonly score: number };
  /** Changes no larger than this count as "flat". */
  readonly flatTolerance: number;
};

/**
 * The share of the config's score range that a change must exceed to count as
 * better or worse rather than flat.
 */
export const DEFAULT_FLAT_TOLERANCE_FRACTION = 0.05;

// Keeps float noise (0.55 - 0.5 = 0.05000000000000004) from tipping a change
// that sits exactly on the tolerance out of "flat"
const FLAT_TOLERANCE_EPSILON = 1e-9;

/**
 * Determines whether an annotation got better, worse, or stayed flat by
 * comparing the first and last scored points, ordered by `x`.
 *
 * This judges the trend, not the level: `threshold` is ignored. Use
 * `getPositiveOptimization` to judge a single score against the pivot.
 *
 * Returns null when the trend cannot be judged: no optimization direction
 * (missing config or NONE), missing bounds or an empty score range, or fewer
 * than two scored points.
 *
 * @example
 * ```ts
 * // AnnotationMetricsChartPoint has `x` and `meanScore`, so series data can be
 * // passed in directly
 * const trend = getOptimizationTrend({
 *   points: series.data,
 *   config: annotationConfig,
 * });
 * ```
 */
export function getOptimizationTrend({
  points,
  config,
  flatToleranceFraction = DEFAULT_FLAT_TOLERANCE_FRACTION,
}: {
  points: ReadonlyArray<OptimizationTrendPoint>;
  config: AnnotationOptimizationConfig | undefined;
  flatToleranceFraction?: number;
}): OptimizationTrend | null {
  const { lowerBound, upperBound, optimizationDirection } =
    getOptimizationBounds(config);
  if (optimizationDirection == null) {
    return null;
  }
  // Without a score range there is no scale to separate a real change from noise
  if (lowerBound == null || upperBound == null || upperBound <= lowerBound) {
    return null;
  }

  const scoredPoints = points
    .flatMap(({ x, meanScore }) =>
      meanScore != null && Number.isFinite(meanScore)
        ? [{ x, score: meanScore }]
        : []
    )
    .sort((left, right) => left.x - right.x);
  if (scoredPoints.length < 2) {
    return null;
  }

  const start = scoredPoints[0];
  const end = scoredPoints[scoredPoints.length - 1];
  const delta = end.score - start.score;
  const flatTolerance = flatToleranceFraction * (upperBound - lowerBound);

  let verdict: OptimizationTrendVerdict;
  if (Math.abs(delta) <= flatTolerance + FLAT_TOLERANCE_EPSILON) {
    verdict = "flat";
  } else {
    const improved =
      optimizationDirection === "MAXIMIZE" ? delta > 0 : delta < 0;
    verdict = improved ? "better" : "worse";
  }

  return { verdict, delta, start, end, flatTolerance };
}
