/**
 * Export Modal Component
 *
 * Lazy-loaded component that imports jsPDF on demand.
 * This keeps jsPDF out of the main bundle and only loads when needed.
 *
 * The actual PDF export logic is deferred until:
 * 1. Component is mounted
 * 2. User clicks "Export PDF"
 * 3. jsPDF is downloaded and initialized
 *
 * Usage:
 * ```tsx
 * import { lazy, Suspense } from 'react';
 *
 * const ExportModal = lazy(() => import('@/components/ExportModal'));
 *
 * function Dashboard() {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <Button onClick={() => setIsOpen(true)}>Export</Button>
 *       {isOpen && (
 *         <Suspense fallback={<div>Loading export...</div>}>
 *           <ExportModal onClose={() => setIsOpen(false)} data={contratos} />
 *         </Suspense>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */

import React, { useState } from 'react';

interface ExportModalProps {
  data: any[];
  onClose: () => void;
  title?: string;
}

/**
 * Export Modal Component
 *
 * Provides UI for exporting data to PDF.
 * jsPDF is imported dynamically on first render.
 */
export const ExportModal: React.FC<ExportModalProps> = ({
  data,
  onClose,
  title = 'Exportar dados',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Dynamic import: jsPDF only loaded when needed
      const jsPDF = (await import('jspdf')).jsPDF;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      autoTable(doc, {
        head: [Object.keys(data[0] || {})],
        body: data.map((row) => Object.values(row)),
        margin: { top: 20 },
      });

      doc.save('export.pdf');
      onClose();
    } catch (error) {
      console.error('[ExportModal] PDF export failed:', error);
      alert('Falha ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const csv = convertToCSV(data);
      downloadCSV(csv, 'export.csv');
      onClose();
    } catch (error) {
      console.error('[ExportModal] CSV export failed:', error);
      alert('Falha ao exportar CSV');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          {title}
        </h2>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Formato:
          </label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'csv')}
            disabled={isExporting}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={isExporting}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#e5e7eb',
              color: '#1f2937',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Cancelar
          </button>

          <button
            onClick={exportFormat === 'pdf' ? handleExportPDF : handleExportCSV}
            disabled={isExporting}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: isExporting ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            {isExporting ? 'Exportando...' : 'Exportar'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper: Convert data array to CSV format
 */
function convertToCSV(data: any[]): string {
  if (!data.length) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.map((h) => `"${h}"`).join(',');

  const csvRows = data.map((row) =>
    headers.map((h) => {
      const value = row[h];
      if (value === null || value === undefined) return '""';
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Helper: Trigger CSV download
 */
function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default ExportModal;
