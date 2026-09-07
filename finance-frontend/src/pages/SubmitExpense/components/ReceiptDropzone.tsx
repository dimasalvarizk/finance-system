import React from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, FileText, Trash2 } from 'lucide-react';
import type { UploadedReceiptItem } from '../types';

interface ReceiptDropzoneProps {
  receiptFiles: UploadedReceiptItem[];
  isDragging: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (id: string, e: React.MouseEvent) => void;
}

export const ReceiptDropzone: React.FC<ReceiptDropzoneProps> = ({
  receiptFiles,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  onRemoveFile
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[12.5px] font-bold text-slate-800">
          {t('expenses.receipt') || 'Proof of Expense / Receipts'}
        </label>
        <span className="text-[11px] font-medium text-slate-400">
          {t('submitExpense.dropzoneHint') || 'Multiple files supported (PDF, PNG, JPG up to 10MB each)'}
        </span>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer relative ${
          isDragging
            ? 'border-blue-500 bg-blue-50/60'
            : 'border-slate-200/90 hover:border-slate-300 bg-slate-50/50'
        }`}
      >
        <input
          type="file"
          id="receipt-upload"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={onFileInputChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />

        <div className="flex flex-col items-center justify-center space-y-2.5 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[13px] font-bold text-slate-800">
              {t('submitExpense.dropzoneTitle') || 'Drag & drop one or multiple receipts here, or browse files'}
            </p>
            <p className="text-[11.5px] text-slate-400 font-medium">
              Tax invoices, cashier receipts, credit card slips, or tickets
            </p>
          </div>
        </div>
      </div>

      {/* List of Uploaded Files */}
      {receiptFiles.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Uploaded Receipts ({receiptFiles.length} file{receiptFiles.length > 1 ? 's' : ''})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {receiptFiles.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between space-x-3 group hover:border-slate-300 transition-all"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt="Receipt thumbnail"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[10.5px] text-slate-400 font-medium">
                      {(item.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => onRemoveFile(item.id, e)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                  title="Remove receipt"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
