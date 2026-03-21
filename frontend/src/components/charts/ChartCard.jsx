import React from "react";

function ChartCard({ title, subtitle, loading, hasData = true, actions, children }) {
  return (
    <div className="card analytics-chart-card">
      <div className="analytics-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="analytics-card-actions">{actions}</div> : null}
      </div>

      {loading ? (
        <div className="chart-skeleton" aria-label="Loading chart">
          <div className="chart-skeleton-bar" />
          <div className="chart-skeleton-bar short" />
          <div className="chart-skeleton-bar" />
        </div>
      ) : !hasData ? (
        <div className="chart-empty">No Data Available</div>
      ) : (
        <div className="analytics-chart-body">{children}</div>
      )}
    </div>
  );
}

export default React.memo(ChartCard);
