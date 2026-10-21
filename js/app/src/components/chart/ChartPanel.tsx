import { css } from "@emotion/react";
import React, { Suspense } from "react";

import type { HeadingProps } from "@phoenix/components";
import { Heading, Text } from "@phoenix/components";
import { ErrorBoundary } from "@phoenix/components/exception";

import { ChartSkeleton } from "./ChartSkeleton";

const DEFAULT_CHART_HEIGHT = 190;

/**
 * The narrowest a chart panel gets. Below this the x axis thins out to a tick
 * or two, the legend crowds the plot, and the title is mostly ellipsis — the
 * chart stops carrying any reading. Layouts that place charts side by side
 * scroll horizontally at this width instead of shrinking them further, so a
 * chart is the same usable size at every window width.
 */
export const CHART_MIN_WIDTH = 400;

/**
 * Below this panel height the subtitle is dropped so the chart keeps the
 * space; the title alone still identifies the chart.
 */
const COMPACT_HEIGHT_BREAKPOINT = "200px";

const chartPanelCSS = css`
  display: flex;
  flex-direction: column;
  /* Keep the border inside the size the layout gives the panel, so a scrolling
     parent has nothing to clip and side-by-side panels add no stray overflow */
  box-sizing: border-box;
  height: 100%;
  width: 100%;
  min-width: ${CHART_MIN_WIDTH}px;
  --chart-panel-tooltip-z-index: 1;
  border: var(--global-border-size-thin) solid var(--chart-panel-border-color);
  border-radius: var(--global-rounding-medium);
  background-color: var(--chart-panel-background-color);

  &:hover,
  &:focus-within {
    /* Lift only the active tooltip above synchronized sibling tooltips. */
    --chart-panel-tooltip-z-index: 2;
  }

  .chart-panel__header {
    flex: none;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: var(--global-dimension-size-100);
    min-width: 0;
    padding: var(--global-dimension-size-100) var(--global-dimension-size-150) 0
      var(--global-dimension-size-150);
  }

  .chart-panel__header-content {
    display: flex;
    /* Hug the title so a title accessory sits right next to it */
    flex: 0 1 auto;
    flex-direction: column;
    min-width: 0;
  }

  .chart-panel__title-accessory {
    flex: none;
  }

  .chart-panel__actions {
    flex: none;
    margin-left: auto;
  }

  .chart-panel__title,
  .chart-panel__subtitle {
    display: block;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .chart-panel__title.heading {
    font-size: var(--global-font-size-s);
    line-height: var(--global-line-height-s);
  }

  .chart-panel__chart {
    flex: 1 1 auto;
    min-height: 0;
    /* Share the header's horizontal gutter so the chart's left edge (y-axis
       labels) and right edge line up with the title */
    padding: var(--global-dimension-size-100) var(--global-dimension-size-150);
    /* Let hover UI (e.g. tall chart tooltips) escape the panel
       instead of being clipped at the chart height */
    overflow: visible;
    .recharts-responsive-container,
    .recharts-wrapper {
      overflow: visible !important;
    }
  }
`;

/**
 * With an aside the panel lays out as a row: the header and chart stack in the
 * main column, and the aside runs the full height of the right edge. The plot
 * narrows to make room rather than being covered.
 */
const withAsidePanelCSS = css`
  flex-direction: row;

  .chart-panel__main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
  }

  .chart-panel__aside {
    flex: none;
    align-self: stretch;
    display: flex;
    overflow: hidden;
    border-radius: 0 var(--global-rounding-medium) var(--global-rounding-medium)
      0;
  }
`;

/**
 * In a fill-height context (e.g. a resizable charts strip or panel) the panel's
 * size is imposed by its parent, so it can be a size query container and shed
 * the subtitle as it gets short.
 */
const fillHeightPanelCSS = css`
  container-type: size;

  @container (max-height: ${COMPACT_HEIGHT_BREAKPOINT}) {
    .chart-panel__subtitle {
      display: none;
    }
  }
`;

interface ChartPanelHeaderProps {
  title: string;
  subtitle?: string;
  /**
   * Content shown right after the title, such as a status pill
   */
  titleAccessory?: React.ReactNode;
  actions?: React.ReactNode;
  /**
   * Semantic heading level for the chart title. The visual size remains
   * consistent with the compact chart panel title treatment.
   * @default 4
   */
  headingLevel?: HeadingProps["level"];
}

function ChartPanelHeader({
  title,
  subtitle,
  titleAccessory,
  actions,
  headingLevel = 4,
}: ChartPanelHeaderProps) {
  return (
    <div className="chart-panel__header">
      <div className="chart-panel__header-content">
        <Heading
          level={headingLevel}
          weight="heavy"
          className="chart-panel__title"
          title={title}
        >
          {title}
        </Heading>
        {subtitle && (
          <Text
            size="XS"
            color="gray-600"
            className="chart-panel__subtitle"
            title={subtitle}
          >
            {subtitle}
          </Text>
        )}
      </div>
      {titleAccessory && (
        <div className="chart-panel__title-accessory">{titleAccessory}</div>
      )}
      {actions && <div className="chart-panel__actions">{actions}</div>}
    </div>
  );
}

interface ChartPanelProps extends ChartPanelHeaderProps {
  children: React.ReactNode;
  /**
   * Content running the full height of the panel's right edge, such as a
   * status tab. The chart narrows to make room for it.
   */
  aside?: React.ReactNode;
  /**
   * Stretch the chart area to the panel's available height (e.g. inside a
   * resizable panel) instead of the fixed default height
   */
  fillHeight?: boolean;
}

/**
 * A titled container for a single chart, rendering a header (title + optional
 * subtitle) above a bordered chart surface. The chart is wrapped in an error
 * boundary and suspense boundary so an individual chart can fail or load
 * independently. Used across the project metrics page, the metric charts strip
 * above tables, and the experiments analysis view so charts read consistently
 * wherever they appear.
 */
export function ChartPanel({
  title,
  subtitle,
  titleAccessory,
  actions,
  aside,
  headingLevel,
  fillHeight = false,
  children,
}: ChartPanelProps) {
  const content = (
    <>
      <ChartPanelHeader
        title={title}
        subtitle={subtitle}
        titleAccessory={titleAccessory}
        actions={actions}
        headingLevel={headingLevel}
      />
      <div
        className="chart-panel__chart"
        style={fillHeight ? undefined : { height: DEFAULT_CHART_HEIGHT }}
      >
        <ErrorBoundary>
          <Suspense fallback={<ChartSkeleton />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
  return (
    <section
      css={[
        chartPanelCSS,
        aside != null && withAsidePanelCSS,
        fillHeight && fillHeightPanelCSS,
      ]}
      className="chart-panel"
      data-testid="chart-panel"
    >
      {aside != null ? (
        <>
          <div className="chart-panel__main">{content}</div>
          <div className="chart-panel__aside">{aside}</div>
        </>
      ) : (
        content
      )}
    </section>
  );
}
