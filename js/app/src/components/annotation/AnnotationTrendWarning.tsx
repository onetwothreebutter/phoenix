import { css } from "@emotion/react";

import { Badge, Icon, Icons } from "@phoenix/components";

/**
 * Stretches a warning Badge into a full-height tab so it shares the badge's
 * theme-aware warning colors. Only the edge facing the chart keeps a border;
 * the panel provides the rest of the frame.
 */
const trendWarningTabCSS = css`
  display: flex;
  justify-content: center;
  width: var(--global-dimension-size-600);
  border-width: 0 0 0 1px;
  border-radius: 0;
`;

const trendWarningTabIconCSS = css`
  font-size: var(--global-dimension-size-300);
`;

/**
 * A badge telling the reader that an annotation has moved in the wrong
 * direction for its optimization direction over the visible time range.
 */
export function AnnotationTrendWarningPill() {
  return (
    <Badge variant="warning">
      <Icon svg={<Icons.AlertTriangleFilled />} />
      Trending worse
    </Badge>
  );
}

/**
 * A full-height tab for the edge of a chart panel that repeats the trend
 * warning, so worsening charts stand out when scanning a grid of panels.
 * Decorative: the pill carries the message.
 */
export function AnnotationTrendWarningTab() {
  return (
    <Badge variant="warning" css={trendWarningTabCSS} aria-hidden>
      <Icon svg={<Icons.AlertTriangleFilled />} css={trendWarningTabIconCSS} />
    </Badge>
  );
}
