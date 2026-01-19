import { parse } from "csv-parse/sync";

type CsvRow = Record<string, string>;

type ParseResult = {
  rows: CsvRow[];
  errors: string[];
};

export const parseCsv = (content: string, requiredHeaders: string[]): ParseResult => {
  const errors: string[] = [];
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  if (records.length === 0) {
    return { rows: [], errors: ["CSV has no rows."] };
  }

  const headers = Object.keys(records[0] ?? {});
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      errors.push(`Missing required header: ${required}`);
    }
  }

  return { rows: records, errors };
};