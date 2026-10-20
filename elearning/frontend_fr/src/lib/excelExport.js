/**
 * Utility untuk mengekspor data ke Microsoft Excel (.xls / SpreadsheetML XML)
 * Menghasilkan file Excel valid tanpa dependensi npm tambahan,
 * lengkap dengan header styling resmi SMP Negeri 1 Prambon, border, dan auto formatting.
 */

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportToExcelXml({
  filename = 'Export_Spenspra.xls',
  sheetName = 'Sheet1',
  title = 'LAPORAN AKADEMIK SMP NEGERI 1 PRAMBON',
  subtitle = '',
  metadata = [],
  headers = [],
  rows = [],
}) {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#193D9B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#475569"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#334155"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="MetaVal">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E40AF" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>
  <Style ss:ID="TableCell">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="TableCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="TableCellNumber">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0.0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="TableCellInteger">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>`;

  let xmlBody = '';

  // Title
  if (title) {
    xmlBody += `
   <Row ss:Height="24">
    <Cell ss:StyleID="Title"><Data ss:Type="String">${escapeXml(title)}</Data></Cell>
   </Row>`;
  }

  // Subtitle
  if (subtitle) {
    xmlBody += `
   <Row ss:Height="18">
    <Cell ss:StyleID="Subtitle"><Data ss:Type="String">${escapeXml(subtitle)}</Data></Cell>
   </Row>`;
  }

  // Metadata block
  if (metadata.length > 0) {
    metadata.forEach((m) => {
      xmlBody += `
   <Row ss:Height="16">
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">${escapeXml(m.label)}:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(m.value)}</Data></Cell>
   </Row>`;
    });
    xmlBody += `
   <Row ss:Height="8"><Cell/></Row>`;
  }

  // Headers
  if (headers.length > 0) {
    xmlBody += `
   <Row ss:Height="26">`;
    headers.forEach((h) => {
      xmlBody += `
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
    });
    xmlBody += `
   </Row>`;
  }

  // Rows
  rows.forEach((row) => {
    xmlBody += `
   <Row ss:Height="20">`;
    row.forEach((cell) => {
      if (typeof cell === 'number') {
        const isFloat = !Number.isInteger(cell);
        const styleId = isFloat ? 'TableCellNumber' : 'TableCellInteger';
        xmlBody += `
    <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${cell}</Data></Cell>`;
      } else {
        const str = cell === null || cell === undefined ? '' : String(cell);
        const isCenter = str.length <= 4 || str === '-' || /^[0-9A-Za-z]{1,3}$/.test(str);
        const styleId = isCenter ? 'TableCellCenter' : 'TableCell';
        xmlBody += `
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(str)}</Data></Cell>`;
      }
    });
    xmlBody += `
   </Row>`;
  });

  const xmlFooter = `
  </Table>
 </Worksheet>
</Workbook>`;

  const fullXml = xmlHeader + xmlBody + xmlFooter;

  const blob = new Blob([fullXml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
