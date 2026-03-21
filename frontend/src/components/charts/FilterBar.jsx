import React from "react";

function FilterBar({
  filters,
  values,
  onChange,
  onRefresh,
}) {
  return (
    <div className="analytics-filter-bar">
      {filters.map((filter) => (
        <div key={filter.key} className="analytics-filter-item">
          <label htmlFor={`filter-${filter.key}`}>{filter.label}</label>
          <select
            id={`filter-${filter.key}`}
            value={values[filter.key] || "all"}
            onChange={(e) => onChange(filter.key, e.target.value)}
          >
            {(filter.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      <button type="button" className="btn btn-outline" onClick={onRefresh}>
        <i className="fa fa-rotate-right" style={{ marginRight: 6 }}></i>
        Refresh
      </button>
    </div>
  );
}

export default React.memo(FilterBar);
