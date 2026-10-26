import { useEffect, useState } from 'react';
import { asset } from './assets';

// Parses CSV text into an array of rows (arrays of trimmed strings).
// Handles quoted fields with commas, "" escapes, CRLF and a leading BOM.
// The header row is dropped; blank lines are skipped.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field.trim());
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  row.push(field.trim());
  rows.push(row);

  return rows.slice(1).filter((r) => r.some((cell) => cell !== ''));
}

// Loads a CSV from public/assets at runtime, so editing the file is all it takes to update a table.
export function useCsv(path) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(asset(path))
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} loading ${path}`);
        return res.text();
      })
      .then((text) => !cancelled && setRows(parseCsv(text)))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { rows, error };
}
