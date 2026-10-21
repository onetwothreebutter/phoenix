import { css } from "@emotion/react";

import { Icon, Icons } from "@phoenix/components";

/**
 * Warning surfaces are a solid fill, so their foreground needs to stay dark in
 * both themes. Deriving it from the warning color keeps it in the same hue,
 * the same way Badge derives its colors. Lightness 5 keeps text contrast
 * above 5.5:1 against the light theme's darker warning orange.
 */
const trendWarningColorsCSS = css`
  background-color: var(--global-color-warning);
  color: lch(from var(--global-color-warning) 5 calc(c * 0.3) h);
`;

const trendWarningPillCSS = css`
  display: inline-flex;
  align-items: center;
  gap: var(--global-dimension-size-125);
  padding: var(--global-dimension-size-65) var(--global-dimension-size-125);
  border-radius: var(--global-rounding-full);
  font-size: var(--global-font-size-s);
  line-height: var(--global-line-height-s);
  white-space: nowrap;
`;

const trendWarningTabCSS = css`
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--global-dimension-size-600);
  height: 100%;
  /* Icon renders at 1.2em, so this gives a 24px icon */
  font-size: var(--global-dimension-size-250);
`;

/**
 * A pill telling the reader that an annotation has moved in the wrong
 * direction for its optimization direction over the visible time range.
 */
export function AnnotationTrendWarningPill() {
  return (
    <span css={[trendWarningColorsCSS, trendWarningPillCSS]}>
      <Icon svg={<Icons.AlertTriangleFilled />} />
      Trending worse
    </span>
  );
}

/**
 * A full-height tab for the edge of a chart panel that repeats the trend
 * warning, so worsening charts stand out when scanning a grid of panels.
 * Decorative: the pill carries the message.
 */
export function AnnotationTrendWarningTab() {
  return (
    <div css={[trendWarningColorsCSS, trendWarningTabCSS]} aria-hidden>
      <Icon svg={<Icons.AlertTriangleFilled />} />
    </div>
  );
}
