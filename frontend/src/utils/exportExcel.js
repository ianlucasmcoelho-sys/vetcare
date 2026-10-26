const escapeXml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const toCell = (value) => {
  const isNumber = typeof value === "number" && Number.isFinite(value);
  return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`;
};

export function exportExcel({ fileName, sheetName, columns, rows }) {
  const worksheetName = escapeXml(sheetName.slice(0, 31));
  const tableRows = [columns, ...rows].map(row =>
    `<Row>${row.map(toCell).join("")}</Row>`
  ).join("");
  const workbook = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${worksheetName}"><Table>${tableRows}</Table></Worksheet></Workbook>`;
  const blob = new Blob(["\uFEFF", workbook], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
