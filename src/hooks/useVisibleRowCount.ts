import { useState } from "react";

export const DEFAULT_ROW_PAGE_SIZE = 50;

export function nextVisibleRowCount(current: number, total: number, pageSize = DEFAULT_ROW_PAGE_SIZE) {
  return Math.min(current + pageSize, total);
}

// Long lists render one page at a time. The demo tenant has 2,200 documents, and rendering them all
// produced about 51,000 DOM nodes and 5.7 MB of HTML on /documents. A real tenant with a large
// library would hit the same cost, so this is not demo-only.
export function useVisibleRowCount(total: number, pageSize = DEFAULT_ROW_PAGE_SIZE) {
  const [visible, setVisible] = useState(pageSize);
  const shown = Math.min(visible, total);
  return {
    shown,
    remaining: total - shown,
    showMore: () => setVisible((current) => nextVisibleRowCount(current, total, pageSize)),
  };
}
