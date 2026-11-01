export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  lastLoginAt: string | null;
}

export interface Customer {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
  status: 'active' | 'archived';
  domainsCount?: number;
  totalInvoiced?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RenewalRecord {
  id: string;
  date: string;
  previousExpirationDate: string;
  newExpirationDate: string;
  price: number;
  currency: string;
  recordedBy: string;
  notes?: string;
}

export interface Domain {
  id: string;
  domainName: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  registrationDate: string;
  expirationDate: string;
  daysLeft: number;
  renewalPrice: number;
  currency: string;
  registrationPeriodYears: number;
  registrar?: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Renewed' | 'Cancelled';
  notes?: string;
  renewalHistory: RenewalRecord[];
  sentReminders: Array<{ intervalDays: number; sentAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  documentNumber: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
  status: 'Draft' | 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
  notes?: string;
  paymentInstructions?: string;
  terms?: string;
  quotationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  documentNumber: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  issueDate: string;
  expiryDate: string;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  convertedInvoiceId?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Telebirr' | 'CBE Birr' | 'Awash Bank' | 'Other';
  referenceNumber?: string;
  recordedBy: string;
  notes?: string;
  status: 'Pending' | 'Confirmed' | 'Failed' | 'Reversed';
  reversalReason?: string;
  reversedAt?: string;
  reversedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageLog {
  id: string;
  customerId?: string;
  customerName?: string;
  destination: string;
  channel: 'sms' | 'email';
  messageType: 'welcome' | 'domain_reminder' | 'payment_confirmation' | 'invoice_reminder' | 'test' | 'manual' | 'broadcast';
  content: string;
  status: 'Queued' | 'Sent' | 'Delivered' | 'Failed';
  providerReference?: string;
  errorDetails?: string;
  sentAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'customer' | 'domain' | 'payment' | 'invoice' | 'quotation' | 'settings' | 'auth' | 'message';
  entityId?: string;
  details: string;
  performedBy: string;
  timestamp: string;
}

export interface AppSettings {
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    taxNumber: string;
    bankDetails: string;
  };
  sms: {
    provider: string;
    apiUrl: string;
    apiKey: string;
    hasApiKey?: boolean;
    senderId: string;
    enabled: boolean;
  };
  email: {
    provider: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    senderEmail: string;
    senderName: string;
    enabled: boolean;
  };
  system: {
    defaultCurrency: string;
    timeZone: string;
    reminderIntervals: number[];
    autoSendWelcomeSMS: boolean;
    autoSendWelcomeEmail: boolean;
    autoSendPaymentConfirmSMS: boolean;
    autoSendPaymentConfirmEmail: boolean;
    sessionTimeoutMinutes: number;
    defaultVatRate: number;
  };
  templates: {
    welcomeSMS: string;
    domainReminderSMS: string;
    paymentConfirmationSMS: string;
    invoiceReminderSMS: string;
    welcomeEmailSubject: string;
    welcomeEmailBody: string;
    domainReminderEmailSubject: string;
    domainReminderEmailBody: string;
    paymentConfirmationEmailSubject: string;
    paymentConfirmationEmailBody: string;
  };
}

export interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  activeDomains: number;
  expiringSoonDomains: number;
  expiredDomains: number;
  totalPaymentsReceived: number;
  totalInvoicedAmount: number;
  totalOutstandingBalance: number;
  unpaidInvoicesCount: number;
  overdueInvoicesCount: number;
  pendingQuotationsCount: number;
}
