import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { 
  Transaction, 
  Category, 
  TaxProfile, 
  TaxDocument,
  TaxCalculationResult 
} from '@/types';
import { Section40Type } from '@/types';

export interface CSVExportOptions {
  includeHeaders?: boolean;
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  currencyFormat?: 'THB' | 'USD';
  encoding?: 'UTF-8' | 'UTF-8-BOM'; // BOM for Excel Thai support
}

const DEFAULT_CSV_OPTIONS: CSVExportOptions = {
  includeHeaders: true,
  dateFormat: 'DD/MM/YYYY',
  currencyFormat: 'THB',
  encoding: 'UTF-8-BOM', // Use BOM for Thai character support in Excel
};

export async function exportTransactionsToCSV(
  transactions: Array<Transaction & { category?: Category }>,
  filename: string,
  options: CSVExportOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  
  // CSV Headers (Thai + English)
  const headers = [
    'Date (วันที่)',
    'Type (ประเภท)',
    'Category (หมวดหมู่)',
    'Description (รายละเอียด)',
    'Amount (จำนวนเงิน)',
    'Section 40',
    'Tax Deductible',
    'Deductible Amount',
    'Withholding Tax',
    'Receipt',
  ];
  
  // Build CSV rows
  const rows = transactions.map(tx => {
    const date = formatDate(tx.transactionDate, opts.dateFormat!);
    const type = tx.type === 'income' ? 'Income (รายรับ)' : 'Expense (รายจ่าย)';
    const category = tx.category?.nameTh 
      ? `${tx.category.name} (${tx.category.nameTh})` 
      : tx.category?.name || 'Uncategorized';
    const section40 = tx.section40Type ? getSection40Label(tx.section40Type) : '';
    
    return [
      date,
      type,
      category,
      tx.description || '',
      tx.amount.toFixed(2),
      section40,
      tx.isTaxDeductible ? 'Yes' : 'No',
      tx.deductibleAmount?.toFixed(2) || '0.00',
      // @ts-ignore - withholdingTax might be added to schema
      tx.withholdingTax?.toFixed(2) || '0.00',
      tx.receiptImageUri ? 'Yes' : 'No',
    ];
  });
  
  // Build CSV content
  let csvContent = '';
  
  // Add BOM for UTF-8 (helps Excel display Thai correctly)
  if (opts.encoding === 'UTF-8-BOM') {
    csvContent += '\uFEFF';
  }
  
  if (opts.includeHeaders) {
    csvContent += headers.join(',') + '\n';
  }
  
  // Escape values and add rows
  for (const row of rows) {
    const escapedRow = row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(cell).replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    });
    csvContent += escapedRow.join(',') + '\n';
  }
  
  // Save to file
  const filePath = `${FileSystem.documentDirectory}${filename}.csv`;
  await FileSystem.writeAsStringAsync(filePath, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
  return filePath;
}

export async function exportTaxSummaryToCSV(
  taxYear: number,
  taxResult: TaxCalculationResult,
  taxProfile: TaxProfile,
  filename: string
): Promise<string> {
  const headers = ['Item (รายการ)', 'Amount (จำนวนเงิน)'];
  
  const rows: string[][] = [
    ['Tax Year (ปีภาษี)', taxYear.toString()],
    ['', ''],
    ['=== INCOME (รายได้) ===', ''],
    ['Gross Income (รายได้รวม)', taxResult.totalGrossIncome.toFixed(2)],
    ['Expense Deduction (ค่าใช้จ่ายส่วนตัว)', taxResult.totalExpenseDeduction.toFixed(2)],
    ['Net Income (เงินได้สุทธิ)', taxResult.netIncome.toFixed(2)],
    ['', ''],
    ['=== DEDUCTIONS (ค่าลดหย่อน) ===', ''],
    ['Personal Allowance (ค่าลดหย่อนส่วนตัว)', taxProfile.personalAllowance.toFixed(2)],
    ['Spouse Allowance (ค่าลดหย่อนคู่สมรส)', taxProfile.spouseAllowance.toFixed(2)],
    ['Child Allowance (ค่าลดหย่อนบุตร)', taxProfile.childAllowance.toFixed(2)],
    ['Parent Allowance (ค่าลดหย่อนบิดา-มารดา)', taxProfile.parentAllowance.toFixed(2)],
    ['Disability Allowance (ค่าลดหย่อนผู้พิการ)', taxProfile.disabilityAllowance.toFixed(2)],
    ['Total Allowances (ค่าลดหย่อนรวม)', taxResult.totalAllowances.toFixed(2)],
    ['', ''],
    ['=== INVESTMENTS & INSURANCE (การลงทุนและประกัน) ===', ''],
    ['Life Insurance (ประกันชีวิต)', taxProfile.lifeInsurance.toFixed(2)],
    ['Health Insurance (ประกันสุขภาพ)', taxProfile.healthInsurance.toFixed(2)],
    ['Pension Insurance (ประกันบำเหน็จบำนาญ)', taxProfile.pensionInsurance.toFixed(2)],
    ['RMF (กองทุนรวมเพื่อการเลี้ยงชีพ)', taxProfile.rmf.toFixed(2)],
    ['SSF (กองทุนรวมเพื่อการออม)', taxProfile.ssf.toFixed(2)],
    ['Social Security (ประกันสังคม)', taxProfile.socialSecurity.toFixed(2)],
    ['Home Loan Interest (ดอกเบี้ยเงินกู้บ้าน)', taxProfile.homeLoanInterest.toFixed(2)],
    ['Donation (เงินบริจาค)', taxProfile.donation.toFixed(2)],
    ['Total Investment Deductions (ลดหย่อนการลงทุนรวม)', taxResult.totalInvestments.toFixed(2)],
    ['', ''],
    ['=== TAX CALCULATION (การคำนวณภาษี) ===', ''],
    ['Taxable Income (เงินได้พึงประเมิน)', taxResult.taxableIncome.toFixed(2)],
    ['Tax (Progressive Method) (ภาษีแบบขั้นบันได)', taxResult.taxByProgressiveMethod.toFixed(2)],
    ['Tax (Alternative Method) (ภาษีแบบอัตราร้อยละ 0.5)', taxResult.taxByAlternativeMethod.toFixed(2)],
    ['Final Tax Due (ภาษีที่ต้องชำระ)', taxResult.finalTaxDue.toFixed(2)],
    ['Withholding Tax Credit (ภาษีหัก ณ ที่จ่าย)', taxResult.withholdingTaxCredit.toFixed(2)],
    ['Tax Payable / Refund (ชำระเพิ่ม/คืน)', taxResult.taxPayableOrRefund.toFixed(2)],
    ['Effective Tax Rate (อัตราภาษีมีประสิทธิ)', `${(taxResult.effectiveTaxRate * 100).toFixed(2)}%`],
  ];
  
  // Build CSV content
  let csvContent = '\uFEFF'; // BOM for Thai support
  csvContent += headers.join(',') + '\n';
  
  for (const row of rows) {
    const escapedRow = row.map(cell => {
      const escaped = String(cell).replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('\n')) {
        return `"${escaped}"`;
      }
      return escaped;
    });
    csvContent += escapedRow.join(',') + '\n';
  }
  
  const filePath = `${FileSystem.documentDirectory}${filename}.csv`;
  await FileSystem.writeAsStringAsync(filePath, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
  return filePath;
}

export interface PDFReportOptions {
  title?: string;
  subtitle?: string;
  includeCharts?: boolean;
  language?: 'th' | 'en' | 'both';
}

export interface TaxReportData {
  taxYear: number;
  taxResult: TaxCalculationResult;
  taxProfile: TaxProfile;
  transactions: Transaction[];
  documents: TaxDocument[];
  generatedAt: Date;
}

export function generateTaxReportHTML(data: TaxReportData, options: PDFReportOptions = {}): string {
  const opts = {
    title: 'Tax Report',
    subtitle: `Tax Year ${data.taxYear}`,
    language: 'both',
    ...options,
  };
  
  const formatAmount = (amount: number) => amount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const formatDate = (date: Date) => date.toLocaleDateString('th-TH');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Sarabun', 'Arial', sans-serif; margin: 40px; color: #333; }
    h1 { color: #0F766E; border-bottom: 3px solid #0F766E; padding-bottom: 10px; }
    h2 { color: #0369A1; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    h3 { color: #555; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .amount { text-align: right; font-family: monospace; }
    .total { font-weight: bold; background-color: #f0fdfa; }
    .highlight { background-color: #fef3c7; }
    .header { background-color: #0F766E; color: white; padding: 20px; margin: -40px -40px 30px -40px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .two-col { display: flex; justify-content: space-between; }
    .section { margin-bottom: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="color: white; border: none; margin: 0;">${opts.title}</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">${opts.subtitle}</p>
  </div>
  
  <div class="section">
    <h2>Tax Summary / สรุปภาษี</h2>
    <table>
      <tr>
        <th>Item / รายการ</th>
        <th class="amount">Amount (THB) / จำนวนเงิน</th>
      </tr>
      <tr>
        <td>Gross Income / รายได้รวม</td>
        <td class="amount">${formatAmount(data.taxResult.totalGrossIncome)}</td>
      </tr>
      <tr>
        <td>Expense Deduction / ค่าใช้จ่ายส่วนตัว</td>
        <td class="amount">-${formatAmount(data.taxResult.totalExpenseDeduction)}</td>
      </tr>
      <tr>
        <td>Net Income / เงินได้สุทธิ</td>
        <td class="amount">${formatAmount(data.taxResult.netIncome)}</td>
      </tr>
      <tr>
        <td>Total Allowances & Deductions / ค่าลดหย่อนรวม</td>
        <td class="amount">-${formatAmount(data.taxResult.totalAllowances + data.taxResult.totalInvestments)}</td>
      </tr>
      <tr class="total">
        <td>Taxable Income / เงินได้พึงประเมิน</td>
        <td class="amount">${formatAmount(data.taxResult.taxableIncome)}</td>
      </tr>
      <tr class="highlight">
        <td><strong>Final Tax Due / ภาษีที่ต้องชำระ</strong></td>
        <td class="amount"><strong>${formatAmount(data.taxResult.finalTaxDue)}</strong></td>
      </tr>
      <tr>
        <td>Withholding Tax Credit / ภาษีหัก ณ ที่จ่าย</td>
        <td class="amount">-${formatAmount(data.taxResult.withholdingTaxCredit)}</td>
      </tr>
      <tr class="${data.taxResult.taxPayableOrRefund >= 0 ? 'highlight' : ''}">
        <td><strong>${data.taxResult.taxPayableOrRefund >= 0 ? 'Tax Payable / ชำระเพิ่ม' : 'Tax Refund / ขอคืน'}</strong></td>
        <td class="amount"><strong>${formatAmount(Math.abs(data.taxResult.taxPayableOrRefund))}</strong></td>
      </tr>
    </table>
  </div>
  
  <div class="section">
    <h2>Income Breakdown / รายได้ตามประเภท</h2>
    <table>
      <tr>
        <th>Section 40 Type / ประเภทเงินได้</th>
        <th class="amount">Amount / จำนวน</th>
      </tr>
      ${Object.entries(data.taxResult.incomeBySection40)
        .filter(([_, amount]) => amount > 0)
        .map(([type, amount]) => `
          <tr>
            <td>${getSection40Label(Number(type))}</td>
            <td class="amount">${formatAmount(amount)}</td>
          </tr>
        `).join('')}
    </table>
  </div>
  
  <div class="section">
    <h2>Deductions & Allowances / ค่าลดหย่อน</h2>
    <table>
      <tr>
        <th>Item / รายการ</th>
        <th class="amount">Amount / จำนวน</th>
      </tr>
      <tr><td>Personal Allowance / ค่าลดหย่อนส่วนตัว</td><td class="amount">${formatAmount(data.taxProfile.personalAllowance)}</td></tr>
      <tr><td>Spouse Allowance / ค่าลดหย่อนคู่สมรส</td><td class="amount">${formatAmount(data.taxProfile.spouseAllowance)}</td></tr>
      <tr><td>Child Allowance / ค่าลดหย่อนบุตร</td><td class="amount">${formatAmount(data.taxProfile.childAllowance)}</td></tr>
      <tr><td>Parent Allowance / ค่าลดหย่อนบิดา-มารดา</td><td class="amount">${formatAmount(data.taxProfile.parentAllowance)}</td></tr>
      <tr><td>Life Insurance / ประกันชีวิต</td><td class="amount">${formatAmount(data.taxProfile.lifeInsurance)}</td></tr>
      <tr><td>Health Insurance / ประกันสุขภาพ</td><td class="amount">${formatAmount(data.taxProfile.healthInsurance)}</td></tr>
      <tr><td>RMF / กองทุนรวมเพื่อการเลี้ยงชีพ</td><td class="amount">${formatAmount(data.taxProfile.rmf)}</td></tr>
      <tr><td>SSF / กองทุนรวมเพื่อการออม</td><td class="amount">${formatAmount(data.taxProfile.ssf)}</td></tr>
      <tr><td>Social Security / ประกันสังคม</td><td class="amount">${formatAmount(data.taxProfile.socialSecurity)}</td></tr>
      <tr><td>Home Loan Interest / ดอกเบี้ยเงินกู้บ้าน</td><td class="amount">${formatAmount(data.taxProfile.homeLoanInterest)}</td></tr>
      <tr><td>Donation / เงินบริจาค</td><td class="amount">${formatAmount(data.taxProfile.donation)}</td></tr>
    </table>
  </div>
  
  <div class="section">
    <h2>Tax Documents / เอกสารภาษี</h2>
    <table>
      <tr>
        <th>Document / เอกสาร</th>
        <th>Type / ประเภท</th>
        <th class="amount">Amount / จำนวน</th>
      </tr>
      ${data.documents.map(doc => `
        <tr>
          <td>${doc.name}</td>
          <td>${doc.documentType}</td>
          <td class="amount">${doc.amount ? formatAmount(doc.amount) : '-'}</td>
        </tr>
      `).join('') || '<tr><td colspan="3" style="text-align: center;">No documents / ไม่มีเอกสาร</td></tr>'}
    </table>
  </div>
  
  <div class="footer">
    <p><strong>Report Generated / สร้างรายงาน:</strong> ${formatDate(data.generatedAt)}</p>
    <p><strong>Taxify</strong> - Thai Personal Income Tax Calculator</p>
    <p style="font-size: 10px; color: #999;">
      This report is generated for reference only. Please verify all calculations with a certified accountant or the Revenue Department.
      <br>
      รายงานนี้จัดทำขึ้นเพื่ออ้างอิงเท่านั้น กรุณาตรวจสอบข้อมูลกับนักบัญชีหรือกรมสรรพากร
    </p>
  </div>
</body>
</html>
  `;
}

function formatDate(
  date: Date, 
  format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

function getSection40Label(type: Section40Type): string {
  const labels: Record<Section40Type, string> = {
    [Section40Type.SALARY]: '40(1) Salary / เงินเดือน',
    [Section40Type.SERVICE]: '40(2) Service / ค่าจ้าง',
    [Section40Type.INTELLECTUAL]: '40(3) IP / ลิขสิทธิ์',
    [Section40Type.PASSIVE]: '40(4) Passive / ดอกเบี้ย',
    [Section40Type.RENTAL]: '40(5) Rental / ค่าเช่า',
    [Section40Type.PROFESSIONAL]: '40(6) Professional / วิชาชีพอิสระ',
    [Section40Type.CONTRACT]: '40(7) Contract / รับเหมา',
    [Section40Type.BUSINESS]: '40(8) Business / ธุรกิจ',
  };
  return labels[type] || `40(${type})`;
}

export async function shareFile(filePath: string, mimeType: string = 'text/csv'): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }
  
  await Sharing.shareAsync(filePath, {
    mimeType,
    dialogTitle: 'Share Tax Report',
  });
}

export async function saveFileToDownloads(filePath: string, filename: string): Promise<string> {
  // On Android, copy to Downloads folder
  if (Platform.OS === 'android') {
    const downloadsPath = `${FileSystem.documentDirectory}../Download/${filename}`;
    await FileSystem.copyAsync({
      from: filePath,
      to: downloadsPath,
    });
    return downloadsPath;
  }
  
  // On iOS, just return the document directory path
  // User can use Files app to access
  return filePath;
}

export class ExportService {
  static async exportTransactions(
    transactions: Array<Transaction & { category?: Category }>,
    taxYear: number
  ): Promise<string> {
    const filename = `taxify_transactions_${taxYear}`;
    const filePath = await exportTransactionsToCSV(transactions, filename);
    await shareFile(filePath, 'text/csv');
    return filePath;
  }
  
  static async exportTaxReport(
    data: TaxReportData
  ): Promise<string> {
    const filename = `taxify_report_${data.taxYear}`;
    const filePath = await exportTaxSummaryToCSV(
      data.taxYear,
      data.taxResult,
      data.taxProfile,
      filename
    );
    await shareFile(filePath, 'text/csv');
    return filePath;
  }
  
  static async generateHTMLReport(data: TaxReportData): Promise<string> {
    return generateTaxReportHTML(data);
  }
}

export default ExportService;
