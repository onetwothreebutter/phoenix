import type { AnnotationOptimizationConfig } from "../optimizationUtils";
import {
  getOptimizationBounds,
  getOptimizationTrend,
  getPositiveOptimization,
  getPositiveOptimizationFromConfig,
} from "../optimizationUtils";
import type {
  AnnotationConfig,
  AnnotationConfigCategorical,
  AnnotationConfigContinuous,
  AnnotationConfigFreeform,
} from "../types";

const continuousConfig: AnnotationConfigContinuous = {
  annotationType: "CONTINUOUS",
  name: "quality",
  lowerBound: 0,
  upperBound: 1,
  optimizationDirection: "MAXIMIZE",
};

const categoricalConfig: AnnotationConfigCategorical = {
  annotationType: "CATEGORICAL",
  name: "sentiment",
  optimizationDirection: "MAXIMIZE",
  values: [
    { label: "negative", score: 0 },
    { label: "neutral", score: 0.5 },
    { label: "positive", score: 1 },
  ],
};

const freeformConfig: AnnotationConfigFreeform = {
  annotationType: "FREEFORM",
  name: "notes",
};

describe("getOptimizationBounds", () => {
  it("returns undefined for all fields when config is undefined", () => {
    expect(getOptimizationBounds(undefined)).toEqual({
      lowerBound: undefined,
      upperBound: undefined,
      optimizationDirection: undefined,
    });
  });

  it("returns undefined for all fields when config is FREEFORM", () => {
    expect(getOptimizationBounds(freeformConfig)).toEqual({
      lowerBound: undefined,
      upperBound: undefined,
      optimizationDirection: undefined,
    });
  });

  it("extracts bounds directly from CONTINUOUS config", () => {
    expect(getOptimizationBounds(continuousConfig)).toEqual({
      lowerBound: 0,
      upperBound: 1,
      optimizationDirection: "MAXIMIZE",
    });
  });

  it("handles CONTINUOUS config with null bounds", () => {
    const config: AnnotationConfigContinuous = {
      ...continuousConfig,
      lowerBound: null,
      upperBound: null,
    };
    expect(getOptimizationBounds(config)).toEqual({
      lowerBound: undefined,
      upperBound: undefined,
      optimizationDirection: "MAXIMIZE",
    });
  });

  it("calculates bounds from CATEGORICAL config values", () => {
    expect(getOptimizationBounds(categoricalConfig)).toEqual({
      lowerBound: 0,
      upperBound: 1,
      optimizationDirection: "MAXIMIZE",
    });
  });

  it("handles CATEGORICAL config with no values", () => {
    const config: AnnotationConfigCategorical = {
      ...categoricalConfig,
      values: [],
    };
    expect(getOptimizationBounds(config)).toEqual({
      lowerBound: undefined,
      upperBound: undefined,
      optimizationDirection: "MAXIMIZE",
    });
  });

  it("handles CATEGORICAL config with null scores", () => {
    const config: AnnotationConfigCategorical = {
      ...categoricalConfig,
      values: [
        { label: "a", score: null },
        { label: "b", score: 5 },
        { label: "c", score: null },
      ],
    };
    expect(getOptimizationBounds(config)).toEqual({
      lowerBound: 5,
      upperBound: 5,
      optimizationDirection: "MAXIMIZE",
    });
  });

  it("normalizes NONE optimization direction to undefined", () => {
    const config: AnnotationConfigContinuous = {
      ...continuousConfig,
      optimizationDirection: "NONE",
    };
    expect(getOptimizationBounds(config)).toEqual({
      lowerBound: 0,
      upperBound: 1,
      optimizationDirection: undefined,
    });
  });

  it("handles MINIMIZE optimization direction", () => {
    const config: AnnotationConfigContinuous = {
      ...continuousConfig,
      optimizationDirection: "MINIMIZE",
    };
    expect(getOptimizationBounds(config)).toEqual({
      lowerBound: 0,
      upperBound: 1,
      optimizationDirection: "MINIMIZE",
    });
  });
});

describe("getPositiveOptimization", () => {
  it("returns null when score is null", () => {
    expect(
      getPositiveOptimization({
        score: null,
        lowerBound: 0,
        upperBound: 1,
        optimizationDirection: "MAXIMIZE",
      })
    ).toBeNull();
  });

  it("returns null when score is undefined", () => {
    expect(
      getPositiveOptimization({
        score: undefined,
        lowerBound: 0,
        upperBound: 1,
        optimizationDirection: "MAXIMIZE",
      })
    ).toBeNull();
  });

  it("returns null when bounds are undefined and no threshold", () => {
    expect(
      getPositiveOptimization({
        score: 0.5,
        lowerBound: undefined,
        upperBound: 1,
        optimizationDirection: "MAXIMIZE",
      })
    ).toBeNull();

    expect(
      getPositiveOptimization({
        score: 0.5,
        lowerBound: 0,
        upperBound: undefined,
        optimizationDirection: "MAXIMIZE",
      })
    ).toBeNull();
  });

  it("uses threshold as pivot when provided, ignoring bounds", () => {
    // MAXIMIZE + threshold=0.7: score=0.8 is positive, score=0.5 is negative
    expect(
      getPositiveOptimization({
        score: 0.8,
        lowerBound: undefined,
        upperBound: undefined,
        threshold: 0.7,
        optimizationDirection: "MAXIMIZE",
      })
    ).toBe(true);

    expect(
      getPositiveOptimization({
        score: 0.5,
        lowerBound: undefined,
        upperBound: undefined,
        threshold: 0.7,
        optimizationDirection: "MAXIMIZE",
      })
    ).toBe(false);

    // MINIMIZE + threshold=0.7: score=0.5 is positive, score=0.8 is negative
    expect(
      getPositiveOptimization({
        score: 0.5,
        lowerBound: undefined,
        upperBound: undefined,
        threshold: 0.7,
        optimizationDirection: "MINIMIZE",
      })
    ).toBe(true);

    expect(
      getPositiveOptimization({
        score: 0.8,
        lowerBound: undefined,
        upperBound: undefined,
        threshold: 0.7,
        optimizationDirection: "MINIMIZE",
      })
    ).toBe(false);
  });

  it("returns null when optimization direction is undefined", () => {
    expect(
      getPositiveOptimization({
        score: 0.5,
        lowerBound: 0,
        upperBound: 1,
        optimizationDirection: undefined,
      })
    ).toBeNull();
  });

  describe("MAXIMIZE direction", () => {
    // With bounds 0-1, midpoint is 0.5
    it("returns true when score is above the midpoint", () => {
      expect(
        getPositiveOptimization({
          score: 0.75,
          lowerBound: 0,
          upperBound: 1,
          optimizationDirection: "MAXIMIZE",
        })
      ).toBe(true);
    });

    it("returns true when score equals the upper bound", () => {
      expect(
        getPositiveOptimization({
          score: 1,
          lowerBound: 0,
          upperBound: 1,
          optimizationDirection: "MAXIMIZE",
        })
      ).toBe(true);
    });

    it("returns false when score equals the midpoint", () => {
      expect(
        getPositiveOptimization({
          score: 0.5,
          lowerBound: 0,
          upperBound: 1,
          optimizationDirection: "MAXIMIZE",
        })
      ).toBe(false);
    });

    it("returns false when score is below the midpoint", () => {
      expect(
        getPositiveOptimization({
          score: 0.25,
          lowerBound: 0,
          upperBound: 1,
          optimizationDirection: "MAXIMIZE",
        })
      ).toBe(false);
    });
  });

  describe("MINIMIZE direction", () => {
    // With bounds 0-1, midpoint is 0.5
    it("returns true when score is below the midpoint", () => {
      expect(
        getPositiveOptimization({
          score: 0.25,
          lowerBound: 0,
          upperBound: 1,
          optimizationDirection: "MINIMIZE",
        })
      ).toBe(true);
    });

    it("returns true when score equals the lower bound", () => {
      expect(
        getPositiveOptimization({
          score: 0,
          lowerBound: 0,
          upperBound: 1,
          optimizationDirection: "MINIMIZE",
        })
      ).toBe(true);
    });

    it("returns false when score equals the midpoint", () => {
      expect(
        getPositiveOptimization({
          score: 0.5,
          lowerBound: 0,
          upperBound: 1,
          optimizationDirection: "MINIMIZE",
        })
      ).toBe(false);
    });

    it("returns false when score is above the midpoint", () => {
      expect(
        getPositiveOptimization({
          score: 0.75,
          lowerBound: 0,
          upperBound: 1,
          optimizationDirection: "MINIMIZE",
        })
      ).toBe(false);
    });
  });
});

describe("getPositiveOptimizationFromConfig", () => {
  it("returns null when config is undefined", () => {
    expect(
      getPositiveOptimizationFromConfig({
        config: undefined,
        score: 1,
      })
    ).toBeNull();
  });

  it("returns null for FREEFORM config", () => {
    expect(
      getPositiveOptimizationFromConfig({
        config: freeformConfig,
        score: 1,
      })
    ).toBeNull();
  });

  describe("FREEFORM with threshold pivot", () => {
    it("returns true when MAXIMIZE score is above threshold", () => {
      const config: AnnotationConfigFreeform = {
        annotationType: "FREEFORM",
        name: "score",
        optimizationDirection: "MAXIMIZE",
        threshold: 0.7,
      };
      expect(getPositiveOptimizationFromConfig({ config, score: 0.8 })).toBe(
        true
      );
    });

    it("returns false when MAXIMIZE score is below threshold", () => {
      const config: AnnotationConfigFreeform = {
        annotationType: "FREEFORM",
        name: "score",
        optimizationDirection: "MAXIMIZE",
        threshold: 0.7,
      };
      expect(getPositiveOptimizationFromConfig({ config, score: 0.5 })).toBe(
        false
      );
    });

    it("returns true when MINIMIZE score is below threshold", () => {
      const config: AnnotationConfigFreeform = {
        annotationType: "FREEFORM",
        name: "latency",
        optimizationDirection: "MINIMIZE",
        threshold: 100,
      };
      expect(getPositiveOptimizationFromConfig({ config, score: 50 })).toBe(
        true
      );
    });

    it("prefers threshold over bounded midpoint when both are present", () => {
      const config: AnnotationConfigFreeform = {
        annotationType: "FREEFORM",
        name: "score",
        optimizationDirection: "MAXIMIZE",
        threshold: 0.9,
        lowerBound: 0,
        upperBound: 1,
      };
      // Midpoint would be 0.5; threshold is 0.9. Score 0.75 < 0.9 → false.
      expect(getPositiveOptimizationFromConfig({ config, score: 0.75 })).toBe(
        false
      );
    });
  });

  describe("FREEFORM with bounded-midpoint fallback", () => {
    it("uses midpoint when both bounds are present and no threshold is set", () => {
      const config: AnnotationConfigFreeform = {
        annotationType: "FREEFORM",
        name: "score",
        optimizationDirection: "MAXIMIZE",
        lowerBound: 0,
        upperBound: 1,
      };
      // Midpoint 0.5: MAXIMIZE + score 0.75 → true.
      expect(getPositiveOptimizationFromConfig({ config, score: 0.75 })).toBe(
        true
      );
      expect(getPositiveOptimizationFromConfig({ config, score: 0.25 })).toBe(
        false
      );
    });

    it("uses midpoint with MINIMIZE direction", () => {
      const config: AnnotationConfigFreeform = {
        annotationType: "FREEFORM",
        name: "score",
        optimizationDirection: "MINIMIZE",
        lowerBound: 0,
        upperBound: 10,
      };
      expect(getPositiveOptimizationFromConfig({ config, score: 2 })).toBe(
        true
      );
      expect(getPositiveOptimizationFromConfig({ config, score: 8 })).toBe(
        false
      );
    });
  });

  describe("FREEFORM with no valid pivot", () => {
    // Unbounded freeform without threshold MUST return null.
    it("returns null when only lowerBound is set", () => {
      const config: AnnotationConfigFreeform = {
        annotationType: "FREEFORM",
        name: "score",
        optimizationDirection: "MAXIMIZE",
        lowerBound: 0,
      };
      expect(
        getPositiveOptimizationFromConfig({ config, score: 5 })
      ).toBeNull();
    });

    it("returns null when only upperBound is set", () => {
      const config: AnnotationConfigFreeform = {
        annotationType: "FREEFORM",
        name: "score",
        optimizationDirection: "MAXIMIZE",
        upperBound: 1,
      };
      expect(
        getPositiveOptimizationFromConfig({ config, score: 0.5 })
      ).toBeNull();
    });

    it("returns null when optimizationDirection is NONE even with a threshold", () => {
      const config: AnnotationConfigFreeform = {
        annotationType: "FREEFORM",
        name: "score",
        optimizationDirection: "NONE",
        threshold: 0.5,
      };
      expect(
        getPositiveOptimizationFromConfig({ config, score: 0.8 })
      ).toBeNull();
    });

    it("returns null when optimizationDirection is NONE with bounds set", () => {
      const config: AnnotationConfigFreeform = {
        annotationType: "FREEFORM",
        name: "score",
        optimizationDirection: "NONE",
        lowerBound: 0,
        upperBound: 1,
      };
      expect(
        getPositiveOptimizationFromConfig({ config, score: 0.8 })
      ).toBeNull();
    });
  });

  // Bounds are 0-1, so midpoint is 0.5
  it("returns true for score above midpoint with CONTINUOUS MAXIMIZE config", () => {
    expect(
      getPositiveOptimizationFromConfig({
        config: continuousConfig,
        score: 0.75,
      })
    ).toBe(true);
  });

  it("returns false for score at midpoint with CONTINUOUS MAXIMIZE config", () => {
    expect(
      getPositiveOptimizationFromConfig({
        config: continuousConfig,
        score: 0.5,
      })
    ).toBe(false);
  });

  it("returns false for score below midpoint with CONTINUOUS MAXIMIZE config", () => {
    expect(
      getPositiveOptimizationFromConfig({
        config: continuousConfig,
        score: 0.25,
      })
    ).toBe(false);
  });

  it("returns true for score above midpoint with CATEGORICAL MAXIMIZE config", () => {
    expect(
      getPositiveOptimizationFromConfig({
        config: categoricalConfig,
        score: 0.75,
      })
    ).toBe(true);
  });

  it("returns false for score at midpoint with CATEGORICAL MAXIMIZE config", () => {
    expect(
      getPositiveOptimizationFromConfig({
        config: categoricalConfig,
        score: 0.5,
      })
    ).toBe(false);
  });

  it("works with MINIMIZE direction", () => {
    const minimizeConfig: AnnotationConfig = {
      ...continuousConfig,
      optimizationDirection: "MINIMIZE",
    };

    // Score below midpoint (0.5) is positive for MINIMIZE
    expect(
      getPositiveOptimizationFromConfig({
        config: minimizeConfig,
        score: 0.25,
      })
    ).toBe(true);

    // Score at midpoint is not positive
    expect(
      getPositiveOptimizationFromConfig({
        config: minimizeConfig,
        score: 0.5,
      })
    ).toBe(false);

    // Score above midpoint is not positive for MINIMIZE
    expect(
      getPositiveOptimizationFromConfig({
        config: minimizeConfig,
        score: 0.75,
      })
    ).toBe(false);
  });
});

describe("getOptimizationTrend", () => {
  const DAY = 24 * 60 * 60 * 1000;

  const makePoints = (scores: ReadonlyArray<number | null | undefined>) =>
    scores.map((meanScore, index) => ({ x: index * DAY, meanScore }));

  const minimizeContinuousConfig: AnnotationConfigContinuous = {
    ...continuousConfig,
    name: "hallucination_rate",
    optimizationDirection: "MINIMIZE",
  };

  it("returns better when a MAXIMIZE score rises", () => {
    const trend = getOptimizationTrend({
      points: makePoints([0.45, 0.6, 0.85]),
      config: continuousConfig,
    });
    expect(trend?.verdict).toBe("better");
    expect(trend?.delta).toBeCloseTo(0.4);
  });

  it("returns worse when a MINIMIZE score rises", () => {
    // Daily hallucination_rate means from the seeded demo project
    const trend = getOptimizationTrend({
      points: makePoints([
        0.142, 0.155, 0.218, 0.265, 0.285, 0.398, 0.383, 0.486,
      ]),
      config: minimizeContinuousConfig,
    });
    expect(trend?.verdict).toBe("worse");
    expect(trend?.delta).toBeCloseTo(0.344);
  });

  it("returns better when a MINIMIZE score falls", () => {
    expect(
      getOptimizationTrend({
        points: makePoints([0.5, 0.2]),
        config: minimizeContinuousConfig,
      })?.verdict
    ).toBe("better");
  });

  it("returns worse when a MAXIMIZE score falls", () => {
    expect(
      getOptimizationTrend({
        points: makePoints([0.8, 0.3]),
        config: continuousConfig,
      })?.verdict
    ).toBe("worse");
  });

  it("returns flat when the change is within the tolerance", () => {
    expect(
      getOptimizationTrend({
        points: makePoints([0.5, 0.9, 0.52]),
        config: continuousConfig,
      })?.verdict
    ).toBe("flat");
    expect(
      getOptimizationTrend({
        points: makePoints([0.5, 0.48]),
        config: minimizeContinuousConfig,
      })?.verdict
    ).toBe("flat");
  });

  it("returns flat when the change sits exactly on the tolerance", () => {
    // 0.55 - 0.5 is 0.05000000000000004 in floating point
    expect(
      getOptimizationTrend({
        points: makePoints([0.5, 0.55]),
        config: continuousConfig,
      })?.verdict
    ).toBe("flat");
    expect(
      getOptimizationTrend({
        points: makePoints([0.55, 0.5]),
        config: continuousConfig,
      })?.verdict
    ).toBe("flat");
  });

  it("returns a verdict once the change passes the tolerance", () => {
    expect(
      getOptimizationTrend({
        points: makePoints([0.5, 0.551]),
        config: continuousConfig,
      })?.verdict
    ).toBe("better");
  });

  it("scales the tolerance with the config's range", () => {
    const percentConfig: AnnotationConfigContinuous = {
      ...continuousConfig,
      lowerBound: 0,
      upperBound: 100,
    };
    // 4 points on a 0-100 scale is within the default 5-point tolerance
    expect(
      getOptimizationTrend({
        points: makePoints([50, 54]),
        config: percentConfig,
      })
    ).toMatchObject({ verdict: "flat", flatTolerance: 5 });
  });

  it("uses a custom flat tolerance fraction", () => {
    const points = makePoints([0.5, 0.58]);
    expect(
      getOptimizationTrend({ points, config: continuousConfig })?.verdict
    ).toBe("better");
    expect(
      getOptimizationTrend({
        points,
        config: continuousConfig,
        flatToleranceFraction: 0.1,
      })?.verdict
    ).toBe("flat");
  });

  it("compares the first and last scored points, skipping unscored bins", () => {
    const trend = getOptimizationTrend({
      points: makePoints([null, 0.2, undefined, 0.3, 0.7, null, undefined]),
      config: continuousConfig,
    });
    expect(trend?.start).toEqual({ x: DAY, score: 0.2 });
    expect(trend?.end).toEqual({ x: 4 * DAY, score: 0.7 });
  });

  it("orders points by x before comparing", () => {
    const trend = getOptimizationTrend({
      points: [
        { x: 2 * DAY, meanScore: 0.9 },
        { x: 0, meanScore: 0.1 },
        { x: DAY, meanScore: 0.4 },
      ],
      config: continuousConfig,
    });
    expect(trend?.start).toEqual({ x: 0, score: 0.1 });
    expect(trend?.end).toEqual({ x: 2 * DAY, score: 0.9 });
    expect(trend?.verdict).toBe("better");
  });

  it("does not mutate the input points", () => {
    const points = [
      { x: DAY, meanScore: 0.9 },
      { x: 0, meanScore: 0.1 },
    ];
    getOptimizationTrend({ points, config: continuousConfig });
    expect(points.map(({ x }) => x)).toEqual([DAY, 0]);
  });

  it("uses bounds derived from CATEGORICAL values", () => {
    const toxicityConfig: AnnotationConfigCategorical = {
      annotationType: "CATEGORICAL",
      name: "toxicity",
      optimizationDirection: "MINIMIZE",
      values: [
        { label: "toxic", score: 1 },
        { label: "borderline", score: 0.5 },
        { label: "safe", score: 0 },
      ],
    };
    expect(
      getOptimizationTrend({
        points: makePoints([0.35, 0.5]),
        config: toxicityConfig,
      })
    ).toMatchObject({ verdict: "worse", flatTolerance: 0.05 });
  });

  it("returns the compared points, delta and tolerance", () => {
    const trend = getOptimizationTrend({
      points: makePoints([0.25, 0.5, 0.75]),
      config: continuousConfig,
    });
    expect(trend).toEqual({
      verdict: "better",
      delta: 0.5,
      start: { x: 0, score: 0.25 },
      end: { x: 2 * DAY, score: 0.75 },
      flatTolerance: 0.05,
    });
  });

  describe("returns null when the trend cannot be judged", () => {
    const risingPoints = makePoints([0.2, 0.8]);

    it("returns null when config is undefined", () => {
      expect(
        getOptimizationTrend({ points: risingPoints, config: undefined })
      ).toBeNull();
    });

    it("returns null when optimizationDirection is NONE", () => {
      expect(
        getOptimizationTrend({
          points: risingPoints,
          config: { ...continuousConfig, optimizationDirection: "NONE" },
        })
      ).toBeNull();
    });

    it("returns null when optimizationDirection is missing", () => {
      const config: AnnotationOptimizationConfig = {
        annotationType: "CONTINUOUS",
        lowerBound: 0,
        upperBound: 1,
      };
      expect(getOptimizationTrend({ points: risingPoints, config })).toBeNull();
    });

    it("returns null when bounds are missing", () => {
      expect(
        getOptimizationTrend({
          points: risingPoints,
          config: { ...continuousConfig, lowerBound: null, upperBound: null },
        })
      ).toBeNull();
    });

    it("returns null when only one bound is set", () => {
      expect(
        getOptimizationTrend({
          points: risingPoints,
          config: { ...continuousConfig, upperBound: null },
        })
      ).toBeNull();
    });

    it("returns null when CATEGORICAL values span no range", () => {
      expect(
        getOptimizationTrend({
          points: risingPoints,
          config: {
            ...categoricalConfig,
            values: [
              { label: "a", score: 1 },
              { label: "b", score: null },
            ],
          },
        })
      ).toBeNull();
    });

    it("returns null with fewer than two scored points", () => {
      expect(
        getOptimizationTrend({
          points: makePoints([null, 0.4, undefined]),
          config: continuousConfig,
        })
      ).toBeNull();
    });

    it("returns null for empty points", () => {
      expect(
        getOptimizationTrend({ points: [], config: continuousConfig })
      ).toBeNull();
    });
  });
});
