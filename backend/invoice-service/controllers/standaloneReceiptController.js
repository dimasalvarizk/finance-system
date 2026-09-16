import {
  createStandaloneReceiptDB,
  getAllStandaloneReceiptsDB,
  getStandaloneReceiptByIdDB,
  deleteStandaloneReceiptDB
} from '../models/standaloneReceiptModel.js';
import { amountToEnglishWords } from '../utils/numberToWordsEnglish.js';

// Format standalone receipt record into complete ReceiptData object for UI / PDF
const formatStandaloneReceiptResponse = (receipt) => {
  if (!receipt) return null;

  const numAmt = parseFloat(receipt.amount) || 0;
  const currency = (receipt.currency || 'SAR').toUpperCase();

  return {
    isStandalone: true,
    id: receipt.id,
    paymentId: receipt.id,
    receiptNo: receipt.receiptNo,
    sequence: 1,
    invoiceNo: receipt.referenceNo || receipt.receiptNo,
    referenceNo: receipt.referenceNo || '-',
    serialNo: receipt.groupNumber ? `GRP-${receipt.groupNumber}` : '-',
    groupNumber: receipt.groupNumber || null,
    confirmationDate: receipt.paymentDate,
    dateOfPayment: receipt.paymentDate,
    receivedFrom: {
      company: receipt.companyName || 'Valued Client',
      companyCode: receipt.companyCode || '-',
      address: receipt.payerAddress || '-',
      taxNumber: receipt.payerTaxNumber || '-',
      email: receipt.payerEmail || '-',
      agent: receipt.payerAgent || '-'
    },
    amountReceived: {
      numeric: numAmt,
      currency: currency,
      amountInWords: amountToEnglishWords(numAmt, currency),
      exchangeRate: parseFloat(receipt.exchangeRate) || 1.0,
      baseCurrency: currency
    },
    forPaymentOf: receipt.forPaymentOf || 'Advance Deposit / Ground Operations',
    bankDetails: {
      // Receiving Bank (Our Company)
      ourBank: {
        bankName: receipt.ourBankName || 'PT Bank Negara Indonesia (Persero) Tbk',
        accountName: receipt.ourAccountName || 'PT ODST AIRLINES INDO',
        accountNumber: receipt.ourAccountNumber || '-',
        branchAddress: receipt.ourBankBranch || '-',
        swiftCode: receipt.ourSwiftCode || 'BNINIDJA'
      },
      // Sending Bank (Payer / Client Company)
      payerBank: {
        bankName: receipt.payerBankName || '-',
        accountName: receipt.payerAccountName || '-',
        accountNumber: receipt.payerAccountNumber || '-'
      }
    },
    ledgerSummary: {
      totalConfirmationAmount: numAmt,
      advancePayment: numAmt,
      paymentAmountInThisReceipt: numAmt,
      totalPaidToDate: numAmt,
      remainingBalance: 0,
      currency: currency
    },
    paymentDetails: {
      paymentDate: receipt.paymentDate,
      paymentMethod: receipt.paymentMethod || 'Bank Transfer',
      note: receipt.note || '',
      proofUrl: receipt.proofUrl || null,
      createdBy: receipt.createdBy || 'Finance Operator',
      createdAt: receipt.createdAt
    },
    issuedBy: receipt.createdBy || 'Finance Department',
    issuedAt: receipt.createdAt
  };
};

// @desc    Create standalone deposit receipt
// @route   POST /api/invoices/standalone-receipts
// @access  Protected
export const createStandaloneReceipt = async (req, res, next) => {
  try {
    const {
      companyName,
      companyCode,
      payerAddress,
      payerTaxNumber,
      payerEmail,
      payerAgent,
      payerBankName,
      payerAccountName,
      payerAccountNumber,
      ourBankName,
      ourAccountName,
      ourAccountNumber,
      ourBankBranch,
      ourSwiftCode,
      amount,
      currency,
      exchangeRate,
      paymentDate,
      paymentMethod,
      forPaymentOf,
      referenceNo,
      groupNumber,
      proofUrl,
      note
    } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid deposit amount greater than 0'
      });
    }

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide payer / company name'
      });
    }

    const receiptData = {
      companyName: companyName.trim(),
      companyCode: companyCode ? companyCode.trim() : null,
      payerAddress: payerAddress || null,
      payerTaxNumber: payerTaxNumber || null,
      payerEmail: payerEmail || null,
      payerAgent: payerAgent || null,
      payerBankName: payerBankName || null,
      payerAccountName: payerAccountName || null,
      payerAccountNumber: payerAccountNumber || null,
      ourBankName: ourBankName || 'PT Bank Negara Indonesia (Persero) Tbk',
      ourAccountName: ourAccountName || 'PT ODST AIRLINES INDO',
      ourAccountNumber: ourAccountNumber || null,
      ourBankBranch: ourBankBranch || null,
      ourSwiftCode: ourSwiftCode || null,
      amount: parseFloat(amount),
      currency: (currency || 'SAR').toUpperCase(),
      exchangeRate: parseFloat(exchangeRate) || 1.0,
      paymentDate: paymentDate || new Date().toISOString(),
      paymentMethod: paymentMethod || 'Bank Transfer',
      forPaymentOf: forPaymentOf || 'Advance Deposit Payment',
      referenceNo: referenceNo || null,
      groupNumber: groupNumber || null,
      proofUrl: proofUrl || null,
      note: note || null,
      createdBy: req.user ? req.user.name : 'Finance Admin'
    };

    const saved = await createStandaloneReceiptDB(receiptData);
    const formatted = formatStandaloneReceiptResponse(saved);

    res.status(201).json({
      success: true,
      message: 'Standalone deposit receipt created successfully',
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all standalone deposit receipts
// @route   GET /api/invoices/standalone-receipts
// @access  Protected
export const getStandaloneReceipts = async (req, res, next) => {
  try {
    const rawList = await getAllStandaloneReceiptsDB();
    const formattedList = rawList.map(formatStandaloneReceiptResponse);

    res.status(200).json({
      success: true,
      count: formattedList.length,
      data: formattedList
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get standalone receipt by ID or Receipt Number
// @route   GET /api/invoices/standalone-receipts/:id
// @access  Protected
export const getStandaloneReceiptById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const raw = await getStandaloneReceiptByIdDB(id);

    if (!raw) {
      return res.status(404).json({
        success: false,
        message: `Standalone receipt '${id}' not found.`
      });
    }

    const formatted = formatStandaloneReceiptResponse(raw);
    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete standalone receipt
// @route   DELETE /api/invoices/standalone-receipts/:id
// @access  Protected (Super Admin / Chief Accountant / Division Director only)
export const deleteStandaloneReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteStandaloneReceiptDB(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Receipt '${id}' not found or already deleted.`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
