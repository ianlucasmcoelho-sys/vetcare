import React from 'react';
import './SkeletonCard.css';

export const SkeletonCard = ({ count = 1, type = 'default' }) => {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className={`skeleton-card skeleton-${type}`}>
          <div className="skeleton-avatar"></div>
          <div className="skeleton-content">
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
            <div className="skeleton-line small"></div>
          </div>
        </div>
      ))}
    </>
  );
};

export const SkeletonTable = ({ rows = 5 }) => {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="skeleton-table-row">
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
        </div>
      ))}
    </div>
  );
};