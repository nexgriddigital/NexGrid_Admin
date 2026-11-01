import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Admin,
  Customer,
  Domain,
  Invoice,
  Quotation,
  Payment,
  MessageLog,
  AuditLog,
  AppSettings,
  Session,
} from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DIR = path.resolve(DATA_DIR, 'backups');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

export interface DatabaseSchema {
  admins: Admin[];
  customers: Customer[];
  domains: Domain[];
  invoices: Invoice[];
  quotations: Quotation[];
  payments: Payment[];
  messageLogs: MessageLog[];
  auditLogs: AuditLog[];
  settings: AppSettings;
  sessions: Session[];
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function getDefaultSettings(): AppSettings {
  return {
    company: {
      name: 'NexGrid Digital Systems',
      email: 'billing@nexgrid.et',
      phone: '+251 91 123 4567',
      address: 'Bole Sub-City, Mickey Leland St, Addis Ababa, Ethiopia',
      website: 'https://nexgrid.et',
      taxNumber: 'TIN-008923412',
      bankDetails: 'Commercial Bank of Ethiopia (CBE): 1000234890123 / Awash Bank: 01320489123000 / Telebirr: 0911234567',
    },
    sms: {
      provider: 'SMS Ethiopia (sms.et)',
      apiUrl: 'https://smsethiopia.com/api/sms/send',
      apiKey: '',
      senderId: 'NEXGRID',
      enabled: false,
    },
    email: {
      provider: 'SMTP',
      smtpHost: 'mail.nexgrid.et',
      smtpPort: 587,
      smtpUser: 'notifications@nexgrid.et',
      senderEmail: 'notifications@nexgrid.et',
      senderName: 'NexGrid Digital Systems',
      enabled: false,
    },
    system: {
      defaultCurrency: 'ETB',
      timeZone: 'Africa/Addis_Ababa',
      reminderIntervals: [30, 14, 7, 3, 1],
      autoSendWelcomeSMS: true,
      autoSendWelcomeEmail: true,
      autoSendPaymentConfirmSMS: true,
      autoSendPaymentConfirmEmail: true,
      sessionTimeoutMinutes: 60,
      defaultVatRate: 15,
    },
    templates: {
      welcomeSMS:
        'Hello [Customer Name], welcome to NexGrid Digital Systems! Thank you for choosing our services. For assistance, contact us at +251 91 123 4567.',
      domainReminderSMS:
        'Hello [Customer Name], your domain [Domain Name] expires on [Expiration Date]. Renewal price: [Amount] [Currency]. Please contact NexGrid Digital Systems to arrange renewal.',
      paymentConfirmationSMS:
        'Hello [Customer Name], we have confirmed your payment of [Amount] [Currency] received on [Payment Date] for [Service/Invoice Number]. Remaining balance: [Balance] [Currency]. Thank you for choosing NexGrid Digital Systems.',
      invoiceReminderSMS:
        'Hello [Customer Name], this is a reminder that invoice [Invoice Number] for [Amount] [Currency] is due on [Due Date]. Please arrange payment at your earliest convenience.',
      welcomeEmailSubject: 'Welcome to NexGrid Digital Systems',
      welcomeEmailBody:
        'Dear [Customer Name],\n\nWelcome to NexGrid Digital Systems! We are thrilled to manage your enterprise digital infrastructure, domains, and web hosting.\n\nYour Customer ID is [Customer ID].\nIf you have any questions, feel free to reply to this email or call +251 91 123 4567.\n\nWarm regards,\nNexGrid Digital Systems Billing & Operations Team',
      domainReminderEmailSubject: 'Domain Renewal Notice: [Domain Name]',
      domainReminderEmailBody:
        'Dear [Customer Name],\n\nThis is an automated notification from NexGrid Digital Systems that your domain name [Domain Name] is scheduled to expire on [Expiration Date] ([Days Left] days remaining).\n\nRenewal Amount: [Amount] [Currency]\nRegistrar: [Registrar]\n\nTo ensure zero disruption to your email and online services, please settle the renewal balance via CBE, Awash Bank, or Telebirr and share the payment confirmation with us.\n\nBest regards,\nNexGrid Digital Systems Domain Management Desk',
      paymentConfirmationEmailSubject: 'Payment Receipt: [Payment Number] - [Amount] [Currency]',
      paymentConfirmationEmailBody:
        'Dear [Customer Name],\n\nWe have received and confirmed your payment of [Amount] [Currency] on [Payment Date].\nPayment Method: [Payment Method]\nReference: [Reference Number]\nCovering: [Service/Invoice Number]\nRemaining Account Balance: [Balance] [Currency]\n\nThank you for your business!\n\nSincerely,\nNexGrid Digital Systems Accounts Department',
    },
  };
}

function getInitialSeedData(): DatabaseSchema {
  const salt = generateSalt();
  const passwordHash = hashPassword('Admin@NexGrid2026!', salt);

  const defaultAdmin: Admin = {
    id: 'ADM-1001',
    username: 'admin',
    email: 'nexgriddigital@gmail.com',
    passwordHash,
    salt,
    fullName: 'NexGrid System Administrator',
    role: 'super_admin',
    createdAt: '2026-01-10T08:00:00Z',
    lastLoginAt: null,
  };

  const customers: Customer[] = [
    {
      id: 'CUST-1001',
      businessName: 'Abyssinia Logistics PLC',
      contactPerson: 'Dawit Hailu',
      phone: '+251911456789',
      email: 'dawit@abyssinialogistics.com',
      address: 'Kirkos Sub-City, Debrezeit Road, Addis Ababa',
      notes: 'Key enterprise freight and forwarding client with 3 custom domain systems.',
      status: 'active',
      createdAt: '2026-01-15T09:30:00Z',
      updatedAt: '2026-01-15T09:30:00Z',
    },
    {
      id: 'CUST-1002',
      businessName: 'Entoto Highland Coffee Exporters',
      contactPerson: 'Sara Mengistu',
      phone: '+251922334455',
      email: 'sara@entotocoffee.et',
      address: 'Bole Medhanealem, Addis Ababa',
      notes: 'Specialty coffee export house. Requires automated annual domain and cloud email renewal.',
      status: 'active',
      createdAt: '2026-02-01T11:00:00Z',
      updatedAt: '2026-02-01T11:00:00Z',
    },
    {
      id: 'CUST-1003',
      businessName: 'Addis Cloud Software Labs',
      contactPerson: 'Yonas Tadesse',
      phone: '+251933887766',
      email: 'yonas@addiscloud.io',
      address: 'Kazanchis Tech Hub, Addis Ababa',
      notes: 'Software engineering agency.',
      status: 'active',
      createdAt: '2026-03-05T14:20:00Z',
      updatedAt: '2026-03-05T14:20:00Z',
    },
    {
      id: 'CUST-1004',
      businessName: 'Sheba Heritage Tours & Travel',
      contactPerson: 'Tigist Bekele',
      phone: '+251944556677',
      email: 'tigist@shebatours.com',
      address: 'Piazza, Arada Sub-City, Addis Ababa',
      notes: 'Boutique travel agency. Domain expired recently, renewal follow-up pending.',
      status: 'active',
      createdAt: '2025-10-10T10:00:00Z',
      updatedAt: '2026-10-10T10:00:00Z',
    },
  ];

  // Dates calculated relative to current 2026-10-13
  const domains: Domain[] = [
    {
      id: 'DOM-1001',
      domainName: 'abyssinialogistics.com',
      customerId: 'CUST-1001',
      registrationDate: '2023-10-20',
      expirationDate: '2026-10-20', // in 7 days!
      renewalPrice: 3850,
      currency: 'ETB',
      registrationPeriodYears: 1,
      registrar: 'Ethio Telecom / OpenSRS',
      status: 'Expiring Soon',
      notes: 'Primary business domain. Auto reminder due.',
      renewalHistory: [
        {
          id: 'REN-01',
          date: '2025-10-18',
          previousExpirationDate: '2025-10-20',
          newExpirationDate: '2026-10-20',
          price: 3500,
          currency: 'ETB',
          recordedBy: 'admin',
          notes: 'Renewed for 1 year',
        },
      ],
      sentReminders: [],
      createdAt: '2023-10-20T08:00:00Z',
      updatedAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 'DOM-1002',
      domainName: 'abyssiniafreight.et',
      customerId: 'CUST-1001',
      registrationDate: '2024-10-27',
      expirationDate: '2026-10-27', // in 14 days!
      renewalPrice: 2400,
      currency: 'ETB',
      registrationPeriodYears: 1,
      registrar: 'Ethio Telecom (.et Registry)',
      status: 'Expiring Soon',
      notes: 'Local ccTLD for local cargo tracking portal.',
      renewalHistory: [],
      sentReminders: [],
      createdAt: '2024-10-27T08:00:00Z',
      updatedAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 'DOM-1003',
      domainName: 'entotocoffee.et',
      customerId: 'CUST-1002',
      registrationDate: '2025-11-15',
      expirationDate: '2026-11-15', // in ~33 days
      renewalPrice: 2800,
      currency: 'ETB',
      registrationPeriodYears: 1,
      registrar: 'Ethio Telecom (.et Registry)',
      status: 'Active',
      notes: 'Official coffee export domain and web portal.',
      renewalHistory: [],
      sentReminders: [],
      createdAt: '2025-11-15T09:00:00Z',
      updatedAt: '2026-05-10T09:00:00Z',
    },
    {
      id: 'DOM-1004',
      domainName: 'addiscloud.io',
      customerId: 'CUST-1003',
      registrationDate: '2025-12-01',
      expirationDate: '2027-12-01', // active long term
      renewalPrice: 4950,
      currency: 'ETB',
      registrationPeriodYears: 2,
      registrar: 'Namecheap',
      status: 'Active',
      notes: 'Multi-year registration.',
      renewalHistory: [],
      sentReminders: [],
      createdAt: '2025-12-01T10:00:00Z',
      updatedAt: '2026-01-10T10:00:00Z',
    },
    {
      id: 'DOM-1005',
      domainName: 'shebatours.com',
      customerId: 'CUST-1004',
      registrationDate: '2024-10-05',
      expirationDate: '2026-10-05', // Expired 8 days ago
      renewalPrice: 3850,
      currency: 'ETB',
      registrationPeriodYears: 1,
      registrar: 'GoDaddy',
      status: 'Expired',
      notes: 'Grace period active until end of month. Reminder sent.',
      renewalHistory: [],
      sentReminders: [{ intervalDays: 1, sentAt: '2026-10-04T08:00:00Z' }],
      createdAt: '2024-10-05T09:00:00Z',
      updatedAt: '2026-10-06T09:00:00Z',
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'INV-1001',
      documentNumber: 'INV-2026-001',
      customerId: 'CUST-1001',
      issueDate: '2026-10-01',
      dueDate: '2026-10-18',
      currency: 'ETB',
      items: [
        {
          id: 'item-1',
          description: 'Domain Annual Renewal (abyssinialogistics.com)',
          quantity: 1,
          unitPrice: 3850,
          lineTotal: 3850,
        },
        {
          id: 'item-2',
          description: 'Domain Annual Renewal (abyssiniafreight.et)',
          quantity: 1,
          unitPrice: 2400,
          lineTotal: 2400,
        },
      ],
      subtotal: 6250,
      discount: 250,
      taxRate: 15,
      taxAmount: 900,
      totalAmount: 6900,
      totalPaid: 3000,
      balanceDue: 3900,
      status: 'Partially Paid',
      notes: 'Client made advance partial payment of 3,000 ETB via CBE.',
      paymentInstructions: 'Bank Transfer to CBE Acc: 1000234890123 (NexGrid Digital Systems)',
      terms: 'Payment due within 15 days of invoice date. DNS records subject to suspension upon expiry.',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-05T08:00:00Z',
    },
    {
      id: 'INV-1002',
      documentNumber: 'INV-2026-002',
      customerId: 'CUST-1002',
      issueDate: '2026-09-15',
      dueDate: '2026-09-30',
      currency: 'ETB',
      items: [
        {
          id: 'item-1',
          description: 'Business Hosting Tier 2 (Annual)',
          quantity: 1,
          unitPrice: 12500,
          lineTotal: 12500,
        },
      ],
      subtotal: 12500,
      discount: 0,
      taxRate: 15,
      taxAmount: 1875,
      totalAmount: 14375,
      totalPaid: 14375,
      balanceDue: 0,
      status: 'Paid',
      notes: 'Paid in full via Awash Bank transfer.',
      paymentInstructions: 'Awash Bank: 01320489123000',
      terms: 'Service active for 365 days from activation.',
      createdAt: '2026-09-15T09:00:00Z',
      updatedAt: '2026-09-18T10:00:00Z',
    },
    {
      id: 'INV-1003',
      documentNumber: 'INV-2026-003',
      customerId: 'CUST-1004',
      issueDate: '2026-09-20',
      dueDate: '2026-10-04',
      currency: 'ETB',
      items: [
        {
          id: 'item-1',
          description: 'Domain Renewal & DNS Management (shebatours.com)',
          quantity: 1,
          unitPrice: 3850,
          lineTotal: 3850,
        },
      ],
      subtotal: 3850,
      discount: 0,
      taxRate: 15,
      taxAmount: 577.5,
      totalAmount: 4427.5,
      totalPaid: 0,
      balanceDue: 4427.5,
      status: 'Overdue',
      notes: 'Payment overdue. Follow up required.',
      paymentInstructions: 'Telebirr: 0911234567 or CBE: 1000234890123',
      terms: 'Immediate settlement required to reinstate service.',
      createdAt: '2026-09-20T08:00:00Z',
      updatedAt: '2026-10-05T08:00:00Z',
    },
  ];

  const quotations: Quotation[] = [
    {
      id: 'QUO-1001',
      documentNumber: 'QT-2026-001',
      customerId: 'CUST-1003',
      issueDate: '2026-10-08',
      expiryDate: '2026-10-28',
      currency: 'ETB',
      items: [
        {
          id: 'qitem-1',
          description: 'Enterprise Cloud Server Setup & Migration',
          quantity: 1,
          unitPrice: 35000,
          lineTotal: 35000,
        },
        {
          id: 'qitem-2',
          description: 'SSL Wildcard Security Certificate (2-Year)',
          quantity: 1,
          unitPrice: 7500,
          lineTotal: 7500,
        },
      ],
      subtotal: 42500,
      discount: 2500,
      taxRate: 15,
      taxAmount: 6000,
      totalAmount: 46000,
      status: 'Sent',
      notes: 'Custom proposal submitted to Yonas Tadesse for review.',
      terms: 'Quotation valid for 20 calendar days from issue date.',
      createdAt: '2026-10-08T11:00:00Z',
      updatedAt: '2026-10-08T11:00:00Z',
    },
  ];

  const payments: Payment[] = [
    {
      id: 'PAY-1001',
      paymentNumber: 'REC-2026-001',
      customerId: 'CUST-1001',
      invoiceId: 'INV-1001',
      amount: 3000,
      currency: 'ETB',
      paymentDate: '2026-10-05T14:30:00Z',
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'CBE-FT26278X90',
      recordedBy: 'admin',
      notes: 'Initial partial payment for annual domain renewal package.',
      status: 'Confirmed',
      createdAt: '2026-10-05T14:30:00Z',
      updatedAt: '2026-10-05T14:30:00Z',
    },
    {
      id: 'PAY-1002',
      paymentNumber: 'REC-2026-002',
      customerId: 'CUST-1002',
      invoiceId: 'INV-1002',
      amount: 14375,
      currency: 'ETB',
      paymentDate: '2026-09-18T10:00:00Z',
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'AWASH-TX-9901842',
      recordedBy: 'admin',
      notes: 'Full payment for Business Hosting Tier 2.',
      status: 'Confirmed',
      createdAt: '2026-09-18T10:00:00Z',
      updatedAt: '2026-09-18T10:00:00Z',
    },
    {
      id: 'PAY-1003',
      paymentNumber: 'REC-2026-003',
      customerId: 'CUST-1003',
      amount: 8400,
      currency: 'ETB',
      paymentDate: '2026-06-12T11:20:00Z',
      paymentMethod: 'Telebirr',
      referenceNumber: 'TB-62018841',
      recordedBy: 'admin',
      notes: 'Semi-annual VPS server maintenance and DNS support.',
      status: 'Confirmed',
      createdAt: '2026-06-12T11:20:00Z',
      updatedAt: '2026-06-12T11:20:00Z',
    },
    {
      id: 'PAY-1004',
      paymentNumber: 'REC-2026-004',
      customerId: 'CUST-1001',
      amount: 12850,
      currency: 'ETB',
      paymentDate: '2026-07-19T14:15:00Z',
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'CBE-FT7219901',
      recordedBy: 'admin',
      notes: 'Enterprise multi-domain SSL certificate installations.',
      status: 'Confirmed',
      createdAt: '2026-07-19T14:15:00Z',
      updatedAt: '2026-07-19T14:15:00Z',
    },
    {
      id: 'PAY-1005',
      paymentNumber: 'REC-2026-005',
      customerId: 'CUST-1004',
      amount: 19200,
      currency: 'ETB',
      paymentDate: '2026-08-25T09:40:00Z',
      paymentMethod: 'Awash Bank',
      referenceNumber: 'AWASH-TX-8472910',
      recordedBy: 'admin',
      notes: 'Annual cloud hosting infrastructure renewal.',
      status: 'Confirmed',
      createdAt: '2026-08-25T09:40:00Z',
      updatedAt: '2026-08-25T09:40:00Z',
    },
    {
      id: 'PAY-1006',
      paymentNumber: 'REC-2026-006',
      customerId: 'CUST-1002',
      amount: 18500,
      currency: 'ETB',
      paymentDate: '2026-10-22T16:05:00Z',
      paymentMethod: 'Telebirr',
      referenceNumber: 'TB-10294821',
      recordedBy: 'admin',
      notes: 'Cloud mail backup & high-availability cluster setup.',
      status: 'Confirmed',
      createdAt: '2026-10-22T16:05:00Z',
      updatedAt: '2026-10-22T16:05:00Z',
    },
    {
      id: 'PAY-1007',
      paymentNumber: 'REC-2026-007',
      customerId: 'CUST-1001',
      amount: 7500,
      currency: 'ETB',
      paymentDate: '2026-11-01T10:10:00Z',
      paymentMethod: 'Telebirr',
      referenceNumber: 'TB-11019234',
      recordedBy: 'admin',
      notes: 'November retainer and DNS redundancy monitoring.',
      status: 'Confirmed',
      createdAt: '2026-11-01T10:10:00Z',
      updatedAt: '2026-11-01T10:10:00Z',
    },
  ];

  const messageLogs: MessageLog[] = [
    {
      id: 'MSG-1001',
      customerId: 'CUST-1001',
      customerName: 'Abyssinia Logistics PLC',
      destination: '+251911456789',
      channel: 'sms',
      messageType: 'welcome',
      content:
        'Hello Dawit Hailu, welcome to NexGrid Digital Systems! Thank you for choosing our services. For assistance, contact us at +251 91 123 4567.',
      status: 'Sent',
      providerReference: 'SMSET-TX-84920',
      createdAt: '2026-01-15T09:31:00Z',
      sentAt: '2026-01-15T09:31:02Z',
    },
    {
      id: 'MSG-1002',
      customerId: 'CUST-1001',
      customerName: 'Abyssinia Logistics PLC',
      destination: '+251911456789',
      channel: 'sms',
      messageType: 'payment_confirmation',
      content:
        'Hello Dawit Hailu, we have confirmed your payment of 3,000 ETB received on 2026-10-05 for INV-2026-001. Remaining balance: 3,900 ETB. Thank you for choosing NexGrid Digital Systems.',
      status: 'Sent',
      providerReference: 'SMSET-TX-91024',
      createdAt: '2026-10-05T14:31:00Z',
      sentAt: '2026-10-05T14:31:03Z',
    },
    {
      id: 'MSG-1003',
      customerId: 'CUST-1004',
      customerName: 'Sheba Heritage Tours & Travel',
      destination: '+251944556677',
      channel: 'sms',
      messageType: 'domain_reminder',
      content:
        'Hello Tigist Bekele, your domain shebatours.com expires on 2026-10-05. Renewal price: 3850 ETB. Please contact NexGrid Digital Systems to arrange renewal.',
      status: 'Sent',
      providerReference: 'SMSET-TX-94812',
      createdAt: '2026-10-04T08:00:00Z',
      sentAt: '2026-10-04T08:00:02Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'AUD-1001',
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'settings',
      entityId: 'SYSTEM',
      details: 'NexGrid Admin Portal initialized with security policies and Ethiopian timezone configuration.',
      performedBy: 'System',
      timestamp: '2026-01-10T08:00:00Z',
    },
    {
      id: 'AUD-1002',
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: 'CUST-1001',
      details: 'Created customer record for Abyssinia Logistics PLC (+251911456789)',
      performedBy: 'admin',
      timestamp: '2026-01-15T09:30:00Z',
    },
    {
      id: 'AUD-1003',
      action: 'PAYMENT_CONFIRMED',
      entityType: 'payment',
      entityId: 'PAY-1001',
      details: 'Confirmed partial payment of 3,000 ETB against invoice INV-2026-001 via CBE-FT26278X90',
      performedBy: 'admin',
      timestamp: '2026-10-05T14:30:00Z',
    },
  ];

  return {
    admins: [defaultAdmin],
    customers,
    domains,
    invoices,
    quotations,
    payments,
    messageLogs,
    auditLogs,
    settings: getDefaultSettings(),
    sessions: [],
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDirectories();
    this.data = this.loadDatabase();
  }

  private ensureDataDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all required collections exist
        const defaultData = getInitialSeedData();
        const loadedAdmins: Admin[] = (parsed.admins && parsed.admins.length > 0)
          ? parsed.admins
          : defaultData.admins;

        // Ensure default root super-admin is ALWAYS preserved
        const hasRootAdmin = loadedAdmins.some(
          (a) => a.username?.toLowerCase() === 'admin' || a.email?.toLowerCase() === 'nexgriddigital@gmail.com'
        );
        if (!hasRootAdmin) {
          loadedAdmins.unshift(defaultData.admins[0]);
        }

        const loadedPayments: Payment[] = parsed.payments || [];
        defaultData.payments.forEach((seedPay) => {
          if (!loadedPayments.some((p: Payment) => p.id === seedPay.id)) {
            loadedPayments.push(seedPay);
          }
        });

        return {
          admins: loadedAdmins,
          customers: parsed.customers || defaultData.customers,
          domains: parsed.domains || defaultData.domains,
          invoices: parsed.invoices || defaultData.invoices,
          quotations: parsed.quotations || defaultData.quotations,
          payments: loadedPayments,
          messageLogs: parsed.messageLogs || defaultData.messageLogs,
          auditLogs: parsed.auditLogs || defaultData.auditLogs,
          settings: { ...defaultData.settings, ...(parsed.settings || {}) },
          sessions: parsed.sessions || [],
        };
      } catch (err) {
        console.error('Failed to parse database file, rebuilding from defaults:', err);
      }
    }

    const initial = getInitialSeedData();
    this.saveDatabase(initial);
    return initial;
  }

  public saveDatabase(dataToSave?: DatabaseSchema) {
    this.ensureDataDirectories();
    const data = dataToSave || this.data;

    // Safety guard: guarantee root admin is NEVER lost when persisting
    if (!data.admins || data.admins.length === 0) {
      data.admins = getInitialSeedData().admins;
    } else {
      const hasRoot = data.admins.some(
        (a) => a.username?.toLowerCase() === 'admin' || a.email?.toLowerCase() === 'nexgriddigital@gmail.com'
      );
      if (!hasRoot) {
        data.admins.unshift(getInitialSeedData().admins[0]);
      }
    }

    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, content, 'utf-8');
  }

  // --- Read & Write operations ---
  public getData(): DatabaseSchema {
    return this.data;
  }

  // Admins
  public getAdmins(): Admin[] {
    if (!this.data.admins || this.data.admins.length === 0) {
      this.data.admins = getInitialSeedData().admins;
      this.saveDatabase();
    }
    return this.data.admins;
  }

  public getAdminByUsernameOrEmail(identifier: string): Admin | undefined {
    const lower = identifier.toLowerCase().trim();
    const found = this.getAdmins().find(
      (a) => a.username.toLowerCase() === lower || a.email.toLowerCase() === lower
    );
    if (found) return found;

    // Fallback: If default root admin is queried but was missing, restore it immediately
    if (lower === 'admin' || lower === 'nexgriddigital@gmail.com') {
      const defaultAdmin = getInitialSeedData().admins[0];
      this.data.admins.unshift(defaultAdmin);
      this.saveDatabase();
      return defaultAdmin;
    }

    return undefined;
  }

  public getAdminById(id: string): Admin | undefined {
    return this.getAdmins().find((a) => a.id === id);
  }

  public createAdmin(adminData: Omit<Admin, 'id' | 'createdAt' | 'lastLoginAt'>): Admin {
    const nextNum = 1000 + this.getAdmins().length + 1;
    const now = new Date().toISOString();
    const newAdmin: Admin = {
      ...adminData,
      id: `ADM-${nextNum}`,
      createdAt: now,
      lastLoginAt: null,
    };
    this.data.admins.push(newAdmin);
    this.saveDatabase();
    return newAdmin;
  }

  public updateAdmin(admin: Admin) {
    const idx = this.data.admins.findIndex((a) => a.id === admin.id);
    if (idx >= 0) {
      this.data.admins[idx] = admin;
      this.saveDatabase();
    }
  }

  // Sessions
  public getSessions(): Session[] {
    return this.data.sessions;
  }

  public addSession(session: Session) {
    this.data.sessions.push(session);
    this.saveDatabase();
  }

  public getSession(token: string): Session | undefined {
    return this.data.sessions.find((s) => s.token === token);
  }

  public updateSessionActivity(token: string, timeoutMinutes: number): boolean {
    const session = this.getSession(token);
    if (!session) return false;
    const now = Date.now();
    if (now > session.expiresAt) {
      this.removeSession(token);
      return false;
    }
    session.lastActivityAt = now;
    session.expiresAt = now + timeoutMinutes * 60 * 1000;
    this.saveDatabase();
    return true;
  }

  public removeSession(token: string) {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.saveDatabase();
  }

  public cleanExpiredSessions() {
    const now = Date.now();
    const beforeCount = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.expiresAt > now);
    if (this.data.sessions.length !== beforeCount) {
      this.saveDatabase();
    }
  }

  // Customers
  public getCustomers(): Customer[] {
    return this.data.customers;
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find((c) => c.id === id);
  }

  public findDuplicateCustomer(phone: string, email: string, excludeId?: string): Customer | undefined {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const cleanEmail = email.toLowerCase().trim();
    return this.data.customers.find((c) => {
      if (excludeId && c.id === excludeId) return false;
      const cPhone = c.phone.replace(/[^0-9+]/g, '');
      const cEmail = c.email.toLowerCase().trim();
      return (cPhone && cPhone === cleanPhone) || (cEmail && cEmail === cleanEmail);
    });
  }

  public createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Customer {
    const nextNum = 1000 + this.data.customers.length + 1;
    const now = new Date().toISOString();
    const customer: Customer = {
      ...customerData,
      id: `CUST-${nextNum}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.customers.push(customer);
    this.saveDatabase();
    return customer;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const idx = this.data.customers.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.customers[idx] = {
      ...this.data.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveDatabase();
    return this.data.customers[idx];
  }

  // Domains
  public getDomains(): Domain[] {
    return this.data.domains;
  }

  public getDomainById(id: string): Domain | undefined {
    return this.data.domains.find((d) => d.id === id);
  }

  public createDomain(domainData: Omit<Domain, 'id' | 'renewalHistory' | 'sentReminders' | 'createdAt' | 'updatedAt'>): Domain {
    const nextNum = 1000 + this.data.domains.length + 1;
    const now = new Date().toISOString();
    const domain: Domain = {
      ...domainData,
      id: `DOM-${nextNum}`,
      renewalHistory: [],
      sentReminders: [],
      createdAt: now,
      updatedAt: now,
    };
    this.data.domains.push(domain);
    this.saveDatabase();
    return domain;
  }

  public updateDomain(id: string, updates: Partial<Domain>): Domain | null {
    const idx = this.data.domains.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    this.data.domains[idx] = {
      ...this.data.domains[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveDatabase();
    return this.data.domains[idx];
  }

  // Invoices & Financial calculations
  public getInvoices(): Invoice[] {
    return this.data.invoices;
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.data.invoices.find((i) => i.id === id);
  }

  public createInvoice(invoiceData: Omit<Invoice, 'id' | 'totalPaid' | 'balanceDue' | 'createdAt' | 'updatedAt'>): Invoice {
    const nextNum = 1000 + this.data.invoices.length + 1;
    const now = new Date().toISOString();
    const invoice: Invoice = {
      ...invoiceData,
      id: `INV-${nextNum}`,
      totalPaid: 0,
      balanceDue: invoiceData.totalAmount,
      createdAt: now,
      updatedAt: now,
    };
    this.data.invoices.push(invoice);
    this.saveDatabase();
    return invoice;
  }

  public updateInvoice(id: string, updates: Partial<Invoice>): Invoice | null {
    const idx = this.data.invoices.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    this.data.invoices[idx] = {
      ...this.data.invoices[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.recalculateInvoiceBalance(id);
    this.saveDatabase();
    return this.data.invoices[idx];
  }

  public recalculateInvoiceBalance(invoiceId: string) {
    const invoice = this.data.invoices.find((i) => i.id === invoiceId);
    if (!invoice) return;

    // Sum ONLY confirmed payments
    const confirmedPayments = this.data.payments.filter(
      (p) => p.invoiceId === invoiceId && p.status === 'Confirmed'
    );
    const totalPaid = confirmedPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, invoice.totalAmount - totalPaid);

    invoice.totalPaid = totalPaid;
    invoice.balanceDue = balanceDue;

    if (invoice.status !== 'Cancelled') {
      if (totalPaid >= invoice.totalAmount && invoice.totalAmount > 0) {
        invoice.status = 'Paid';
      } else if (totalPaid > 0) {
        invoice.status = 'Partially Paid';
      } else {
        const dueDate = new Date(invoice.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          invoice.status = 'Overdue';
        } else if (invoice.status !== 'Draft') {
          invoice.status = 'Unpaid';
        }
      }
    }
    this.saveDatabase();
  }

  // Quotations
  public getQuotations(): Quotation[] {
    return this.data.quotations;
  }

  public getQuotationById(id: string): Quotation | undefined {
    return this.data.quotations.find((q) => q.id === id);
  }

  public createQuotation(quoData: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>): Quotation {
    const nextNum = 1000 + this.data.quotations.length + 1;
    const now = new Date().toISOString();
    const quotation: Quotation = {
      ...quoData,
      id: `QUO-${nextNum}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.quotations.push(quotation);
    this.saveDatabase();
    return quotation;
  }

  public updateQuotation(id: string, updates: Partial<Quotation>): Quotation | null {
    const idx = this.data.quotations.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    this.data.quotations[idx] = {
      ...this.data.quotations[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveDatabase();
    return this.data.quotations[idx];
  }

  // Payments
  public getPayments(): Payment[] {
    return this.data.payments;
  }

  public getPaymentById(id: string): Payment | undefined {
    return this.data.payments.find((p) => p.id === id);
  }

  public createPayment(paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Payment {
    const nextNum = 1000 + this.data.payments.length + 1;
    const now = new Date().toISOString();
    const payment: Payment = {
      ...paymentData,
      id: `PAY-${nextNum}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.payments.push(payment);
    if (payment.invoiceId) {
      this.recalculateInvoiceBalance(payment.invoiceId);
    }
    this.saveDatabase();
    return payment;
  }

  public updatePayment(id: string, updates: Partial<Payment>): Payment | null {
    const idx = this.data.payments.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.payments[idx] = {
      ...this.data.payments[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (this.data.payments[idx].invoiceId) {
      this.recalculateInvoiceBalance(this.data.payments[idx].invoiceId!);
    }
    this.saveDatabase();
    return this.data.payments[idx];
  }

  // Messages & Logs
  public getMessageLogs(): MessageLog[] {
    return this.data.messageLogs;
  }

  public addMessageLog(logData: Omit<MessageLog, 'id' | 'createdAt'>): MessageLog {
    const nextNum = 1000 + this.data.messageLogs.length + 1;
    const log: MessageLog = {
      ...logData,
      id: `MSG-${nextNum}`,
      createdAt: new Date().toISOString(),
    };
    this.data.messageLogs.unshift(log); // Most recent first
    this.saveDatabase();
    return log;
  }

  public updateMessageLog(id: string, updates: Partial<MessageLog>): MessageLog | null {
    const idx = this.data.messageLogs.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    this.data.messageLogs[idx] = {
      ...this.data.messageLogs[idx],
      ...updates,
    };
    this.saveDatabase();
    return this.data.messageLogs[idx];
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  public logAudit(action: string, entityType: AuditLog['entityType'], entityId: string, details: string, performedBy: string) {
    const nextNum = 1000 + this.data.auditLogs.length + 1;
    const log: AuditLog = {
      id: `AUD-${nextNum}`,
      action,
      entityType,
      entityId,
      details,
      performedBy,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log); // Most recent first
    this.saveDatabase();
  }

  // Settings
  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<AppSettings>): AppSettings {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
      company: { ...this.data.settings.company, ...(updates.company || {}) },
      sms: { ...this.data.settings.sms, ...(updates.sms || {}) },
      email: { ...this.data.settings.email, ...(updates.email || {}) },
      system: { ...this.data.settings.system, ...(updates.system || {}) },
      templates: { ...this.data.settings.templates, ...(updates.templates || {}) },
    };
    this.saveDatabase();
    return this.data.settings;
  }

  // Backup & Restore
  public createBackup(label?: string): { filename: string; timestamp: string; sizeBytes: number } {
    this.ensureDataDirectories();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `nexgrid-backup-${label ? `${label}-` : ''}${timestamp}.json`;
    const dest = path.resolve(BACKUP_DIR, filename);
    const content = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(dest, content, 'utf-8');
    const stats = fs.statSync(dest);
    return {
      filename,
      timestamp: new Date().toISOString(),
      sizeBytes: stats.size,
    };
  }

  public listBackups(): Array<{ filename: string; sizeBytes: number; createdAt: string }> {
    this.ensureDataDirectories();
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
    return files.map((file) => {
      const fullPath = path.resolve(BACKUP_DIR, file);
      const stat = fs.statSync(fullPath);
      return {
        filename: file,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString(),
      };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public restoreBackup(filename: string): boolean {
    const fullPath = path.resolve(BACKUP_DIR, path.basename(filename));
    if (!fs.existsSync(fullPath)) return false;
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    this.data = parsed;
    this.saveDatabase();
    return true;
  }

  public restoreFromRawJson(rawJson: string): boolean {
    const parsed = JSON.parse(rawJson) as DatabaseSchema;
    if (!parsed.admins || !parsed.customers || !parsed.domains) {
      throw new Error('Invalid NexGrid backup format: missing required core tables.');
    }
    // Create an automatic safety backup before overwriting
    this.createBackup('pre-restore-safety');
    this.data = parsed;
    this.saveDatabase();
    return true;
  }
}

export const db = new Database();
