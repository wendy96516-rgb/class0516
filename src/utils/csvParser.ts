import { Student } from '../types';

/**
 * Parses raw text or CSV content into a list of Student objects.
 * Intelligently handles:
 * - CSV with or without headers (e.g. 座號, 姓名 / No, Name / 姓名)
 * - Tab/comma/space/newline separated lists
 * - Numbered lines like "1. 林小華", "02, 陳美玲"
 */
export function parseRosterText(rawText: string): { students: Student[]; warnings: string[] } {
  const warnings: string[] = [];
  if (!rawText || !rawText.trim()) {
    return { students: [], warnings: ['輸入內容為空'] };
  }

  // Remove potential UTF-8 BOM
  let text = rawText.replace(/^\uFEFF/, '').trim();
  
  // Split into lines
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) {
    return { students: [], warnings: ['未找到有效資料'] };
  }

  // Check if first line is a header
  const firstLine = rawLines[0].toLowerCase();
  const headerKeywords = ['姓名', '座號', '學號', '學生', 'name', 'student', 'id', 'no', 'seat', 'number'];
  const hasHeader = headerKeywords.some(kw => firstLine.includes(kw));

  const contentLines = hasHeader ? rawLines.slice(1) : rawLines;
  const parsedStudents: Student[] = [];

  contentLines.forEach((line, index) => {
    // If line has comma, tab, or semicolon
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim());
    } else if (line.includes(',')) {
      // Basic CSV parser supporting quotes
      parts = parseCsvLine(line);
    } else if (line.includes(';')) {
      parts = line.split(';').map(p => p.trim());
    } else {
      // Check space or dot separation like "01 張大千" or "1. 李四"
      const matchNumbered = line.match(/^(\d+)[\.\s、,\-]+(.+)$/);
      if (matchNumbered) {
        parts = [matchNumbered[1].trim(), matchNumbered[2].trim()];
      } else {
        parts = [line.trim()];
      }
    }

    parts = parts.filter(Boolean);
    if (parts.length === 0) return;

    let seatNumber: string | undefined = undefined;
    let name: string = '';

    if (parts.length === 1) {
      // Just name, or maybe "1.王小明"
      const single = parts[0];
      const match = single.match(/^(\d+)[\.\s、,\-]+(.+)$/);
      if (match) {
        seatNumber = match[1];
        name = match[2].trim();
      } else {
        name = single.trim();
      }
    } else if (parts.length >= 2) {
      // Typically: part 0 is seat number / id, part 1 is name (or vice versa)
      if (/^\d+$/.test(parts[0])) {
        seatNumber = parts[0];
        name = parts[1];
      } else if (/^\d+$/.test(parts[1])) {
        seatNumber = parts[1];
        name = parts[0];
      } else {
        // Assume [col0, col1] is [Seat/ID, Name]
        name = parts[1] || parts[0];
        seatNumber = parts[0];
      }
    }

    // Strip quotes or trailing brackets
    name = name.replace(/^["']|["']$/g, '').trim();
    if (seatNumber) {
      seatNumber = seatNumber.replace(/^["']|["']$/g, '').trim();
    }

    if (name) {
      parsedStudents.push({
        id: `std_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        seatNumber: seatNumber || String(parsedStudents.length + 1),
        active: true,
      });
    }
  });

  if (parsedStudents.length === 0) {
    warnings.push('未能成功解析學生姓名，請檢查檔案格式或貼上格式。');
  }

  return { students: parsedStudents, warnings };
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}
