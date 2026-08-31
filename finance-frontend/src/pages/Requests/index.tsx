import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import InvoiceDetailsModal from "../../components/ui/InvoiceDetailsModal";
import { type Invoice, getInvoiceDetails, getLocalCompanySettings } from "../Invoices";
import ReservationConfirmationPrint from "../../components/ui/ReservationNumberPrint";
import { Search, AlertCircle, Check, Clock, Lock, FileText, Printer, Download, CreditCard, Edit3, Archive } from "lucide-react";
import { getRequests, approveRequest as approveRequestAPI, rejectRequest as rejectRequestAPI, sendInvoiceEmail, saveRequestNote } from "../../services/requestService";
import { updateInvoiceStatus as updateInvoiceStatusAPI, getCompanies, uploadPaymentProof } from "../../services/invoiceService";
import { useAuth } from "../../context/AuthContext";
import NetworkErrorState from "../../components/ui/NetworkErrorState";
import { getTeamMembers, getCompanySetting } from "../../services/settingService";

export interface InvoiceRequest {
  id?: string;
  reqNo: string;
  invoiceNo: string;
  company: string;
  companyCode: string;
  amount: string;
  requestedBy: string;
  submittedDate: string;
  status: "1/3 Approved" | "2/3 Approved" | "3/3 Approved" | "0/3 Pending" | "0/4 Pending" | "1/4" | "1/4 Approved" | "2/4" | "2/4 Approved" | "3/4" | "3/4 Approved" | "4/4 Approved" | "Approved" | "Awaiting Payment Approval" | "Rejected" | "Cancelled" | "Paid" | "Paid and closed" | "Archived";
  branch?: string;
  rejectionReason?: string;
  level1ApprovedAt?: string | null;
  level2ApprovedAt?: string | null;
  level3ApprovedAt?: string | null;
  level4ApprovedAt?: string | null;
  level1Note?: string | null;
  level2Note?: string | null;
  level3Note?: string | null;
  level4Note?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectedRole?: string | null;
  referenceNo?: string;
  serialNo?: string;
  dueDate?: string;
  usdToIdrRate?: number;
  sarToIdrRate?: number;
  taxRate?: number;
  items?: Array<{
    description: string;
    qty: number;
    price: number;
  }>;
  agent?: string;
  currency?: string;
  paymentAttachment?: string;
}

// Mock requests are not needed since we fetch from database.

// Build a truncated page list, e.g. [1, 2, 3, 'ellipsis', 16]
const getPaginationRange = (current: number, total: number): (number | "ellipsis")[] => {
  const range: (number | "ellipsis")[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) range.push(i);
    return range;
  }

  range.push(1);

  if (current > 3) range.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) range.push(i);

  if (current < total - 2) range.push("ellipsis");

  range.push(total);

  return range;
};

const compareDates = (dateAStr: string, dateBStr: string): boolean => {
  if (!dateAStr || !dateBStr) return false;
  
  const parseYMD = (str: string) => {
    const matchYMD = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matchYMD) {
      return {
        year: parseInt(matchYMD[1], 10),
        month: parseInt(matchYMD[2], 10) - 1,
        day: parseInt(matchYMD[3], 10)
      };
    }
    
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    
    if (str.includes('-') && !str.includes('T') && !str.includes(' ')) {
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        day: d.getUTCDate()
      };
    }
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate()
    };
  };

  const a = parseYMD(dateAStr);
  const b = parseYMD(dateBStr);
  
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
};

const Requests: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const companySettings = getLocalCompanySettings();
  const [allRequests, setAllRequests] = useState<InvoiceRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<InvoiceRequest | null>(null);

  // New states for filters, loading, error, and rejection reason modal
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCompany, setFilterCompany] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [approvalNoteInput, setApprovalNoteInput] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await getRequests();
      if (fetched) {
        setAllRequests(fetched);
      }
      
      const compList = await getCompanies();
      if (compList) {
        localStorage.setItem('finance_companies', JSON.stringify(compList));
      }

      const teamList = await getTeamMembers();
      if (teamList) {
        localStorage.setItem('finance_team_members', JSON.stringify(teamList));
      }

      const companySettings = await getCompanySetting();
      if (companySettings) {
        localStorage.setItem('finance_company_settings', JSON.stringify(companySettings));
      }
    } catch (err) {
      console.error('Failed to load requests, companies, team members, or company settings from API:', err);
      setError("Failed to load requests. Please check backend connection.");
      setAllRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      let currentNote = '';
      if (selectedRequest.status === '0/4 Pending' || selectedRequest.status === '0/3 Pending') {
        currentNote = selectedRequest.level1Note || '';
      } else if (selectedRequest.status === '1/4' || selectedRequest.status === '1/4 Approved' || selectedRequest.status === '1/3 Approved') {
        currentNote = selectedRequest.level2Note || '';
      } else if (selectedRequest.status === '2/4' || selectedRequest.status === '2/4 Approved' || selectedRequest.status === '2/3 Approved') {
        currentNote = selectedRequest.level3Note || '';
      } else if (selectedRequest.status === '3/4' || selectedRequest.status === '3/4 Approved') {
        currentNote = selectedRequest.level4Note || '';
      }
      setApprovalNoteInput(currentNote);
    } else {
      setApprovalNoteInput('');
    }
  }, [selectedRequest]);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showArchiveSuccess, setShowArchiveSuccess] = useState(false);
  const [viewingProofBase64, setViewingProofBase64] = useState<string | null>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_width = 800;
          let width = img.width;
          let height = img.height;

          if (width > max_width) {
            height = Math.round((height * max_width) / width);
            width = max_width;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };
  
  // Custom states for Send Invoice email feature
  const [showSendInvoiceModal, setShowSendInvoiceModal] = useState(false);
  const [clientEmailInput, setClientEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showSendSuccessModal, setShowSendSuccessModal] = useState(false);
  const [sendEmailError, setSendEmailError] = useState('');

  const location = useLocation();

  useEffect(() => {
    if (location.state?.selectInvoiceNo) {
      const found = allRequests.find(r => r.invoiceNo === location.state.selectInvoiceNo);
      if (found) {
        setSelectedRequest(found);
      }
    }
  }, [location.state, allRequests]);

  useEffect(() => {
    if (selectedRequest) {
      setIsPaid(selectedRequest.status === 'Paid' || selectedRequest.status === 'Paid and closed');
    }
  }, [selectedRequest]);

  const requestAsInvoice = useMemo<Invoice | null>(() => {
    if (!selectedRequest) return null;
    return {
      invoiceNo: selectedRequest.invoiceNo,
      company: selectedRequest.company,
      companyCode: selectedRequest.companyCode,
      referenceNo: selectedRequest.referenceNo || "REF-2608-091",
      serialNo: selectedRequest.serialNo || "SR-909281",
      amount: selectedRequest.amount,
      date: selectedRequest.submittedDate,
      dueDate: selectedRequest.dueDate,
      usdToIdrRate: selectedRequest.usdToIdrRate,
      sarToIdrRate: selectedRequest.sarToIdrRate,
      status: (selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? "Approved" : "Pending",
      items: selectedRequest.items || [],
      createdBy: selectedRequest.requestedBy,
      branch: selectedRequest.branch,
      taxRate: selectedRequest.taxRate,
      agent: selectedRequest.agent,
      currency: selectedRequest?.currency || 'USD'
    };
  }, [selectedRequest]);

  const selectedDetails = useMemo(() => {
    if (!requestAsInvoice) return null;
    return getInvoiceDetails(requestAsInvoice);
  }, [requestAsInvoice]);

  const itemsPerPage = 8;

  const companiesList = useMemo(() => {
    return Array.from(new Set(allRequests.map(r => r.company).filter(Boolean)));
  }, [allRequests]);

  // Filter requests based on tab & query
  const filteredRequests = useMemo(() => {
    let list = allRequests;

    if (activeTab === "pending") {
      list = list.filter((r) => r.status === "0/4 Pending" || r.status === "1/4" || r.status === "1/4 Approved" || r.status === "2/4" || r.status === "2/4 Approved" || r.status === "3/4" || r.status === "3/4 Approved" || r.status === "0/3 Pending" || r.status === "1/3 Approved" || r.status === "2/3 Approved");
    } else if (activeTab === "approved") {
      list = list.filter((r) => r.status === "4/4 Approved" || r.status === "3/3 Approved" || r.status === "Approved" || r.status === "Paid" || r.status === "Paid and closed" || r.status === "Awaiting Payment Approval");
    } else if (activeTab === "rejected") {
      list = list.filter((r) => r.status === "Rejected");
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.reqNo.toLowerCase().includes(q) ||
          r.invoiceNo.toLowerCase().includes(q) ||
          r.company.toLowerCase().includes(q) ||
          r.requestedBy.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }

    // Company Filter
    if (filterCompany) {
      list = list.filter((r) => r.company === filterCompany);
    }

    // Date Filter
    if (filterDate) {
      list = list.filter((r) => compareDates(r.submittedDate, filterDate));
    }

    return list;
  }, [allRequests, activeTab, searchQuery, filterCompany, filterDate]);

  // Counts for each tab
  const counts = useMemo(() => {
    return {
      all: allRequests.length,
      pending: allRequests.filter((r) => r.status === "0/4 Pending" || r.status === "1/4 Approved" || r.status === "2/4 Approved" || r.status === "3/4 Approved" || r.status === "0/3 Pending" || r.status === "1/3 Approved" || r.status === "2/3 Approved").length,
      approved: allRequests.filter((r) => r.status === "4/4 Approved" || r.status === "3/3 Approved" || r.status === "Approved" || r.status === "Paid" || r.status === "Paid and closed").length,
      rejected: allRequests.filter((r) => r.status === "Rejected").length,
    };
  }, [allRequests]);

  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);

  const displayedRequests = useMemo(() => {
    const startIdx = (validCurrentPage - 1) * itemsPerPage;
    return filteredRequests.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredRequests, validCurrentPage]);

  const paginationRange = useMemo(
    () => getPaginationRange(validCurrentPage, totalPages),
    [validCurrentPage, totalPages]
  );

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleViewDetails = (req: InvoiceRequest) => {
    setSelectedRequest(req);
    setIsPaid(false); // Reset paid status for new details view
  };

  const getApprovalPermission = (status: string, role?: string) => {
    if (!role) return { canApprove: false, level: 0, requiredRole: 'Super Admin', message: 'You must be logged in to approve.' };
    if (role === 'Viewer') return { canApprove: false, level: 0, requiredRole: '', message: 'Access Denied: Viewers do not have approval permissions.' };

    if (status === '0/4 Pending' || status === '0/3 Pending') {
      return {
        canApprove: role === 'Chief Accountant',
        level: 1,
        requiredRole: 'Chief Accountant',
        message: 'Only Chief Accountant (Mr. Hesham Mokhtar) can approve Level 1.'
      };
    }
    if (status === '1/4' || status === '1/4 Approved' || status === '1/3 Approved') {
      return {
        canApprove: role === 'Level_3_Approver' || role === 'Madinah Branch Accountant',
        level: 2,
        requiredRole: 'Level_3_Approver',
        message: 'Only Level 2 Approvers (Mr. Karim Gharba & Mr. Raed AlBadrani) can approve Level 2.'
      };
    }
    if (status === '2/4' || status === '2/4 Approved' || status === '2/3 Approved') {
      return {
        canApprove: role === 'Division Director',
        level: 3,
        requiredRole: 'Division Director',
        message: 'Only Division Director (Mr. Khalid Idriss) can approve Level 3.'
      };
    }
    if (status === '3/4' || status === '3/4 Approved') {
      return {
        canApprove: role === 'Super Admin',
        level: 4,
        requiredRole: 'Super Admin',
        message: 'Only Financial Controller (Mr. Emad Moustafa) can approve Level 4.'
      };
    }
    return { canApprove: false, level: 0, requiredRole: '', message: 'Workflow complete or rejected.' };
  };

  const handleApprove = () => {
    if (!selectedRequest) return;

    const saveStatus = async () => {
      try {
        const result = await approveRequestAPI(selectedRequest.id || selectedRequest.invoiceNo, approvalNoteInput);
        setAllRequests(prev => prev.map(r => (r.id === selectedRequest.id || r.invoiceNo === selectedRequest.invoiceNo) ? {
          ...r,
          status: result.nextStatus,
          level1ApprovedAt: (result.nextStatus !== '0/4 Pending' && result.nextStatus !== '0/3 Pending') ? (r.level1ApprovedAt || result.timestamp) : r.level1ApprovedAt,
          level2ApprovedAt: (result.nextStatus.includes('2/4') || result.nextStatus.includes('3/4') || result.nextStatus.includes('4/4')) ? (r.level2ApprovedAt || result.timestamp) : r.level2ApprovedAt,
          level3ApprovedAt: (result.nextStatus.includes('3/4') || result.nextStatus.includes('4/4')) ? (r.level3ApprovedAt || result.timestamp) : r.level3ApprovedAt,
          level4ApprovedAt: result.nextStatus.includes('4/4') ? (r.level4ApprovedAt || result.timestamp) : r.level4ApprovedAt,
          level1Note: r.status === '0/4 Pending' || r.status === '0/3 Pending' ? (approvalNoteInput || r.level1Note) : r.level1Note,
          level2Note: r.status === '1/4' || r.status === '1/4 Approved' || r.status === '1/3 Approved' ? (approvalNoteInput || r.level2Note) : r.level2Note,
          level3Note: r.status === '2/4' || r.status === '2/4 Approved' || r.status === '2/3 Approved' ? (approvalNoteInput || r.level3Note) : r.level3Note,
          level4Note: r.status === '3/4' || r.status === '3/4 Approved' ? (approvalNoteInput || r.level4Note) : r.level4Note,
        } : r));
        setSelectedRequest(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: result.nextStatus,
            level1ApprovedAt: (result.nextStatus !== '0/4 Pending' && result.nextStatus !== '0/3 Pending') ? (prev.level1ApprovedAt || result.timestamp) : prev.level1ApprovedAt,
            level2ApprovedAt: (result.nextStatus.includes('2/4') || result.nextStatus.includes('3/4') || result.nextStatus.includes('4/4')) ? (prev.level2ApprovedAt || result.timestamp) : prev.level2ApprovedAt,
            level3ApprovedAt: (result.nextStatus.includes('3/4') || result.nextStatus.includes('4/4')) ? (prev.level3ApprovedAt || result.timestamp) : prev.level3ApprovedAt,
            level4ApprovedAt: result.nextStatus.includes('4/4') ? (prev.level4ApprovedAt || result.timestamp) : prev.level4ApprovedAt,
            level1Note: prev.status === '0/4 Pending' || prev.status === '0/3 Pending' ? (approvalNoteInput || prev.level1Note) : prev.level1Note,
            level2Note: prev.status === '1/4' || prev.status === '1/4 Approved' || prev.status === '1/3 Approved' ? (approvalNoteInput || prev.level2Note) : prev.level2Note,
            level3Note: prev.status === '2/4' || prev.status === '2/4 Approved' || prev.status === '2/3 Approved' ? (approvalNoteInput || prev.level3Note) : prev.level3Note,
            level4Note: prev.status === '3/4' || prev.status === '3/4 Approved' ? (approvalNoteInput || prev.level4Note) : prev.level4Note,
          };
        });
        setApprovalNoteInput(''); // Clear input on success
      } catch (err: any) {
        console.error('Failed to update request status on API:', err);
        alert(err.response?.data?.message || 'Failed to approve request.');
      }
    };
    saveStatus();
  };

  const handleSaveNoteClick = async () => {
    if (!selectedRequest) return;
    if (!approvalNoteInput.trim()) {
      alert('Please enter a note before saving.');
      return;
    }
    try {
      setLoading(true);
      await saveRequestNote(selectedRequest.id || selectedRequest.invoiceNo, approvalNoteInput);
      alert('Note saved successfully!');
      
      // Update state locally
      setAllRequests(prev => prev.map(r => (r.id === selectedRequest.id || r.invoiceNo === selectedRequest.invoiceNo) ? {
        ...r,
        level1Note: r.status === '0/4 Pending' || r.status === '0/3 Pending' ? approvalNoteInput : r.level1Note,
        level2Note: r.status === '1/4' || r.status === '1/4 Approved' || r.status === '1/3 Approved' ? approvalNoteInput : r.level2Note,
        level3Note: r.status === '2/4' || r.status === '2/4 Approved' || r.status === '2/3 Approved' ? approvalNoteInput : r.level3Note,
        level4Note: r.status === '3/4' || r.status === '3/4 Approved' ? approvalNoteInput : r.level4Note,
      } : r));
      setSelectedRequest(prev => {
        if (!prev) return null;
        return {
          ...prev,
          level1Note: prev.status === '0/4 Pending' || prev.status === '0/3 Pending' ? approvalNoteInput : prev.level1Note,
          level2Note: prev.status === '1/4' || prev.status === '1/4 Approved' || prev.status === '1/3 Approved' ? approvalNoteInput : prev.level2Note,
          level3Note: prev.status === '2/4' || prev.status === '2/4 Approved' || prev.status === '2/3 Approved' ? approvalNoteInput : prev.level3Note,
          level4Note: prev.status === '3/4' || prev.status === '3/4 Approved' ? approvalNoteInput : prev.level4Note,
        };
      });
    } catch (err: any) {
      console.error('Failed to save note:', err);
      alert(err.response?.data?.message || 'Failed to save note.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectClick = () => {
    setRejectionReasonInput('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!selectedRequest) return;
    if (!rejectionReasonInput.trim()) {
      alert('Please enter a reason for rejection.');
      return;
    }

    const saveStatus = async () => {
      try {
        await rejectRequestAPI(selectedRequest.id || selectedRequest.invoiceNo, rejectionReasonInput);
        setAllRequests(prev => prev.map(r => (r.id === selectedRequest.id || r.invoiceNo === selectedRequest.invoiceNo) ? { ...r, status: "Rejected", rejectionReason: rejectionReasonInput } : r));
        setSelectedRequest(prev => prev ? { ...prev, status: "Rejected", rejectionReason: rejectionReasonInput } : null);
        setShowRejectModal(false);
      } catch (err: any) {
        console.error('Failed to reject request on API:', err);
        alert(err.response?.data?.message || 'Failed to reject request.');
      }
    };
    saveStatus();
  };

  const handleConfirmPayment = async () => {
    if (!selectedRequest) return;
    try {
      await updateInvoiceStatusAPI(selectedRequest.invoiceNo, 'Paid and closed');
      setIsPaid(true);
      setShowPaymentConfirm(false);
      setShowPaymentSuccess(true);
      setSelectedRequest(prev => prev ? { ...prev, status: 'Paid and closed' as any } : null);
      setAllRequests(prev => prev.map(r => r.invoiceNo === selectedRequest.invoiceNo ? { ...r, status: 'Paid and closed' as any } : r));
    } catch (err: any) {
      console.error('Failed to mark invoice as paid:', err);
      alert(err.response?.data?.message || 'Failed to mark invoice as paid.');
    }
  };

  const handleRequestPaymentApproval = async () => {
    if (!selectedRequest) return;
    if (!selectedRequest.paymentAttachment) {
      alert("Please upload the payment proof document first.");
      return;
    }
    try {
      await updateInvoiceStatusAPI(selectedRequest.invoiceNo, 'Awaiting Payment Approval');
      setSelectedRequest(prev => prev ? { ...prev, status: 'Awaiting Payment Approval' as any } : null);
      setAllRequests(prev => prev.map(r => r.invoiceNo === selectedRequest.invoiceNo ? { ...r, status: 'Awaiting Payment Approval' as any } : r));
      alert("Payment proof submitted successfully. Awaiting Mr. Emad Moustafa's approval.");
    } catch (err: any) {
      console.error('Failed to submit payment approval request:', err);
      alert(err.response?.data?.message || 'Failed to submit payment approval request.');
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedRequest) return;
    try {
      await updateInvoiceStatusAPI(selectedRequest.invoiceNo, '4/4 Approved');
      setSelectedRequest(prev => prev ? { ...prev, status: '4/4 Approved' as any } : null);
      setAllRequests(prev => prev.map(r => r.invoiceNo === selectedRequest.invoiceNo ? { ...r, status: '4/4 Approved' as any } : r));
      alert("Payment proof has been rejected. The request is returned to 4/4 Approved status.");
    } catch (err: any) {
      console.error('Failed to reject payment:', err);
      alert(err.response?.data?.message || 'Failed to reject payment.');
    }
  };

  const handleConfirmArchive = async () => {
    if (!selectedRequest) return;
    try {
      await updateInvoiceStatusAPI(selectedRequest.invoiceNo, 'Archived');
      setShowArchiveConfirm(false);
      setShowArchiveSuccess(true);
      setAllRequests(prev => prev.map(r => r.invoiceNo === selectedRequest.invoiceNo ? { ...r, status: 'Archived' as any } : r));
    } catch (err: any) {
      console.error('Failed to archive request:', err);
      alert(err.response?.data?.message || 'Failed to archive request.');
    }
  };

  const handleOpenSendInvoice = () => {
    if (!selectedRequest) return;
    const defaultEmail = `billing@${selectedRequest.companyCode.toLowerCase()}.com`;
    setClientEmailInput(defaultEmail);
    setSendEmailError('');
    setShowSendInvoiceModal(true);
  };

  const handleSendInvoiceEmail = async () => {
    if (!selectedRequest || !clientEmailInput) return;
    setIsSendingEmail(true);
    setSendEmailError('');
    try {
      await sendInvoiceEmail(selectedRequest.invoiceNo, clientEmailInput);
      setShowSendInvoiceModal(false);
      setShowSendSuccessModal(true);
    } catch (err: any) {
      console.error('Failed to send invoice email:', err);
      setSendEmailError(err.response?.data?.message || 'Failed to send email. Please check configuration.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getStatusBadge = (status: InvoiceRequest["status"]) => {
    switch (status) {
      case "0/4 Pending":
      case "0/3 Pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0] font-sans">
            {status}
          </span>
        );
      case "1/4":
      case "1/4 Approved":
      case "2/4":
      case "2/4 Approved":
      case "3/4":
      case "3/4 Approved":
      case "1/3 Approved":
      case "2/3 Approved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#fffbeb] text-[#d97706] border border-[#fde68a] font-sans">
            {status}
          </span>
        );
      case "4/4 Approved":
      case "3/3 Approved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] font-sans">
            {status}
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] font-sans">
            {status}
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] font-sans">
            Cancelled
          </span>
        );
      case "Archived":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] font-sans">
            Archived
          </span>
        );
      case "Paid":
      case "Paid and closed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] font-sans">
            Paid and closed
          </span>
        );
      default:
        return null;
    }
  };

  const startRange = totalItems === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1;
  const endRange = Math.min(validCurrentPage * itemsPerPage, totalItems);

  return (
    <div className="flex min-h-screen w-full bg-[#f4f6fa] select-none font-inter">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-8 space-y-6 max-w-[1400px] w-full mx-auto">
          {selectedRequest ? (
            <div className="space-y-6">
              {/* Top Alerts */}
              {(selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") && (
                <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-4 flex items-center gap-3 text-[#065f46] text-[13px] font-medium font-sans">
                  <div className="w-5 h-5 bg-[#10b981] rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                  <span>This invoice has been fully approved and is ready for payment. All necessary signatures have been consolidated.</span>
                </div>
              )}
              {selectedRequest.status === "Rejected" && (
                <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 flex items-center gap-3 text-[#ef4444] text-[13px] font-medium font-sans shadow-sm">
                  <div className="w-5 h-5 bg-[#ef4444] rounded-full flex items-center justify-center text-white text-[10px] font-bold">✕</div>
                  <span>
                    This invoice has been rejected by {selectedRequest.rejectedBy || 'Mr. Hesham Mokhtar'} on {selectedRequest.rejectedAt ? selectedRequest.rejectedAt.split(' at ')[0] : 'Oct 12, 2026'}.
                  </span>
                </div>
              )}

              {/* Breadcrumbs and Action Header */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-1.5 text-[12px] text-slate-400 font-medium">
                    <span className="text-[#f59e0b] hover:underline cursor-pointer" onClick={() => setSelectedRequest(null)}>Confirmation Requests</span>
                    <span>/</span>
                    <span>Request {selectedRequest.reqNo}</span>
                  </div>
                  <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight font-sans text-left">
                    {selectedRequest.status === "Rejected" ? "Rejected Confirmation Details" : (selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? "Fully Approved Confirmation Details" : `Review Request - ${selectedRequest.company}`}
                  </h1>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 bg-white border border-[#cbd5e1] rounded-lg text-[13px] font-bold text-[#334155] hover:bg-slate-50 transition-all cursor-pointer font-inter shadow-sm"
                >
                  Back to Listing
                </button>
              </div>

              {/* Two-Column Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Column: Details Card */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Rejection Reason Card */}
                  {selectedRequest.status === "Rejected" && (
                    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 text-left space-y-2">
                      <h4 className="text-[13px] font-bold text-[#ef4444] font-sans uppercase tracking-wider">Rejection Reason</h4>
                      <p className="text-[13.5px] text-[#475569] font-medium leading-relaxed font-sans">
                        {selectedRequest.rejectionReason || "The billing amounts do not match the agreed contract rates. Please verify and resubmit."}
                      </p>
                    </div>
                  )}
                  {/* Top Card: Invoice Details & Metadata */}
                  <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-6">
                    {/* Header */}
                    {(() => {
                      const displayInvoiceNo = selectedRequest.invoiceNo.startsWith("INV")
                        ? selectedRequest.invoiceNo.replace("INV", selectedRequest.companyCode)
                        : selectedRequest.invoiceNo;
                      return (
                        <>
                          <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-6">
                            <div className="flex items-center gap-4">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: "rgba(254, 243, 199, 1)" }}
                              >
                                <FileText className="w-5 h-5" style={{ color: "rgba(245, 158, 11, 1)" }} />
                              </div>
                              <div>
                                <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">Confirmation Details</h3>
                                <p className="text-[12px] text-slate-400 font-medium font-sans">Review billing details</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[16px] font-bold text-[#f59e0b] font-mono">{displayInvoiceNo}</span>
                              <p className="text-[12px] text-slate-400 font-medium font-mono mt-1">REF: REF-2608-091 | SR-909281</p>
                            </div>
                          </div>

                          {/* Metadata Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirmation Number</span>
                              <div className="px-3 py-2 bg-[#fcfdfe] border border-[#e2e8f0] rounded-lg text-[13px] font-bold text-[#0c0d0f] font-mono">{displayInvoiceNo}</div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Reference Number</span>
                              <div className="px-3 py-2 bg-[#fcfdfe] border border-[#e2e8f0] rounded-lg text-[13px] font-bold text-[#0c0d0f] font-mono">{requestAsInvoice?.referenceNo}</div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Serial Number</span>
                              <div className="px-3 py-2 bg-[#fcfdfe] border border-[#e2e8f0] rounded-lg text-[13px] font-bold text-[#0c0d0f] font-mono">{requestAsInvoice?.serialNo}</div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirmation Date</span>
                              <div className="px-3 py-2 bg-[#fcfdfe] border border-[#e2e8f0] rounded-lg text-[13px] font-bold text-[#0c0d0f] font-mono">{requestAsInvoice?.date}</div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Due Date</span>
                              <div
                                className="px-3 py-2 bg-[#fffbeb] border border-[#fde68a] rounded-lg text-[13px] font-bold font-mono"
                                style={{ color: "rgba(180, 83, 9, 1)" }}
                              >
                                {selectedDetails?.dueDate}
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Divider */}
                    <div className="border-t border-[#e2e8f0]" />

                    {/* Bill From and Bill To */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* BILL FROM Column */}
                      <div className="space-y-3">
                        <h4 className="text-[14px] font-bold text-[#0c0d0f] uppercase tracking-wider font-sans ml-1">BILL FROM</h4>
                        <div className="p-6 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] shadow-sm space-y-5">
                          <div className="flex items-center gap-4">
                            <div
                              className="rounded-full flex items-center justify-center font-bold text-[#475569] text-[14px] flex-shrink-0"
                              style={{
                                backgroundColor: "rgba(241, 245, 249, 1)",
                                width: "48px",
                                height: "48px",
                                minWidth: "48px",
                                minHeight: "48px"
                              }}
                            >
                              {selectedDetails?.billFrom.name ? selectedDetails.billFrom.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[#94a3b8] block text-[12px] font-medium font-sans">Employee Name</span>
                              <span className="font-bold text-[#0c0d0f] text-[15px] font-sans">{selectedDetails?.billFrom.name || 'Emad Moustafa'}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-1">
                            <div>
                              <span className="text-[#94a3b8] block text-[12px] font-medium font-sans mb-0.5">Employee ID</span>
                              <span className="font-bold text-[#0c0d0f] text-[15px] font-sans">{selectedDetails?.billFrom.id}</span>
                            </div>
                            <div>
                              <span className="text-[#94a3b8] block text-[12px] font-medium font-sans mb-0.5">Company Email</span>
                              <span className="font-bold text-[#0c0d0f] text-[15px] font-sans truncate block">{selectedDetails?.billFrom.email}</span>
                            </div>
                            <div>
                              <span className="text-[#94a3b8] block text-[12px] font-medium font-sans mb-0.5">Entity / Company</span>
                              <span className="font-bold text-[#0c0d0f] text-[15px] font-sans">{selectedDetails?.billFrom.entity}</span>
                            </div>
                            <div>
                              <span className="text-[#94a3b8] block text-[12px] font-medium font-sans mb-0.5">Phone</span>
                              <span className="font-bold text-[#0c0d0f] text-[15px] font-sans">{selectedDetails?.billFrom.phone}</span>
                            </div>
                          </div>
                          <div className="pt-1">
                            <span className="text-[#94a3b8] block text-[12px] font-medium font-sans mb-0.5">Company Tax Number</span>
                            <span className="font-bold text-[#0c0d0f] text-[15px] font-sans">{selectedDetails?.billFrom.tax}</span>
                          </div>
                        </div>
                      </div>

                      {/* BILL TO Column */}
                      <div className="space-y-3">
                        <h4 className="text-[14px] font-bold text-[#0c0d0f] uppercase tracking-wider font-sans ml-1">BILL TO</h4>
                        <div className="p-6 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] shadow-sm space-y-5">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-0.5">
                              <span className="text-[#94a3b8] block text-[12px] font-medium font-sans">Client Company</span>
                              <span className="font-bold text-[#0c0d0f] text-[15px] font-sans">{selectedDetails?.billTo.company}</span>
                            </div>
                            {selectedDetails?.billTo.agent && (
                              <div className="text-right space-y-0.5">
                                <span className="text-[#94a3b8] block text-[12px] font-medium font-sans">Agent</span>
                                <span className="font-bold text-amber-600 text-[14px] font-sans">{selectedDetails.billTo.agent}</span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-y-4 pt-1">
                            <div>
                              <span className="text-[#94a3b8] block text-[12px] font-medium font-sans mb-0.5">Company Tax Number</span>
                              <span className="font-bold text-[#0c0d0f] text-[15px] font-sans">{selectedDetails?.billTo.tax}</span>
                            </div>
                            <div>
                              <span className="text-[#94a3b8] block text-[12px] font-medium font-sans mb-0.5">Street Address</span>
                              <span className="font-bold text-[#0c0d0f] text-[15px] font-sans block leading-relaxed">{selectedDetails?.billTo.address}</span>
                            </div>
                            <div>
                              <span className="text-[#94a3b8] block text-[12px] font-medium font-sans mb-0.5">City / Country</span>
                              <span className="font-bold text-[#0c0d0f] text-[15px] font-sans">{selectedDetails?.billTo.cityCountry}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[#e2e8f0]" />

                    {/* Itemized Charges */}
                    <div>
                      <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider mb-3">ITEMIZED CHARGES</h4>
                      <div className="border border-[#cbd5e1]/40 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-[12px] font-sans">
                          <thead>
                            <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                              <th className="py-2.5 px-4 font-bold text-slate-400 uppercase text-[9px] tracking-wider">Description</th>
                              <th className="py-2.5 px-4 font-bold text-slate-400 uppercase text-[9px] tracking-wider text-center">QTY</th>
                              <th className="py-2.5 px-4 font-bold text-slate-400 uppercase text-[9px] tracking-wider text-right">Unit Price</th>
                              <th className="py-2.5 px-4 font-bold text-slate-400 uppercase text-[9px] tracking-wider text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e2e8f0]/60">
                            {selectedDetails?.items.map((item, idx) => (
                              <tr key={idx}>
                                <td className="py-3 px-4 text-[#1e293b] font-medium leading-relaxed max-w-[280px]">
                                  {item.description}
                                </td>
                                <td className="py-3 px-4 text-[#1e293b] text-center font-medium">{item.qty}</td>
                                <td className="py-3 px-4 text-[#1e293b] text-right font-medium font-mono">{item.price}</td>
                                <td className="py-3 px-4 text-[#1e293b] text-right font-bold font-mono">{item.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Summary Row */}
                    <div className="flex justify-end">
                      <div className="w-80 p-4 bg-[#f8fafc] rounded-xl border border-[#cbd5e1]/30 space-y-2 text-[12px] font-sans">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal</span>
                          <span className="font-bold text-[#1e293b] font-mono">{selectedDetails?.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-slate-500 pb-2 border-b border-[#cbd5e1]/40">
                          <span>Tax / VAT ({selectedDetails?.taxRate || 0}%)</span>
                          <span className="font-bold text-[#1e293b] font-mono">{selectedDetails?.tax}</span>
                        </div>
                        <div className="flex justify-between text-[13px] font-bold pt-1">
                          <span>Total Due</span>
                          <span className="text-[#2563eb] font-mono font-extrabold text-[14px]">{selectedDetails?.total}</span>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[#e2e8f0]" />

                    {/* Payment Instructions */}
                    {(() => {
                      const settings = getLocalCompanySettings();
                      return (
                        <div className="space-y-3">
                          <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-sans ml-1">PAYMENT INSTRUCTIONS</h4>
                          <div className="p-5 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] text-[12px] font-sans space-y-2.5">
                            <div className="flex justify-between text-[#475569]">
                              <span>Bank Name:</span>
                              <span className="font-bold text-[#1e293b]">{settings.bankName}</span>
                            </div>
                            <div className="flex justify-between text-[#475569]">
                              <span>Account Name:</span>
                              <span className="font-bold text-[#1e293b]">{settings.accountName}</span>
                            </div>
                            <div className="flex justify-between text-[#475569]">
                              <span>IDR Account Number:</span>
                              <span className="font-bold text-[#2563eb] font-mono">{settings.idrAccountNumber}</span>
                            </div>
                            <div className="flex justify-between text-[#475569]">
                              <span>USD Account Number:</span>
                              <span className="font-bold text-[#2563eb] font-mono">{settings.usdAccountNumber}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}


                    {/* Notes and Terms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-slate-400 font-sans border-t border-[#e2e8f0]/60 pt-4 leading-relaxed font-sans">
                      <div>
                        <span className="font-bold block mb-1 uppercase text-[#64748b] text-[9px] tracking-wider font-inter">NOTES</span>
                        {companySettings.defaultNotes.split('\n').map((note: string, idx: number) => (
                          <p key={idx}>
                            {note.startsWith('*') ? note : `* ${note}`}
                          </p>
                        ))}
                      </div>
                      <div>
                        <span className="font-bold block mb-1 uppercase text-[#64748b] text-[9px] tracking-wider font-inter">TERMS & CONDITIONS</span>
                        <p className="whitespace-pre-wrap">{companySettings.termsAndConditions}</p>
                      </div>
                    </div>

                  </div>

                  {/* Print and Download PDF Buttons (Locked until all 3 directors approve) */}
                  <div className="flex items-center gap-3">
                    <button
                      disabled={selectedRequest.status !== "4/4 Approved" && selectedRequest.status !== "Approved" && selectedRequest.status !== "3/3 Approved" && selectedRequest.status !== "Paid" && selectedRequest.status !== "Paid and closed"}
                      onClick={() => {
                        if (selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") {
                          window.print();
                        }
                      }}
                      className={`px-4 py-2 border rounded-lg text-[12px] font-bold flex items-center gap-1.5 font-inter transition-all ${(selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed")
                          ? "border-[#cbd5e1] text-[#334155] hover:bg-slate-50 cursor-pointer"
                          : "border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed opacity-50"
                        }`}
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>
                    <button
                      disabled={selectedRequest.status !== "4/4 Approved" && selectedRequest.status !== "Approved" && selectedRequest.status !== "3/3 Approved" && selectedRequest.status !== "Paid" && selectedRequest.status !== "Paid and closed"}
                      onClick={() => {
                        if (selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") {
                          window.print();
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-[12px] font-bold flex items-center gap-1.5 font-inter transition-all text-white ${(selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed")
                          ? "bg-[#f59e0b] hover:bg-[#d97706] cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                        }`}
                    >
                      {selectedRequest.status !== "4/4 Approved" && selectedRequest.status !== "Approved" && selectedRequest.status !== "3/3 Approved" && selectedRequest.status !== "Paid" && selectedRequest.status !== "Paid and closed" && <Lock className="w-3.5 h-3.5" />}
                      <span>Download PDF</span>
                    </button>
                  </div>

                </div>

                {/* Right Column: Workflow Steps and Decision Card */}
                <div className="space-y-6">
                  {/* Approval Workflow Card */}
                  <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-6">
                    <h3 className="text-[17px] font-bold text-[#0c0d0f] font-sans">
                      {(selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? "Approval Workflow Status" : "Approval Workflow"}
                    </h3>

                    <div className="space-y-6 pt-1">
                      {/* Level 1: Chief Accountant */}
                      <div className="flex items-start gap-4">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-white ${(selectedRequest.status !== "0/4 Pending" && selectedRequest.status !== "0/3 Pending" && selectedRequest.status !== "Rejected")
                            ? "bg-[#10b981]"
                            : selectedRequest.status === "Rejected" && !selectedRequest.level1ApprovedAt
                              ? "bg-[#ef4444]"
                              : "bg-[#f59e0b]"
                          }`}>
                          {selectedRequest.status === "Rejected" && !selectedRequest.level1ApprovedAt ? (
                            <span className="text-[11px] font-extrabold">✕</span>
                          ) : (selectedRequest.status !== "0/4 Pending" && selectedRequest.status !== "0/3 Pending" && selectedRequest.status !== "Rejected") ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Level 1</span>
                            {selectedRequest.status === "Rejected" && !selectedRequest.level1ApprovedAt ? (
                              <span className="bg-[#fef2f2] text-[#ef4444] text-[9px] px-1.5 py-0.5 font-bold rounded">Rejected</span>
                            ) : (selectedRequest.status !== "0/4 Pending" && selectedRequest.status !== "0/3 Pending" && selectedRequest.status !== "Rejected") ? (
                              <span className="bg-[#ecfdf5] text-[#10b981] text-[9px] px-1.5 py-0.5 font-bold rounded">Approved</span>
                            ) : (
                              <span className="bg-[#fff7ed] text-[#d97706] text-[9px] px-1.5 py-0.5 font-bold rounded">Awaiting Review</span>
                            )}
                          </div>
                          <h4 className="text-[14px] font-bold text-[#0c0d0f] leading-snug">Mr. Hesham Mokhtar</h4>
                          <p className="text-[12px] text-slate-400 font-sans">Chief Accountant</p>
                          {selectedRequest.status === "Rejected" && !selectedRequest.level1ApprovedAt ? (
                            <p className="text-[12px] text-[#ef4444] font-semibold font-sans mt-0.5">
                              Rejected: {selectedRequest.rejectedAt || 'Oct 12, 2026 at 09:15 AM'}
                            </p>
                          ) : (selectedRequest.status !== "0/4 Pending" && selectedRequest.status !== "0/3 Pending" && selectedRequest.status !== "Rejected") ? (
                            <p className="text-[12px] text-[#10b981] font-semibold font-sans mt-0.5">
                              Approved: {selectedRequest.level1ApprovedAt || 'Oct 12, 2026 at 09:15 AM'}
                            </p>
                          ) : (
                            <p className="text-[12px] text-[#b45309] font-semibold font-sans mt-0.5">
                              {user?.role === 'Chief Accountant' ? 'Awaiting Review (Your Level)' : 'Awaiting Review'}
                            </p>
                          )}
                          {selectedRequest.level1Note && (
                            <div className="mt-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-[12px] text-slate-500 font-sans italic">
                              Note: "{selectedRequest.level1Note}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Level 2: Level 2 Approvers */}
                      <div className="flex items-start gap-4">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-white ${(selectedRequest.status !== "0/4 Pending" && selectedRequest.status !== "0/3 Pending" && selectedRequest.status !== "1/4" && selectedRequest.status !== "1/4 Approved" && selectedRequest.status !== "1/3 Approved" && selectedRequest.status !== "Rejected")
                            ? "bg-[#10b981]"
                            : selectedRequest.status === "Rejected" && selectedRequest.level1ApprovedAt && !selectedRequest.level2ApprovedAt
                              ? "bg-[#ef4444]"
                              : (selectedRequest.status === "1/4" || selectedRequest.status === "1/4 Approved" || selectedRequest.status === "1/3 Approved")
                                ? "bg-[#f59e0b]"
                                : "bg-slate-200 text-slate-400"
                          }`}>
                          {selectedRequest.status === "Rejected" && selectedRequest.level1ApprovedAt && !selectedRequest.level2ApprovedAt ? (
                            <span className="text-[11px] font-extrabold">✕</span>
                          ) : (selectedRequest.status !== "0/4 Pending" && selectedRequest.status !== "0/3 Pending" && selectedRequest.status !== "1/4" && selectedRequest.status !== "1/4 Approved" && selectedRequest.status !== "1/3 Approved" && selectedRequest.status !== "Rejected") ? (
                            <Check className="w-5 h-5" />
                          ) : (selectedRequest.status === "1/4" || selectedRequest.status === "1/4 Approved" || selectedRequest.status === "1/3 Approved") ? (
                            <Clock className="w-5 h-5" />
                          ) : (
                            <Lock className="w-[18px] h-[18px] stroke-[2.2px]" />
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Level 2</span>
                            {selectedRequest.status === "Rejected" && selectedRequest.level1ApprovedAt && !selectedRequest.level2ApprovedAt ? (
                              <span className="bg-[#fef2f2] text-[#ef4444] text-[9px] px-1.5 py-0.5 font-bold rounded">Rejected</span>
                            ) : (selectedRequest.status !== "0/4 Pending" && selectedRequest.status !== "0/3 Pending" && selectedRequest.status !== "1/4" && selectedRequest.status !== "1/4 Approved" && selectedRequest.status !== "1/3 Approved" && selectedRequest.status !== "Rejected") ? (
                              <span className="bg-[#ecfdf5] text-[#10b981] text-[9px] px-1.5 py-0.5 font-bold rounded">Approved</span>
                            ) : (selectedRequest.status === "1/4" || selectedRequest.status === "1/4 Approved" || selectedRequest.status === "1/3 Approved") ? (
                              <span className="bg-[#fff7ed] text-[#d97706] text-[9px] px-1.5 py-0.5 font-bold rounded">Awaiting Review</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-400 text-[9px] px-1.5 py-0.5 font-bold rounded">Pending</span>
                            )}
                          </div>
                          <h4 className={`text-[14px] font-bold leading-snug ${(selectedRequest.status !== "0/4 Pending" && selectedRequest.status !== "0/3 Pending" && selectedRequest.status !== "Rejected") ? "text-[#0c0d0f]" : "text-[#64748b]"
                            }`}>Mr. Karim Gharba & Mr. Raed AlBadrani</h4>
                          <p className="text-[12px] text-slate-400 font-sans">Level 2 Approvers</p>
                          {selectedRequest.status === "Rejected" && selectedRequest.level1ApprovedAt && !selectedRequest.level2ApprovedAt ? (
                            <p className="text-[12px] text-[#ef4444] font-semibold font-sans mt-0.5">
                              Rejected: {selectedRequest.rejectedAt || 'Oct 12, 2026 at 02:30 PM'}
                            </p>
                          ) : (selectedRequest.status !== "0/4 Pending" && selectedRequest.status !== "0/3 Pending" && selectedRequest.status !== "1/4" && selectedRequest.status !== "1/4 Approved" && selectedRequest.status !== "1/3 Approved" && selectedRequest.status !== "Rejected") ? (
                            <p className="text-[12px] text-[#10b981] font-semibold font-sans mt-0.5">
                              Approved: {selectedRequest.level2ApprovedAt || 'Oct 12, 2026 at 02:30 PM'}
                            </p>
                          ) : (selectedRequest.status === "1/4" || selectedRequest.status === "1/4 Approved" || selectedRequest.status === "1/3 Approved") ? (
                            <p className="text-[12px] text-[#b45309] font-semibold font-sans mt-0.5">
                              {user?.role === 'Level_3_Approver' ? 'Awaiting Review (Your Level)' : 'Awaiting Review'}
                            </p>
                          ) : (
                            <p className="text-[12px] text-slate-400 font-sans mt-0.5">Waiting for Level 1 approval</p>
                          )}
                          {selectedRequest.level2Note && (
                            <div className="mt-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-[12px] text-slate-500 font-sans italic">
                              Note: "{selectedRequest.level2Note}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Level 3: Umrah Division Director */}
                      <div className="flex items-start gap-4">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-white ${(selectedRequest.status === "3/4" || selectedRequest.status === "3/4 Approved" || selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed")
                            ? "bg-[#10b981]"
                            : selectedRequest.status === "Rejected" && selectedRequest.level2ApprovedAt && !selectedRequest.level3ApprovedAt
                              ? "bg-[#ef4444]"
                              : (selectedRequest.status === "2/4" || selectedRequest.status === "2/4 Approved" || selectedRequest.status === "2/3 Approved")
                                ? "bg-[#f59e0b]"
                                : "bg-slate-200 text-slate-400"
                          }`}
                          style={selectedRequest.status !== "3/4" && selectedRequest.status !== "3/4 Approved" && selectedRequest.status !== "4/4 Approved" && selectedRequest.status !== "Approved" && selectedRequest.status !== "3/3 Approved" && selectedRequest.status !== "Paid" && selectedRequest.status !== "Paid and closed" && selectedRequest.status !== "2/4" && selectedRequest.status !== "2/4 Approved" && selectedRequest.status !== "2/3 Approved" && !(selectedRequest.status === "Rejected" && selectedRequest.level2ApprovedAt) ? { backgroundColor: "rgba(226, 232, 240, 1)" } : undefined}>
                          {selectedRequest.status === "Rejected" && selectedRequest.level2ApprovedAt && !selectedRequest.level3ApprovedAt ? (
                            <span className="text-[11px] font-extrabold">✕</span>
                          ) : (selectedRequest.status === "3/4" || selectedRequest.status === "3/4 Approved" || selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? (
                            <Check className="w-5 h-5" />
                          ) : (selectedRequest.status === "2/4" || selectedRequest.status === "2/4 Approved" || selectedRequest.status === "2/3 Approved") ? (
                            <Clock className="w-5 h-5" />
                          ) : (
                            <Lock className="w-[18px] h-[18px] stroke-[2.2px]" />
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Level 3</span>
                            {selectedRequest.status === "Rejected" && selectedRequest.level2ApprovedAt && !selectedRequest.level3ApprovedAt ? (
                              <span className="bg-[#fef2f2] text-[#ef4444] text-[9px] px-1.5 py-0.5 font-bold rounded">Rejected</span>
                            ) : (selectedRequest.status === "3/4" || selectedRequest.status === "3/4 Approved" || selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? (
                              <span className="bg-[#ecfdf5] text-[#10b981] text-[9px] px-1.5 py-0.5 font-bold rounded">Approved</span>
                            ) : (selectedRequest.status === "2/4" || selectedRequest.status === "2/4 Approved" || selectedRequest.status === "2/3 Approved") ? (
                              <span className="bg-[#fff7ed] text-[#d97706] text-[9px] px-1.5 py-0.5 font-bold rounded">Awaiting Review</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-400 text-[9px] px-1.5 py-0.5 font-bold rounded">Pending</span>
                            )}
                          </div>
                          <h4 className={`text-[14px] font-bold leading-snug ${(selectedRequest.status !== "0/4 Pending" && selectedRequest.status !== "0/3 Pending" && selectedRequest.status !== "1/4" && selectedRequest.status !== "1/4 Approved" && selectedRequest.status !== "1/3 Approved" && selectedRequest.status !== "Rejected") ? "text-[#0c0d0f]" : "text-[#64748b]"
                            }`}>Mr. Khalid Idriss</h4>
                          <p className="text-[12px] text-slate-400 font-sans">Umrah Division Director</p>
                          {selectedRequest.status === "Rejected" && selectedRequest.level2ApprovedAt && !selectedRequest.level3ApprovedAt ? (
                            <p className="text-[12px] text-[#ef4444] font-semibold font-sans mt-0.5">
                              Rejected: {selectedRequest.rejectedAt || 'Oct 13, 2026 at 10:00 AM'}
                            </p>
                          ) : (selectedRequest.status === "3/4" || selectedRequest.status === "3/4 Approved" || selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? (
                            <p className="text-[12px] text-[#10b981] font-semibold font-sans mt-0.5">
                              Approved: {selectedRequest.level3ApprovedAt || 'Oct 13, 2026 at 10:00 AM'}
                            </p>
                          ) : (selectedRequest.status === "2/4" || selectedRequest.status === "2/4 Approved" || selectedRequest.status === "2/3 Approved") ? (
                            <p className="text-[12px] text-[#b45309] font-semibold font-sans mt-0.5">
                              {user?.role === 'Division Director' ? 'Awaiting Review (Your Level)' : 'Awaiting Review'}
                            </p>
                          ) : (
                            <p className="text-[12px] text-slate-400 font-sans mt-0.5">Waiting for Level 2 approval</p>
                          )}
                          {selectedRequest.level3Note && (
                            <div className="mt-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-[12px] text-slate-500 font-sans italic">
                              Note: "{selectedRequest.level3Note}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Level 4: Financial Controller */}
                      <div className="flex items-start gap-4">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm text-white ${(selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed")
                            ? "bg-[#10b981]"
                            : selectedRequest.status === "Rejected" && selectedRequest.level3ApprovedAt && !selectedRequest.level4ApprovedAt
                              ? "bg-[#ef4444]"
                              : (selectedRequest.status === "3/4" || selectedRequest.status === "3/4 Approved")
                                ? "bg-[#f59e0b]"
                                : "bg-slate-200 text-slate-400"
                          }`}
                          style={selectedRequest.status !== "4/4 Approved" && selectedRequest.status !== "Approved" && selectedRequest.status !== "3/3 Approved" && selectedRequest.status !== "Paid" && selectedRequest.status !== "Paid and closed" && selectedRequest.status !== "3/4" && selectedRequest.status !== "3/4 Approved" && !(selectedRequest.status === "Rejected" && selectedRequest.level3ApprovedAt) ? { backgroundColor: "rgba(226, 232, 240, 1)" } : undefined}>
                          {selectedRequest.status === "Rejected" && selectedRequest.level3ApprovedAt && !selectedRequest.level4ApprovedAt ? (
                            <span className="text-[11px] font-extrabold">✕</span>
                          ) : (selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? (
                            <Check className="w-5 h-5" />
                          ) : (selectedRequest.status === "3/4" || selectedRequest.status === "3/4 Approved") ? (
                            <Clock className="w-5 h-5" />
                          ) : (
                            <Lock className="w-[18px] h-[18px] stroke-[2.2px]" />
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Level 4</span>
                            {selectedRequest.status === "Rejected" && selectedRequest.level3ApprovedAt && !selectedRequest.level4ApprovedAt ? (
                              <span className="bg-[#fef2f2] text-[#ef4444] text-[9px] px-1.5 py-0.5 font-bold rounded">Rejected</span>
                            ) : (selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? (
                              <span className="bg-[#ecfdf5] text-[#10b981] text-[9px] px-1.5 py-0.5 font-bold rounded">Approved</span>
                            ) : (selectedRequest.status === "3/4" || selectedRequest.status === "3/4 Approved") ? (
                              <span className="bg-[#fff7ed] text-[#d97706] text-[9px] px-1.5 py-0.5 font-bold rounded">Awaiting Review</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-400 text-[9px] px-1.5 py-0.5 font-bold rounded">Pending</span>
                            )}
                          </div>
                          <h4 className={`text-[14px] font-bold leading-snug ${(selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? "text-[#0c0d0f]" : "text-[#475569]"
                            }`}>Mr. Emad Moustafa</h4>
                          <p className="text-[12px] text-slate-400 font-sans">Financial Controller</p>
                          {selectedRequest.status === "Rejected" && selectedRequest.level3ApprovedAt && !selectedRequest.level4ApprovedAt ? (
                            <p className="text-[12px] text-[#ef4444] font-semibold font-sans mt-0.5">
                              Rejected: {selectedRequest.rejectedAt || 'Oct 14, 2026 at 11:00 AM'}
                            </p>
                          ) : (selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? (
                            <p className="text-[12px] text-[#10b981] font-semibold font-sans mt-0.5">
                              Approved: {selectedRequest.level4ApprovedAt || 'Oct 14, 2026 at 11:00 AM'}
                            </p>
                          ) : (selectedRequest.status === "3/4" || selectedRequest.status === "3/4 Approved") ? (
                            <p className="text-[12px] text-[#b45309] font-semibold font-sans mt-0.5">
                              {user?.role === 'Super Admin' ? 'Awaiting Review (Your Level)' : 'Awaiting Review'}
                            </p>
                          ) : (
                            <p className="text-[12px] text-slate-400 font-sans mt-0.5">Waiting for Level 3 approval</p>
                          )}
                          {selectedRequest.level4Note && (
                            <div className="mt-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-[12px] text-slate-500 font-sans italic">
                              Note: "{selectedRequest.level4Note}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary Bottom info */}
                    <div className="border-t border-[#e2e8f0]/60 pt-4 text-[12px] text-[#475569] font-medium font-sans">
                      {(selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed") ? (
                        <div>
                          <p className="font-bold text-[#10b981]">Approvals Complete</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">Ready for payment execution.</p>
                        </div>
                      ) : selectedRequest.status === "Rejected" ? (
                        <div>
                          <p className="font-bold text-[#ef4444]">Request Rejected</p>
                        </div>
                      ) : (selectedRequest.status === "3/4" || selectedRequest.status === "3/4 Approved") ? (
                        <div>
                          <p className="font-bold text-[#d97706]">3 of 4 Approvals Complete</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">Pending Level 4 action before proceeding.</p>
                        </div>
                      ) : (selectedRequest.status === "2/4" || selectedRequest.status === "2/4 Approved" || selectedRequest.status === "2/3 Approved") ? (
                        <div>
                          <p className="font-bold text-[#d97706]">2 of 4 Approvals Complete</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">Pending Level 3 action before proceeding.</p>
                        </div>
                      ) : (selectedRequest.status === "1/4" || selectedRequest.status === "1/4 Approved" || selectedRequest.status === "1/3 Approved") ? (
                        <div>
                          <p className="font-bold text-[#d97706]">1 of 4 Approvals Complete</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">Pending Level 2 action before proceeding.</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-[#d97706]">0 of 4 Approvals Complete</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">Pending Level 1 action before proceeding.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Proof Card (shown if attachment exists OR status is Paid / Approved) */}
                  {(selectedRequest.paymentAttachment || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed" || isPaid || selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "Awaiting Payment Approval") && (
                    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
                      <h3 className="text-[17px] font-bold text-[#0c0d0f] font-sans">Payment Transfer Photo</h3>
                      {selectedRequest.paymentAttachment ? (
                        <div className="space-y-3">
                          <div
                            className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer shadow-sm animate-fade-in"
                            onClick={() => setViewingProofBase64(selectedRequest.paymentAttachment!)}
                          >
                            {selectedRequest.paymentAttachment.startsWith('data:application/pdf') ? (
                              <div className="w-full py-8 flex flex-col items-center justify-center bg-slate-50 gap-2 transition-transform duration-200 group-hover:scale-[1.02]">
                                <FileText className="w-16 h-16 text-red-500" />
                                <span className="text-[13px] font-bold text-slate-700">Payment Proof PDF</span>
                                <span className="text-[11px] text-slate-400">Click to View PDF Document</span>
                              </div>
                            ) : (
                              <img
                                src={selectedRequest.paymentAttachment}
                                alt="Payment Proof"
                                className="w-full h-auto max-h-[250px] object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold text-[13px] gap-2">
                              <span>🔍 Click to View Full Size</span>
                            </div>
                          </div>
                          {user?.role !== 'Viewer' && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={async () => {
                                  if (window.confirm("Are you sure you want to clear/delete this payment proof document?")) {
                                    try {
                                      await uploadPaymentProof(selectedRequest.invoiceNo, "");
                                      
                                      // Update state
                                      setSelectedRequest(prev => prev ? { ...prev, paymentAttachment: undefined } : null);
                                      setAllRequests(prev => prev.map(r => r.invoiceNo === selectedRequest.invoiceNo ? { ...r, paymentAttachment: undefined } : r));
                                      alert("Payment proof cleared successfully!");
                                    } catch (err: any) {
                                      console.error('Failed to clear proof:', err);
                                      alert(err.response?.data?.message || 'Failed to clear payment proof.');
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#e11d48] rounded-lg font-bold text-[11px] cursor-pointer transition-all inline-block shadow-sm"
                              >
                                Delete Proof
                              </button>

                              <label className="px-3 py-1.5 border border-[#cbd5e1] hover:bg-slate-50 text-[#334155] rounded-lg font-bold text-[11px] cursor-pointer transition-all inline-block shadow-sm">
                                Change Document
                                <input
                                  type="file"
                                  onChange={async (e) => {
                                    if (!e.target.files || e.target.files.length === 0) return;
                                    const file = e.target.files[0];
                                    const isPDF = file.type === 'application/pdf';
                                    try {
                                      let base64Data = '';
                                      if (isPDF) {
                                        base64Data = await new Promise<string>((resolve, reject) => {
                                          const reader = new FileReader();
                                          reader.readAsDataURL(file);
                                          reader.onload = () => resolve(reader.result as string);
                                          reader.onerror = (err) => reject(err);
                                        });
                                      } else {
                                        base64Data = await compressImage(file);
                                      }
                                      await uploadPaymentProof(selectedRequest.invoiceNo, base64Data);
                                      
                                      // Update state
                                      setSelectedRequest(prev => prev ? { ...prev, paymentAttachment: base64Data } : null);
                                      setAllRequests(prev => prev.map(r => r.invoiceNo === selectedRequest.invoiceNo ? { ...r, paymentAttachment: base64Data } : r));
                                    } catch (err: any) {
                                      console.error('Failed to upload proof from requests:', err);
                                      alert(err.response?.data?.message || 'Failed to upload payment proof.');
                                    }
                                  }}
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-[12px] font-sans">
                          <p>No payment proof document uploaded yet.</p>
                          {user?.role !== 'Viewer' && (
                            <div className="mt-3">
                              <label className="px-3.5 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg font-bold text-[11px] cursor-pointer transition-all inline-block shadow-sm">
                                Upload Proof (PDF/Image)
                                <input
                                  type="file"
                                  onChange={async (e) => {
                                    if (!e.target.files || e.target.files.length === 0) return;
                                    const file = e.target.files[0];
                                    const isPDF = file.type === 'application/pdf';
                                    try {
                                      let base64Data = '';
                                      if (isPDF) {
                                        base64Data = await new Promise<string>((resolve, reject) => {
                                          const reader = new FileReader();
                                          reader.readAsDataURL(file);
                                          reader.onload = () => resolve(reader.result as string);
                                          reader.onerror = (err) => reject(err);
                                        });
                                      } else {
                                        base64Data = await compressImage(file);
                                      }
                                      await uploadPaymentProof(selectedRequest.invoiceNo, base64Data);
                                      
                                      // Update state
                                      setSelectedRequest(prev => prev ? { ...prev, paymentAttachment: base64Data } : null);
                                      setAllRequests(prev => prev.map(r => r.invoiceNo === selectedRequest.invoiceNo ? { ...r, paymentAttachment: base64Data } : r));
                                    } catch (err: any) {
                                      console.error('Failed to upload proof from requests:', err);
                                      alert(err.response?.data?.message || 'Failed to upload payment proof.');
                                    }
                                  }}
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Your Decision / Available Operations Card */}
                  {(selectedRequest.status === "4/4 Approved" || selectedRequest.status === "Approved" || selectedRequest.status === "3/3 Approved" || selectedRequest.status === "Paid" || selectedRequest.status === "Paid and closed" || selectedRequest.status === "Awaiting Payment Approval") ? (
                    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
                      <h3 className="text-[17px] font-bold text-[#0c0d0f] font-sans">Available Operations</h3>
                      
                      {selectedRequest.status === "Awaiting Payment Approval" ? (
                        user?.role === 'Super Admin' ? (
                          <div className="space-y-3">
                            <p className="text-[13px] text-[#475569] font-sans text-left leading-relaxed">
                              Mr. Emad, please review the uploaded payment proof below. If the proof is correct, approve the payment.
                            </p>
                            <div className="grid grid-cols-2 gap-4 pt-1">
                              <button
                                onClick={() => handleRejectPayment()}
                                className="py-3 bg-red-100 hover:bg-red-200 text-[#b91c1c] rounded-xl text-[13px] font-semibold text-center cursor-pointer transition-all font-sans"
                              >
                                Reject Payment
                              </button>
                              <button
                                onClick={() => handleConfirmPayment()}
                                className="py-3 bg-[#10b981] text-white hover:bg-[#059669] rounded-xl text-[13px] font-semibold text-center cursor-pointer transition-all font-sans"
                              >
                                Approve Payment
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[12.5px] font-medium text-slate-500 font-sans flex items-start gap-2.5 text-left">
                            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span>Payment proof uploaded and submitted. Awaiting approval from Mr. Emad Moustafa.</span>
                          </div>
                        )
                      ) : (
                        (user?.role !== 'Accountant' && user?.role !== 'Viewer') && (
                          <button
                            onClick={() => {
                              if (!selectedRequest.paymentAttachment) {
                                alert("Please upload the payment proof first before submitting.");
                              } else if (user?.role === 'Super Admin') {
                                handleConfirmPayment();
                              } else {
                                handleRequestPaymentApproval();
                              }
                            }}
                            disabled={!selectedRequest.paymentAttachment || isPaid}
                            className={`w-full py-3 text-white rounded-xl text-center font-bold text-[13px] font-sans flex items-center justify-center gap-2 transition-all ${(!selectedRequest.paymentAttachment || isPaid)
                              ? "bg-slate-200 cursor-not-allowed opacity-60 text-slate-400"
                              : "bg-[#f59e0b] hover:bg-[#d97706] cursor-pointer"
                              }`}
                          >
                            <CreditCard className="w-4 h-4" />
                            {isPaid
                              ? "Marked as Paid"
                              : user?.role === 'Super Admin'
                                ? "Execute Payment"
                                : "Submit Payment for Approval"}
                          </button>
                        )
                      )}
                      
                      {user?.role !== 'Viewer' && (
                        <button
                          onClick={handleOpenSendInvoice}
                          className="w-full py-2.5 bg-white border border-[#cbd5e1] hover:bg-slate-50 text-[#334155] rounded-xl text-center font-bold text-[13px] font-sans flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                        >
                          <FileText className="w-4 h-4 text-[#64748b]" />
                          <span>Send Confirmation</span>
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          onClick={() => window.print()}
                          className="py-2 px-3 bg-white border border-[#cbd5e1] hover:bg-slate-50 text-[#334155] rounded-xl text-[12px] font-bold text-center cursor-pointer transition-all font-sans flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Printer className="w-4 h-4 text-[#64748b]" />
                          <span>Print Confirmation</span>
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="py-2 px-3 bg-white border border-[#cbd5e1] hover:bg-slate-50 text-[#334155] rounded-xl text-[12px] font-bold text-center cursor-pointer transition-all font-sans flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Download className="w-4 h-4 text-[#64748b]" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>
                  ) : (selectedRequest.status === "Rejected" && user?.role !== 'Viewer') ? (
                    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
                      <h3 className="text-[17px] font-bold text-[#0c0d0f] font-sans text-left">Available Operations</h3>
                      <button
                        onClick={() => {
                          localStorage.setItem('edit_invoice_no', selectedRequest.invoiceNo);
                          navigate('/invoices');
                        }}
                        className="w-full py-3 border border-[#2563eb] hover:bg-blue-50/50 text-[#2563eb] rounded-xl text-center font-bold text-[13px] font-sans flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                      >
                        <Edit3 className="w-4 h-4 text-[#2563eb]" />
                        <span>Edit and Resubmit</span>
                      </button>
                      <button
                        onClick={() => setShowArchiveConfirm(true)}
                        className="w-full py-3 bg-[#f8fafc] hover:bg-slate-100/80 text-[#64748b] hover:text-[#475569] rounded-xl text-center font-bold text-[13px] font-sans flex items-center justify-center gap-2 cursor-pointer transition-all border border-[#e2e8f0]"
                      >
                        <Archive className="w-4 h-4 text-[#94a3b8]" />
                        <span>Archive Confirmation</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Warning Blue Info Card */}
                      <div className="bg-[#e0f2fe]/60 border border-[#bae6fd] rounded-2xl p-4 flex items-start gap-2.5 text-[#0369a1] text-[12.5px] font-sans">
                        <span className="text-[14px] mt-0.5">ℹ️</span>
                        <span className="text-left leading-normal font-medium">Please review all details carefully before making your decision. This action cannot be undone.</span>
                      </div>

                      {/* Your Decision Card */}
                      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
                        <h3 className="text-[17px] font-bold text-[#0c0d0f] font-sans">
                          Your Decision (Level {getApprovalPermission(selectedRequest.status, user?.role).level})
                        </h3>
                        <p className="text-[13px] text-[#475569] font-sans leading-relaxed text-left">
                          {(selectedRequest.status === "0/4 Pending" || selectedRequest.status === "0/3 Pending") && "As the Chief Accountant, please confirm verification of the Requested Confirmation."}
                          {(selectedRequest.status === "1/4" || selectedRequest.status === "1/4 Approved" || selectedRequest.status === "1/3 Approved") && "As the Level 2 Approver, please confirm verification of the Requested Confirmation."}
                          {(selectedRequest.status === "2/4" || selectedRequest.status === "2/4 Approved" || selectedRequest.status === "2/3 Approved") && "As the Umrah Division Director, please confirm verification of the Requested Confirmation."}
                          {(selectedRequest.status === "3/4" || selectedRequest.status === "3/4 Approved") && "As the Financial Controller, please confirm verification of the Requested Confirmation."}
                        </p>

                        {!getApprovalPermission(selectedRequest.status, user?.role).canApprove ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-medium text-slate-500 font-sans flex items-center gap-2 text-left">
                            <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{getApprovalPermission(selectedRequest.status, user?.role).message}</span>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Note field with green Save Note button inside Decision block */}
                            <div className="space-y-2 text-left">
                              <label className="text-[13px] font-bold text-[#0c0d0f] font-sans block">Note</label>
                              <textarea
                                value={approvalNoteInput}
                                onChange={(e) => setApprovalNoteInput(e.target.value)}
                                placeholder="Write a note for reference..."
                                className="w-full px-3.5 py-2.5 border border-[#cbd5e1] rounded-xl text-[13px] font-sans focus:outline-none focus:ring-1 focus:ring-[#f59e0b] focus:border-[#f59e0b] resize-none"
                                rows={4}
                              />
                              <button
                                onClick={handleSaveNoteClick}
                                className="w-full py-2 bg-[#55b986] hover:bg-[#43a072] text-white font-bold rounded-xl text-[12px] transition-all cursor-pointer font-sans text-center shadow-sm"
                              >
                                Save Note
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-1">
                              <button
                                onClick={() => handleRejectClick()}
                                className="py-3 hover:bg-red-200/40 rounded-xl text-[13px] font-semibold text-center cursor-pointer transition-all font-sans bg-[#fee2e2] text-[#b91c1c]"
                              >
                                Reject Request
                              </button>
                              <button
                                onClick={() => handleApprove()}
                                className="py-3 bg-[#10b981] text-white hover:bg-[#059669] rounded-xl text-[13px] font-semibold text-center cursor-pointer transition-all font-sans"
                              >
                                Approve & Forward
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Welcome Title */}
              <div className="flex flex-col space-y-1">
                <h1 className="text-[28px] font-bold text-[#0c0d0f] tracking-tight">
                  Confirmation Requests
                </h1>
                <p className="text-[13px] text-[#64748b] font-medium font-sans">
                  Review and approve pending confirmation requests from corporate treasury branches
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleTabChange("all")}
                  className={`px-4 py-2 border rounded-xl text-[13px] flex items-center gap-2 transition-all font-inter cursor-pointer ${activeTab === "all"
                    ? "text-[#0c0d0f] font-bold"
                    : "border-transparent bg-[#f1f5f9] text-[#64748b] hover:bg-slate-200/60 font-semibold"
                    }`}
                  style={activeTab === "all" ? { backgroundColor: 'rgba(255, 255, 255, 1)', borderColor: 'rgba(245, 158, 11, 1)' } : undefined}
                >
                  <span>All Requests</span>
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded-md font-bold`}
                    style={activeTab === "all" ? { backgroundColor: 'rgba(254, 243, 199, 1)', color: 'rgba(180, 83, 9, 1)' } : { backgroundColor: '#e2e8f0', color: '#64748b' }}
                  >
                    {counts.all}
                  </span>
                </button>

                <button
                  onClick={() => handleTabChange("pending")}
                  className={`px-4 py-2 border rounded-xl text-[13px] flex items-center gap-2 transition-all font-inter cursor-pointer ${activeTab === "pending"
                    ? "text-[#0c0d0f] font-bold"
                    : "border-transparent bg-[#f1f5f9] text-[#64748b] hover:bg-slate-200/60 font-semibold"
                    }`}
                  style={activeTab === "pending" ? { backgroundColor: 'rgba(255, 255, 255, 1)', borderColor: 'rgba(245, 158, 11, 1)' } : undefined}
                >
                  <span>Pending</span>
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded-md font-bold`}
                    style={activeTab === "pending" ? { backgroundColor: 'rgba(254, 243, 199, 1)', color: 'rgba(180, 83, 9, 1)' } : { backgroundColor: '#e2e8f0', color: '#64748b' }}
                  >
                    {counts.pending}
                  </span>
                </button>

                <button
                  onClick={() => handleTabChange("approved")}
                  className={`px-4 py-2 border rounded-xl text-[13px] flex items-center gap-2 transition-all font-inter cursor-pointer ${activeTab === "approved"
                    ? "text-[#0c0d0f] font-bold"
                    : "border-transparent bg-[#f1f5f9] text-[#64748b] hover:bg-slate-200/60 font-semibold"
                    }`}
                  style={activeTab === "approved" ? { backgroundColor: 'rgba(255, 255, 255, 1)', borderColor: 'rgba(245, 158, 11, 1)' } : undefined}
                >
                  <span>Approved</span>
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded-md font-bold`}
                    style={activeTab === "approved" ? { backgroundColor: 'rgba(254, 243, 199, 1)', color: 'rgba(180, 83, 9, 1)' } : { backgroundColor: '#e2e8f0', color: '#64748b' }}
                  >
                    {counts.approved}
                  </span>
                </button>

                <button
                  onClick={() => handleTabChange("rejected")}
                  className={`px-4 py-2 border rounded-xl text-[13px] flex items-center gap-2 transition-all font-inter cursor-pointer ${activeTab === "rejected"
                    ? "text-[#0c0d0f] font-bold"
                    : "border-transparent bg-[#f1f5f9] text-[#64748b] hover:bg-slate-200/60 font-semibold"
                    }`}
                  style={activeTab === "rejected" ? { backgroundColor: 'rgba(255, 255, 255, 1)', borderColor: 'rgba(245, 158, 11, 1)' } : undefined}
                >
                  <span>Rejected</span>
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded-md font-bold`}
                  style={activeTab === "rejected" ? { backgroundColor: 'rgba(254, 243, 199, 1)', color: 'rgba(180, 83, 9, 1)' } : { backgroundColor: '#e2e8f0', color: '#64748b' }}
                  >
                    {counts.rejected}
                  </span>
                </button>
              </div>
              {/* Table Container Card */}
              <div className="bg-white rounded-2xl border-y border-[#e2e8f0] shadow-sm overflow-hidden">
                {error ? (
                  <NetworkErrorState
                    message="We could not load your requests. Please check your connection and try again."
                    onRetry={fetchRequests}
                  />
                ) : (
                  <>
                    {/* Card Header & Search & Filters */}
                <div className="p-5 border-b border-[#e2e8f0] bg-slate-50/50 flex flex-wrap items-center gap-4">
                  <h2 className="text-[16px] font-bold text-[#0c0d0f] font-inter whitespace-nowrap">
                    All Confirmation Requests Listing
                  </h2>
                  
                  {/* Search Bar Input */}
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Search Requests / Company"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] placeholder-gray-400 focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] bg-white transition-all font-sans"
                    />
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Company Filter Dropdown */}
                  <select
                    value={filterCompany}
                    onChange={(e) => {
                      setFilterCompany(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] px-3 py-1.5 focus:outline-none focus:border-[#f59e0b] bg-white transition-all cursor-pointer"
                  >
                    <option value="">All Companies</option>
                    {companiesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {/* Date Filter Input */}
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    onClick={(e) => {
                      if (typeof e.currentTarget.showPicker === 'function') {
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) {
                          console.warn('showPicker failed:', err);
                        }
                      }
                    }}
                    className="border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] px-3 py-1.5 focus:outline-none focus:border-[#f59e0b] bg-white transition-all cursor-pointer"
                  />

                  {/* Reset Filters Button */}
                  {(searchQuery || filterCompany || filterDate) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCompany('');
                        setFilterDate('');
                        setCurrentPage(1);
                      }}
                      className="text-[12px] font-semibold text-[#f59e0b] hover:text-[#d97706] transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Table / Empty State Container */}
                {!loading && displayedRequests.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center bg-white px-4 animate-fade-in text-center border-t border-[#e2e8f0]">
                    {/* Circle icon wrapper */}
                    <div className="w-14 h-14 bg-[#f8fafc] border border-[#f1f5f9] text-[#475569] rounded-full flex items-center justify-center mb-5 shadow-sm mx-auto">
                      <FileText className="w-6 h-6 text-[#94a3b8]" />
                    </div>
                    {/* Title */}
                    <h4 className="text-[16px] font-bold text-[#0c0d0f] text-center mb-1.5 font-sans">
                      {activeTab === "pending" && "No pending requests"}
                      {activeTab === "approved" && "No approved requests"}
                      {activeTab === "rejected" && "No rejected requests"}
                      {activeTab === "all" && "No requests found"}
                    </h4>
                    {/* Description */}
                    <p className="text-[12.5px] text-[#64748b] text-center font-medium font-sans max-w-sm mb-6 leading-relaxed mx-auto">
                      {activeTab === "pending" && "When confirmations are submitted for approval, they will appear here."}
                      {activeTab === "approved" && "Once requests are approved by all 4 levels, they will appear here."}
                      {activeTab === "rejected" && "Any rejected confirmation requests will appear here."}
                      {activeTab === "all" && "Try adjusting your filters or search terms, or create a new confirmation."}
                    </p>
                    {/* Go to Invoices Button */}
                    <button
                      onClick={() => navigate("/invoices")}
                      className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-[13px] rounded-lg shadow-sm transition-all cursor-pointer font-sans"
                    >
                      Go to Confirmations
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Table */}
                    <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                        <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-3 font-inter tracking-wider text-left whitespace-nowrap">
                          REQUEST #
                        </th>
                        <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-3 font-inter tracking-wider text-left whitespace-nowrap">
                          CONFIRMATION #
                        </th>
                        <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-3 font-inter tracking-wider text-left whitespace-nowrap">
                          COMPANY
                        </th>
                        <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-3 font-inter tracking-wider text-left whitespace-nowrap">
                          CODE
                        </th>
                        <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-3 font-inter tracking-wider text-right whitespace-nowrap">
                          AMOUNT
                        </th>
                        <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-3 font-inter tracking-wider text-left whitespace-nowrap">
                          REQUESTED BY
                        </th>
                        <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-3 font-inter tracking-wider text-left whitespace-nowrap">
                          INVOICE DATE
                        </th>
                        <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-3 font-inter tracking-wider text-left whitespace-nowrap">
                          DUE DATE
                        </th>
                        <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-3 font-inter tracking-wider text-left whitespace-nowrap">
                          APPROVAL STATUS
                        </th>
                        <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-3 font-inter tracking-wider text-left whitespace-nowrap">
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {loading
                        ? Array.from({ length: 5 }).map((_, loadIdx) => (
                            <tr key={`skeleton-req-${loadIdx}`} className="animate-pulse border-b border-[#e2e8f0]">
                              <td className="py-4 px-3"><div className="w-16 h-4 bg-gray-200 rounded"></div></td>
                              <td className="py-4 px-3"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                              <td className="py-4 px-3"><div className="w-32 h-4 bg-gray-200 rounded"></div></td>
                              <td className="py-4 px-3"><div className="w-12 h-4 bg-gray-200 rounded"></div></td>
                              <td className="py-4 px-3"><div className="w-16 h-4 bg-gray-200 rounded text-right"></div></td>
                              <td className="py-4 px-3"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
                              <td className="py-4 px-3"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                              <td className="py-4 px-3"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                              <td className="py-4 px-3"><div className="w-16 h-4 bg-gray-200 rounded"></div></td>
                              <td className="py-4 px-3"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                            </tr>
                          ))
                        : displayedRequests.length === 0
                        ? <tr>
                            <td colSpan={10} className="py-16 text-center text-[#64748b] font-medium">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <FileText className="w-8 h-8 text-gray-300" />
                                <span className="text-[14px] font-bold text-slate-600">No requests found</span>
                                <span className="text-[12px] text-slate-400">Try adjusting your filters or search terms.</span>
                              </div>
                            </td>
                          </tr>
                        : displayedRequests.map((req, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-[#e2e8f0] last:border-b-0 hover:bg-slate-50/30 transition-all"
                            >
                              <td
                                className="py-3 px-3 text-[13px] font-bold text-[#0c0d0f] font-inter text-left whitespace-nowrap"
                                style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                              >
                                {req.reqNo}
                              </td>
                              <td
                                className="py-3 px-3 text-[13px] font-bold text-[#475569] font-inter text-left whitespace-nowrap"
                                style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                              >
                                {req.invoiceNo}
                              </td>
                              <td
                                className="py-3 px-3 text-[13px] font-medium text-[#1e293b] font-inter text-left whitespace-nowrap"
                                style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                              >
                                {req.company}
                              </td>
                              <td
                                className="py-3 px-3 text-[13px] font-semibold text-[#64748b] font-inter text-left whitespace-nowrap"
                                style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                              >
                                {req.companyCode}
                              </td>
                              <td
                                className="py-3 px-3 text-[13px] font-extrabold text-[#0c0d0f] font-roboto text-right whitespace-nowrap"
                                style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                              >
                                {req.amount}
                              </td>
                              <td
                                className="py-3 px-3 text-[13px] font-medium text-[#64748b] font-inter text-left whitespace-nowrap"
                                style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                              >
                                {req.requestedBy}
                              </td>
                              <td
                                className="py-3 px-3 text-[13px] font-medium text-[#64748b] font-inter text-left whitespace-nowrap"
                                style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                              >
                                {req.submittedDate}
                              </td>
                              <td
                                className="py-3 px-3 text-[13px] font-medium text-[#64748b] font-inter text-left whitespace-nowrap"
                                style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                              >
                                {(() => {
                                  if (req.dueDate) {
                                    if (req.dueDate.includes('-')) {
                                      const parts = req.dueDate.split('-');
                                      if (parts.length === 3) {
                                        const year = parseInt(parts[0]);
                                        const month = parseInt(parts[1]) - 1;
                                        const day = parseInt(parts[2]);
                                        const dObj = new Date(year, month, day);
                                        return dObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                                      }
                                    }
                                    return req.dueDate;
                                  }
                                  return 'N/A';
                                })()}
                              </td>
                              <td
                                className="py-3 px-3 text-left whitespace-nowrap"
                                style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                              >
                                {getStatusBadge(req.status)}
                              </td>
                              <td
                                className="py-3 px-3 text-left whitespace-nowrap"
                                style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                              >
                                <button
                                  onClick={() => handleViewDetails(req)}
                                  className="inline-flex items-center text-[13px] font-bold text-[#242e69] hover:text-[#f59e0b] hover:underline transition-all cursor-pointer font-inter whitespace-nowrap"
                                  style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}
                                >
                                  View Details &rarr;
                                </button>
                              </td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {totalItems > 0 && (
                  <div className="px-6 py-4 flex justify-between items-center border-t border-[#e2e8f0] font-sans">
                    <span className="text-[12px] text-[#64748b] font-normal font-sans">
                      Showing {startRange} to {endRange} of {totalItems}{" "}
                      {activeTab === "all" ? "total" : activeTab} requests
                    </span>
                    <div className="flex items-center space-x-1.5 text-[12px] font-bold font-inter">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={validCurrentPage === 1}
                        className={`px-3 py-1.5 border border-[#e2e8f0] rounded-lg transition-all ${validCurrentPage === 1
                          ? "text-slate-300 bg-gray-50/50 cursor-not-allowed border-[#f1f5f9]"
                          : "text-[#475569] hover:bg-gray-50 cursor-pointer"
                          }`}
                      >
                        Previous
                      </button>

                      {paginationRange.map((page, pageIdx) =>
                        page === "ellipsis" ? (
                          <span
                            key={`ellipsis-${pageIdx}`}
                            className="w-8 h-8 flex items-center justify-center text-[#94a3b8] select-none"
                          >
                            &hellip;
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg border transition-all cursor-pointer ${validCurrentPage === page
                              ? "border-[#f59e0b] bg-[#f59e0b] text-white font-bold"
                              : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-gray-50 font-semibold"
                              }`}
                          >
                            {page}
                          </button>
                        )
                      )}

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={validCurrentPage === totalPages}
                        className={`px-3 py-1.5 border border-[#e2e8f0] rounded-lg transition-all ${validCurrentPage === totalPages
                          ? "text-slate-300 bg-gray-50/50 cursor-not-allowed border-[#f1f5f9]"
                          : "text-[#475569] hover:bg-gray-50 cursor-pointer"
                          }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
            </>
          )}
        </div>
      </main>

      {/* Invoice Details Modal */}
      <InvoiceDetailsModal
        selectedInvoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      {/* Payment Proof Viewer Modal */}
      {viewingProofBase64 && (
        <div
          className="fixed inset-0 bg-[#0c0d0f]/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-fade-in"
          onClick={() => setViewingProofBase64(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">Payment Transfer Photo / PDF</h3>
              <button
                onClick={() => setViewingProofBase64(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-[18px] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center overflow-y-auto w-full" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              {viewingProofBase64.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingProofBase64}
                  title="Payment Proof PDF"
                  className="w-full h-[60vh] border border-slate-200 rounded-lg shadow-sm"
                />
              ) : (
                <img
                  src={viewingProofBase64}
                  alt="Payment Proof Full Size"
                  className="max-w-full h-auto rounded-lg shadow-sm"
                />
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-white">
              {viewingProofBase64.startsWith('data:application/pdf') ? (
                <a
                  href={viewingProofBase64}
                  download={`payment-proof-${selectedRequest?.invoiceNo || 'document'}.pdf`}
                  className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-lg text-[12px] cursor-pointer transition-all shadow-sm font-sans"
                >
                  Download PDF
                </a>
              ) : (
                <a
                  href={viewingProofBase64}
                  download={`payment-proof-${selectedRequest?.invoiceNo || 'document'}.jpg`}
                  className="px-4 py-2 bg-[#007aff] hover:bg-[#006ee0] text-white font-bold rounded-lg text-[12px] cursor-pointer transition-all shadow-sm font-sans"
                >
                  Download Image
                </a>
              )}
              <button
                onClick={() => setViewingProofBase64(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12px] rounded-lg transition-all font-sans cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showPaymentConfirm && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(226, 232, 240, 0.65)" }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl border border-[#e2e8f0]">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-[#f59e0b] border border-[#fef3c7]/60">
              <AlertCircle className="w-6 h-6 text-[#f59e0b]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[18px] font-bold text-[#0c0d0f] font-sans">Are you sure?</h4>
              <p className="text-[13px] text-slate-400 font-sans leading-relaxed">Do you want to mark this as paid?</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowPaymentConfirm(false)}
                className="py-2 bg-slate-100 text-slate-600 rounded-lg text-[13px] font-bold hover:bg-slate-200 transition-all cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmPayment()}
                className="py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg text-[13px] font-bold transition-all cursor-pointer font-sans"
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showPaymentSuccess && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in"
        >
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-[#e2e8f0] animate-scale-up font-sans">
            <div className="w-16 h-16 bg-[#e6f4ea] text-[#137333] rounded-full flex items-center justify-center mx-auto border border-[#ceead6]">
              <Check className="w-8 h-8 stroke-[3px]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-[#0c0d0f] font-sans">Confirmation Marked as Paid!</h3>
              <p className="text-[14px] text-slate-500 font-sans leading-relaxed">
                The transaction has been successfully recorded.
              </p>
            </div>
            <button
              onClick={() => setShowPaymentSuccess(false)}
              className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[14px] font-bold transition-all cursor-pointer font-sans shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in"
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-[#e2e8f0]">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-[#f59e0b] border border-[#fef3c7]/60">
              <AlertCircle className="w-6 h-6 text-[#f59e0b]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[18px] font-bold text-[#0c0d0f] font-sans">Archive Request?</h4>
              <p className="text-[13px] text-slate-400 font-sans leading-relaxed">
                Are you sure you want to archive this invoice request? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 font-inter">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[13px] font-bold hover:bg-slate-200 transition-all cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmArchive()}
                className="py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[13px] font-bold transition-all cursor-pointer font-sans shadow-sm"
              >
                Yes, Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Success Modal */}
      {showArchiveSuccess && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in"
        >
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-[#e2e8f0] animate-scale-up font-sans">
            <div className="w-16 h-16 bg-[#e6f4ea] text-[#137333] rounded-full flex items-center justify-center mx-auto border border-[#ceead6]">
              <Check className="w-8 h-8 stroke-[3px]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-[#0c0d0f] font-sans">Confirmation Request Archived!</h3>
              <p className="text-[14px] text-slate-500 font-sans leading-relaxed">
                The confirmation request has been successfully archived.
              </p>
            </div>
            <button
              onClick={() => {
                setShowArchiveSuccess(false);
                setSelectedRequest(null);
              }}
              className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[14px] font-bold transition-all cursor-pointer font-sans shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-slate-900/40"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-[#e2e8f0]">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-[16px] font-bold text-[#0c0d0f]">Provide Rejection Reason</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-slate-500">Reason of Rejection</label>
              <textarea
                rows={3}
                placeholder="Enter the reason why this invoice is rejected..."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-[13px] focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-[13px] font-bold hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-[13px] font-bold hover:bg-red-700 transition-all cursor-pointer"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Invoice Modal */}
      {showSendInvoiceModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-[#e2e8f0]">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#f59e0b]" />
                <span>Send Confirmation to Client</span>
              </h3>
              <button
                onClick={() => setShowSendInvoiceModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 font-sans">
              <p className="text-[13px] text-slate-500 leading-relaxed">
                This will automatically generate a beautifully styled HTML confirmation document and send it directly to the customer's billing email.
              </p>
              
              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-slate-500">Recipient Email Address</label>
                <input
                  type="email"
                  placeholder="billing@client.com"
                  value={clientEmailInput}
                  onChange={(e) => setClientEmailInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-[13px] focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              {sendEmailError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[12px] rounded-xl font-medium">
                  {sendEmailError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSendInvoiceModal(false)}
                disabled={isSendingEmail}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[13px] font-bold hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvoiceEmail}
                disabled={isSendingEmail || !clientEmailInput}
                className="px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[13px] font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Success Modal */}
      {showSendSuccessModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in"
        >
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-[#e2e8f0] animate-scale-up font-sans">
            <div className="w-16 h-16 bg-[#e6f4ea] text-[#137333] rounded-full flex items-center justify-center mx-auto border border-[#ceead6]">
              <Check className="w-8 h-8 stroke-[3px]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-[#0c0d0f] font-sans">Confirmation Sent!</h3>
              <p className="text-[14px] text-slate-500 font-sans leading-relaxed">
                The confirmation email has been successfully sent to <strong>{clientEmailInput}</strong>.
              </p>
            </div>
            <button
              onClick={() => setShowSendSuccessModal(false)}
              className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[14px] font-bold transition-all cursor-pointer font-sans shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Hidden Print Area for Reservation Confirmation */}
      {selectedRequest && requestAsInvoice && (
        <ReservationConfirmationPrint
          invoice={requestAsInvoice}
          details={getInvoiceDetails(requestAsInvoice)}
        />
      )}

      {/* Styles for print overrides */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: portrait;
            margin: 6mm 10mm;
          }
          html, body, #root {
            height: 100% !important;
            overflow: hidden !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #reservation-confirmation-print-area, #reservation-confirmation-print-area * {
            visibility: visible !important;
          }
          #reservation-confirmation-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
};

export default Requests;
