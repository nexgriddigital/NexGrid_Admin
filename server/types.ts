export interface Admin {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  role: 'super_admin' | 'admin' | 'finance';
  createdAt: string;
  lastLoginAt: string | null;
  resetToken?: string | null;
  resetTokenExpiry?: string | null;
}

export interface Customer {
  id: string; // e.g., CUST-1001
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
  status: 'active' | 'archived';
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
  id: string; // e.g., DOM-1001
  domainName: string;
  customerId: string;
  registrationDate: string;
  expirationDate: string;
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
  id: string; // e.g., INV-1001
  documentNumber: string; // e.g., INV-2026-001
  customerId: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number; // percentage, e.g. 15 for 15% VAT
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
  id: string; // e.g., QUO-1001
  documentNumber: string; // e.g., QT-2026-001
  customerId: string;
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
  id: string; // e.g., PAY-1001
  paymentNumber: string; // e.g., REC-2026-001
  customerId: string;
  invoiceId?: string;
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
  destination: string; // phone or email
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
    provider: string; // e.g., 'sms.et'
    apiUrl: string;
    apiKey: string;
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
    reminderIntervals: number[]; // e.g. [30, 14, 7, 3, 1]
    autoSendWelcomeSMS: boolean;
    autoSendWelcomeEmail: boolean;
    autoSendPaymentConfirmSMS: boolean;
    autoSendPaymentConfirmEmail: boolean;
    sessionTimeoutMinutes: number;
    defaultVatRate: number; // e.g. 15%
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

export interface Session {
  token: string;
  adminId: string;
  username: string;
  role: string;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
}
