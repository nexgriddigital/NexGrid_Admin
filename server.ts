import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { db, hashPassword, generateSalt } from './server/db';
import {
  sendSmsNotification,
  sendEmailNotification,
  testSmsConnection,
  populateTemplate,
  normalizeEthiopianPhone,
} from './server/smsService';
import {
  startScheduler,
  getDaysUntilExpiration,
  runSchedulerCycle,
} from './server/scheduler';
import { Session, InvoiceItem } from './server/types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// --- Authentication Middleware ---
interface AuthenticatedRequest extends Request {
  sessionUser?: {
    adminId: string;
    username: string;
    role: string;
  };
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.substring(7);
  const session = db.getSession(token);

  if (!session) {
    return res.status(401).json({ error: 'Session invalid or expired. Please re-authenticate.' });
  }

  const settings = db.getSettings();
  const timeoutMinutes = settings.system.sessionTimeoutMinutes || 60;
  const isValid = db.updateSessionActivity(token, timeoutMinutes);

  if (!isValid) {
    return res.status(401).json({ error: 'Session timed out due to inactivity. Please log in again.' });
  }

  req.sessionUser = {
    adminId: session.adminId,
    username: session.username,
    role: session.role,
  };

  next();
}

// --------------------------------------------------------------------------
// 1. AUTHENTICATION & SECURITY ROUTES
// --------------------------------------------------------------------------
const MASTER_SIGNUP_CODE = '0099484830';

app.post(['/api/auth/signup', '/api/auth/register'], (req: Request, res: Response) => {
  const { masterCode, username, email, fullName, password } = req.body;

  if (!masterCode || typeof masterCode !== 'string' || masterCode.trim() !== MASTER_SIGNUP_CODE) {
    return res.status(403).json({
      error: 'Invalid Master Authorization Code. Account creation is restricted to authorized NexGrid staff with master code 0099484830.',
    });
  }

  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ error: 'Full name, username, email, and password are required.' });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanEmail = String(email).trim().toLowerCase();

  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  // Check if username or email is already registered
  const existing = db.getAdmins().find(
    (a) => a.username.toLowerCase() === cleanUsername || a.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    return res.status(400).json({
      error: existing.username.toLowerCase() === cleanUsername
        ? `Username "${username}" is already in use.`
        : `Email "${email}" is already registered.`,
    });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  const newAdmin = db.createAdmin({
    username: cleanUsername,
    email: cleanEmail,
    fullName: String(fullName).trim(),
    passwordHash,
    salt,
    role: 'admin',
  });

  // Create session so the new admin is immediately logged in
  const token = crypto.randomBytes(32).toString('hex');
  const settings = db.getSettings();
  const timeoutMinutes = settings.system.sessionTimeoutMinutes || 60;
  const now = Date.now();

  const session: Session = {
    token,
    adminId: newAdmin.id,
    username: newAdmin.username,
    role: newAdmin.role,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + timeoutMinutes * 60 * 1000,
  };

  db.addSession(session);
  db.logAudit(
    'ADMIN_SIGNUP',
    'auth',
    newAdmin.id,
    `New administrator registered: ${newAdmin.fullName} (@${newAdmin.username}) with master authorization code`,
    newAdmin.username
  );

  return res.status(201).json({
    message: 'Administrator account created successfully.',
    token,
    user: {
      id: newAdmin.id,
      username: newAdmin.username,
      email: newAdmin.email,
      fullName: newAdmin.fullName,
      role: newAdmin.role,
      lastLoginAt: newAdmin.lastLoginAt,
    },
    sessionTimeoutMinutes: timeoutMinutes,
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  const admin = db.getAdminByUsernameOrEmail(username);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials provided.' });
  }

  const checkHash = hashPassword(password, admin.salt);
  if (checkHash !== admin.passwordHash) {
    db.logAudit('LOGIN_FAILED', 'auth', admin.id, `Failed login attempt for user ${admin.username}`, 'Anonymous');
    return res.status(401).json({ error: 'Invalid credentials provided.' });
  }

  // Update last login
  admin.lastLoginAt = new Date().toISOString();
  db.updateAdmin(admin);

  // Create session
  const token = crypto.randomBytes(32).toString('hex');
  const settings = db.getSettings();
  const timeoutMinutes = settings.system.sessionTimeoutMinutes || 60;
  const now = Date.now();

  const session: Session = {
    token,
    adminId: admin.id,
    username: admin.username,
    role: admin.role,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + timeoutMinutes * 60 * 1000,
  };

  db.addSession(session);
  db.logAudit('LOGIN_SUCCESS', 'auth', admin.id, `Admin ${admin.username} logged in successfully`, admin.username);

  return res.json({
    token,
    user: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
    },
    sessionTimeoutMinutes: timeoutMinutes,
  });
});

app.post('/api/auth/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    db.removeSession(token);
  }
  if (req.sessionUser) {
    db.logAudit('LOGOUT', 'auth', req.sessionUser.adminId, `Admin ${req.sessionUser.username} logged out`, req.sessionUser.username);
  }
  res.json({ message: 'Logged out successfully.' });
});

app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const admin = db.getAdminById(req.sessionUser!.adminId);
  if (!admin) {
    return res.status(404).json({ error: 'User record not found.' });
  }
  const settings = db.getSettings();
  res.json({
    user: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
    },
    sessionTimeoutMinutes: settings.system.sessionTimeoutMinutes || 60,
  });
});

app.post('/api/auth/change-password', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const admin = db.getAdminById(req.sessionUser!.adminId);
  if (!admin) {
    return res.status(404).json({ error: 'Admin record not found.' });
  }

  const currentCheck = hashPassword(currentPassword, admin.salt);
  if (currentCheck !== admin.passwordHash) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }

  const newSalt = generateSalt();
  admin.salt = newSalt;
  admin.passwordHash = hashPassword(newPassword, newSalt);
  db.updateAdmin(admin);

  db.logAudit('PASSWORD_CHANGED', 'auth', admin.id, `Password changed for user ${admin.username}`, admin.username);
  res.json({ message: 'Password updated successfully.' });
});

// Secure password reset request & verification
app.post('/api/auth/request-reset', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const admin = db.getAdminByUsernameOrEmail(email);
  if (!admin) {
    // Prevent email enumeration
    return res.json({ message: 'If the email exists in our records, a verification reset token has been issued.' });
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes validity
  admin.resetToken = resetToken;
  admin.resetTokenExpiry = expiry;
  db.updateAdmin(admin);

  db.logAudit('PASSWORD_RESET_REQUESTED', 'auth', admin.id, `Password reset token requested for ${admin.email}`, 'System');

  // In an internal admin portal, return token in response / log for verified admin use
  return res.json({
    message: 'If the email exists in our records, a verification reset token has been issued.',
    resetTokenInstructions: 'For security, reset token valid for 15 minutes.',
    devToken: resetToken, // Provided for immediate verification testing in admin portal
  });
});

app.post('/api/auth/verify-reset', (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Valid token and new password (min 8 chars) required.' });
  }

  const admins = db.getAdmins();
  const admin = admins.find((a) => a.resetToken === token);

  if (!admin || !admin.resetTokenExpiry) {
    return res.status(400).json({ error: 'Invalid or expired reset token.' });
  }

  if (new Date(admin.resetTokenExpiry).getTime() < Date.now()) {
    admin.resetToken = null;
    admin.resetTokenExpiry = null;
    db.updateAdmin(admin);
    return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
  }

  const newSalt = generateSalt();
  admin.salt = newSalt;
  admin.passwordHash = hashPassword(newPassword, newSalt);
  admin.resetToken = null;
  admin.resetTokenExpiry = null;
  db.updateAdmin(admin);

  db.logAudit('PASSWORD_RESET_COMPLETED', 'auth', admin.id, `Password was reset successfully for ${admin.username}`, 'System');
  res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
});

// --------------------------------------------------------------------------
// 2. DASHBOARD SUMMARY ROUTE
// --------------------------------------------------------------------------
app.get('/api/dashboard/summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const customers = db.getCustomers();
  const domains = db.getDomains();
  const invoices = db.getInvoices();
  const payments = db.getPayments();
  const quotations = db.getQuotations();

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'active').length;

  let activeDomains = 0;
  let expiringSoonDomains = 0;
  let expiredDomains = 0;

  const upcomingRenewals: Array<{
    id: string;
    domainName: string;
    customerId: string;
    customerName: string;
    expirationDate: string;
    daysLeft: number;
    renewalPrice: number;
    currency: string;
  }> = [];

  domains.forEach((d) => {
    const daysLeft = getDaysUntilExpiration(d.expirationDate);
    if (d.status === 'Cancelled') return;

    if (daysLeft < 0) {
      expiredDomains++;
    } else if (daysLeft <= 30) {
      expiringSoonDomains++;
      const cust = customers.find((c) => c.id === d.customerId);
      upcomingRenewals.push({
        id: d.id,
        domainName: d.domainName,
        customerId: d.customerId,
        customerName: cust ? cust.businessName : 'Unknown',
        expirationDate: d.expirationDate,
        daysLeft,
        renewalPrice: d.renewalPrice,
        currency: d.currency,
      });
    } else {
      activeDomains++;
    }
  });

  upcomingRenewals.sort((a, b) => a.daysLeft - b.daysLeft);

  // Financial calculations - only CONFIRMED payments count as received revenue!
  const confirmedPayments = payments.filter((p) => p.status === 'Confirmed');
  const totalPaymentsReceived = confirmedPayments.reduce((acc, p) => acc + p.amount, 0);

  // Total invoiced
  const validInvoices = invoices.filter((i) => i.status !== 'Cancelled');
  const totalInvoicedAmount = validInvoices.reduce((acc, i) => acc + i.totalAmount, 0);

  // Outstanding balances across all invoices
  const totalOutstandingBalance = validInvoices.reduce((acc, i) => acc + i.balanceDue, 0);

  // Unpaid and overdue counts
  const unpaidInvoicesCount = invoices.filter((i) => i.status === 'Unpaid' || i.status === 'Partially Paid').length;
  const overdueInvoicesCount = invoices.filter((i) => i.status === 'Overdue').length;

  // Pending quotations
  const pendingQuotationsCount = quotations.filter((q) => q.status === 'Draft' || q.status === 'Sent').length;

  // Recent payments
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5)
    .map((p) => {
      const cust = customers.find((c) => c.id === p.customerId);
      return {
        ...p,
        customerName: cust ? cust.businessName : 'Unknown',
      };
    });

  // Recent activity / audit
  const recentAudit = db.getAuditLogs().slice(0, 8);

  res.json({
    stats: {
      totalCustomers,
      activeCustomers,
      activeDomains,
      expiringSoonDomains,
      expiredDomains,
      totalPaymentsReceived,
      totalInvoicedAmount,
      totalOutstandingBalance,
      unpaidInvoicesCount,
      overdueInvoicesCount,
      pendingQuotationsCount,
    },
    upcomingRenewals: upcomingRenewals.slice(0, 10),
    recentPayments,
    recentActivity: recentAudit,
  });
});

// --------------------------------------------------------------------------
// 3. CUSTOMER MANAGEMENT ROUTES
// --------------------------------------------------------------------------
app.get('/api/customers', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { search, status } = req.query;
  let customers = db.getCustomers();

  if (status && status !== 'all') {
    customers = customers.filter((c) => c.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    customers = customers.filter(
      (c) =>
        c.businessName.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }

  // Calculate customer financials & domain counts
  const domains = db.getDomains();
  const invoices = db.getInvoices();
  const payments = db.getPayments();

  const enriched = customers.map((c) => {
    const custDomains = domains.filter((d) => d.customerId === c.id && d.status !== 'Cancelled');
    const custInvoices = invoices.filter((i) => i.customerId === c.id && i.status !== 'Cancelled');
    const custPayments = payments.filter((p) => p.customerId === c.id && p.status === 'Confirmed');

    const totalInvoiced = custInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = custPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = custInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

    return {
      ...c,
      domainsCount: custDomains.length,
      totalInvoiced,
      totalPaid,
      outstandingBalance: outstanding,
    };
  });

  res.json(enriched);
});

app.post('/api/customers/check-duplicate', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { phone, email, excludeId } = req.body;
  const duplicate = db.findDuplicateCustomer(phone || '', email || '', excludeId);
  if (duplicate) {
    return res.json({
      exists: true,
      message: `A customer with this ${
        duplicate.phone === phone ? 'phone number' : 'email'
      } already exists: "${duplicate.businessName}" (${duplicate.id}).`,
      duplicateCustomer: {
        id: duplicate.id,
        businessName: duplicate.businessName,
      },
    });
  }
  return res.json({ exists: false });
});

app.get('/api/customers/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const customer = db.getCustomerById(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const domains = db.getDomains().filter((d) => d.customerId === customer.id);
  const invoices = db.getInvoices().filter((i) => i.customerId === customer.id);
  const quotations = db.getQuotations().filter((q) => q.customerId === customer.id);
  const payments = db.getPayments().filter((p) => p.customerId === customer.id);
  const messages = db.getMessageLogs().filter((m) => m.customerId === customer.id);

  const totalInvoiced = invoices
    .filter((i) => i.status !== 'Cancelled')
    .reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPaid = payments
    .filter((p) => p.status === 'Confirmed')
    .reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = invoices
    .filter((i) => i.status !== 'Cancelled')
    .reduce((sum, i) => sum + i.balanceDue, 0);

  res.json({
    customer,
    domains,
    invoices,
    quotations,
    payments,
    messages,
    financialSummary: {
      totalInvoiced,
      totalPaid,
      outstandingBalance,
    },
  });
});

app.post('/api/customers', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { businessName, contactPerson, phone, email, address, notes, allowDuplicate } = req.body;

  if (!businessName || !phone) {
    return res.status(400).json({ error: 'Business name and phone number are required.' });
  }

  if (!allowDuplicate) {
    const duplicate = db.findDuplicateCustomer(phone, email || '');
    if (duplicate) {
      return res.status(409).json({
        duplicate: true,
        message: `A customer with matching phone or email already exists: ${duplicate.businessName} (${duplicate.id}).`,
      });
    }
  }

  const customer = db.createCustomer({
    businessName,
    contactPerson: contactPerson || businessName,
    phone,
    email: email || '',
    address: address || '',
    notes: notes || '',
    status: 'active',
  });

  db.logAudit(
    'CUSTOMER_CREATED',
    'customer',
    customer.id,
    `Created customer ${customer.businessName} (${customer.id})`,
    req.sessionUser!.username
  );

  // Trigger automated Welcome message if enabled
  const settings = db.getSettings();
  if (settings.system.autoSendWelcomeSMS && customer.phone) {
    const welcomeSMS = populateTemplate(settings.templates.welcomeSMS, {
      'Customer Name': customer.contactPerson || customer.businessName,
      'Customer ID': customer.id,
      'Business Contact': settings.company.phone,
    });
    // Fire in background
    sendSmsNotification(customer.phone, welcomeSMS, 'welcome', customer.id, customer.businessName).catch(console.error);
  }

  if (settings.system.autoSendWelcomeEmail && customer.email) {
    const emailSubject = populateTemplate(settings.templates.welcomeEmailSubject, {
      'Customer Name': customer.contactPerson || customer.businessName,
      'Customer ID': customer.id,
    });
    const emailBody = populateTemplate(settings.templates.welcomeEmailBody, {
      'Customer Name': customer.contactPerson || customer.businessName,
      'Customer ID': customer.id,
      'Business Contact': settings.company.phone,
    });
    sendEmailNotification(customer.email, emailSubject, emailBody, 'welcome', customer.id, customer.businessName).catch(console.error);
  }

  res.status(201).json(customer);
});

app.put('/api/customers/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { businessName, contactPerson, phone, email, address, notes, status } = req.body;
  const existing = db.getCustomerById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const updated = db.updateCustomer(req.params.id, {
    businessName: businessName ?? existing.businessName,
    contactPerson: contactPerson ?? existing.contactPerson,
    phone: phone ?? existing.phone,
    email: email ?? existing.email,
    address: address ?? existing.address,
    notes: notes ?? existing.notes,
    status: status ?? existing.status,
  });

  db.logAudit(
    'CUSTOMER_UPDATED',
    'customer',
    req.params.id,
    `Updated customer details for ${updated?.businessName}`,
    req.sessionUser!.username
  );

  res.json(updated);
});

app.post('/api/customers/:id/archive', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const existing = db.getCustomerById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const newStatus = existing.status === 'archived' ? 'active' : 'archived';
  const updated = db.updateCustomer(req.params.id, { status: newStatus });

  db.logAudit(
    newStatus === 'archived' ? 'CUSTOMER_ARCHIVED' : 'CUSTOMER_UNARCHIVED',
    'customer',
    req.params.id,
    `${newStatus === 'archived' ? 'Archived' : 'Unarchived'} customer ${existing.businessName}. Financial history preserved.`,
    req.sessionUser!.username
  );

  res.json({ message: `Customer ${newStatus} successfully. Financial records preserved.`, customer: updated });
});

// --------------------------------------------------------------------------
// 4. DOMAIN MANAGEMENT ROUTES
// --------------------------------------------------------------------------
app.get('/api/domains', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { status, search, customerId } = req.query;
  let domains = db.getDomains();
  const customers = db.getCustomers();

  if (customerId) {
    domains = domains.filter((d) => d.customerId === customerId);
  }

  if (status && status !== 'all') {
    domains = domains.filter((d) => d.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    domains = domains.filter((d) => d.domainName.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
  }

  const enriched = domains.map((d) => {
    const cust = customers.find((c) => c.id === d.customerId);
    const daysLeft = getDaysUntilExpiration(d.expirationDate);
    return {
      ...d,
      daysLeft,
      customerName: cust ? cust.businessName : 'Unknown',
      customerPhone: cust ? cust.phone : '',
      customerEmail: cust ? cust.email : '',
    };
  });

  // Sort by expiration date ascending (nearest expiration first)
  enriched.sort((a, b) => a.daysLeft - b.daysLeft);

  res.json(enriched);
});

app.post('/api/domains', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const {
    domainName,
    customerId,
    registrationDate,
    expirationDate,
    renewalPrice,
    currency,
    registrationPeriodYears,
    registrar,
    notes,
  } = req.body;

  if (!domainName || !customerId || !expirationDate) {
    return res.status(400).json({ error: 'Domain name, customer, and expiration date are required.' });
  }

  const customer = db.getCustomerById(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Selected customer does not exist.' });
  }

  const cleanDomain = domainName.toLowerCase().trim();
  const daysLeft = getDaysUntilExpiration(expirationDate);
  let status: 'Active' | 'Expiring Soon' | 'Expired' = 'Active';
  if (daysLeft < 0) {
    status = 'Expired';
  } else if (daysLeft <= 30) {
    status = 'Expiring Soon';
  }

  const domain = db.createDomain({
    domainName: cleanDomain,
    customerId,
    registrationDate: registrationDate || new Date().toISOString().split('T')[0],
    expirationDate,
    renewalPrice: Number(renewalPrice) || 3500,
    currency: currency || 'ETB',
    registrationPeriodYears: Number(registrationPeriodYears) || 1,
    registrar: registrar || 'NexGrid Domains',
    status,
    notes: notes || '',
  });

  db.logAudit(
    'DOMAIN_CREATED',
    'domain',
    domain.id,
    `Registered domain record ${domain.domainName} for ${customer.businessName}`,
    req.sessionUser!.username
  );

  res.status(201).json(domain);
});

app.put('/api/domains/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const existing = db.getDomainById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Domain not found.' });
  }

  const {
    domainName,
    customerId,
    registrationDate,
    expirationDate,
    renewalPrice,
    currency,
    registrationPeriodYears,
    registrar,
    status,
    notes,
  } = req.body;

  const updated = db.updateDomain(req.params.id, {
    domainName: domainName ?? existing.domainName,
    customerId: customerId ?? existing.customerId,
    registrationDate: registrationDate ?? existing.registrationDate,
    expirationDate: expirationDate ?? existing.expirationDate,
    renewalPrice: renewalPrice !== undefined ? Number(renewalPrice) : existing.renewalPrice,
    currency: currency ?? existing.currency,
    registrationPeriodYears: registrationPeriodYears !== undefined ? Number(registrationPeriodYears) : existing.registrationPeriodYears,
    registrar: registrar ?? existing.registrar,
    status: status ?? existing.status,
    notes: notes ?? existing.notes,
  });

  db.logAudit(
    'DOMAIN_UPDATED',
    'domain',
    req.params.id,
    `Updated domain ${updated?.domainName} settings`,
    req.sessionUser!.username
  );

  res.json(updated);
});

// Domain renewal confirmation
app.post('/api/domains/:id/renew', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const domain = db.getDomainById(req.params.id);
  if (!domain) {
    return res.status(404).json({ error: 'Domain not found.' });
  }

  const { newExpirationDate, price, currency, notes } = req.body;
  if (!newExpirationDate) {
    return res.status(400).json({ error: 'New expiration date is required to renew domain.' });
  }

  const previousDate = domain.expirationDate;
  const renewalRecord = {
    id: `REN-${Date.now()}`,
    date: new Date().toISOString(),
    previousExpirationDate: previousDate,
    newExpirationDate,
    price: Number(price) || domain.renewalPrice,
    currency: currency || domain.currency,
    recordedBy: req.sessionUser!.username,
    notes: notes || 'Admin confirmed renewal',
  };

  const updated = db.updateDomain(domain.id, {
    expirationDate: newExpirationDate,
    status: 'Active',
    renewalHistory: [...domain.renewalHistory, renewalRecord],
    // Clear sentReminders for this fresh renewal cycle
    sentReminders: [],
  });

  db.logAudit(
    'DOMAIN_RENEWED',
    'domain',
    domain.id,
    `Renewed domain ${domain.domainName} until ${newExpirationDate} for ${renewalRecord.price} ${renewalRecord.currency}`,
    req.sessionUser!.username
  );

  res.json({ message: 'Domain successfully renewed.', domain: updated });
});

// Manual dispatch of renewal reminder
app.post('/api/domains/:id/send-reminder', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const domain = db.getDomainById(req.params.id);
  if (!domain) {
    return res.status(404).json({ error: 'Domain not found.' });
  }

  const customer = db.getCustomerById(domain.customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const settings = db.getSettings();
  const daysLeft = getDaysUntilExpiration(domain.expirationDate);

  const templateVars = {
    'Customer Name': customer.contactPerson || customer.businessName,
    'Domain Name': domain.domainName,
    'Expiration Date': domain.expirationDate,
    'Amount': domain.renewalPrice.toLocaleString(),
    'Currency': domain.currency || settings.system.defaultCurrency,
    'Days Left': daysLeft,
    'Registrar': domain.registrar || 'NexGrid Domains',
    'Business Contact': settings.company.phone,
  };

  const results: any = {};

  if (customer.phone) {
    const smsContent = populateTemplate(settings.templates.domainReminderSMS, templateVars);
    results.sms = await sendSmsNotification(customer.phone, smsContent, 'domain_reminder', customer.id, customer.businessName);
  }

  if (customer.email) {
    const subject = populateTemplate(settings.templates.domainReminderEmailSubject, templateVars);
    const body = populateTemplate(settings.templates.domainReminderEmailBody, templateVars);
    results.email = await sendEmailNotification(customer.email, subject, body, 'domain_reminder', customer.id, customer.businessName);
  }

  db.logAudit(
    'REMINDER_MANUAL_SENT',
    'domain',
    domain.id,
    `Admin manually dispatched renewal reminder for ${domain.domainName} to ${customer.businessName}`,
    req.sessionUser!.username
  );

  res.json({ message: 'Reminder dispatched.', results });
});

// --------------------------------------------------------------------------
// 5. INVOICES MANAGEMENT ROUTES
// --------------------------------------------------------------------------
app.get('/api/invoices', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { status, search, customerId } = req.query;
  let invoices = db.getInvoices();
  const customers = db.getCustomers();

  if (customerId) {
    invoices = invoices.filter((i) => i.customerId === customerId);
  }

  if (status && status !== 'all') {
    invoices = invoices.filter((i) => i.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    invoices = invoices.filter((i) => i.documentNumber.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  }

  const enriched = invoices.map((inv) => {
    const cust = customers.find((c) => c.id === inv.customerId);
    return {
      ...inv,
      customerName: cust ? cust.businessName : 'Unknown',
      customerPhone: cust ? cust.phone : '',
      customerEmail: cust ? cust.email : '',
    };
  });

  enriched.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  res.json(enriched);
});

app.get('/api/invoices/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const invoice = db.getInvoiceById(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  const customer = db.getCustomerById(invoice.customerId);
  const payments = db.getPayments().filter((p) => p.invoiceId === invoice.id);
  const settings = db.getSettings();

  res.json({
    invoice,
    customer,
    payments,
    company: settings.company,
  });
});

app.post('/api/invoices', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const {
    customerId,
    issueDate,
    dueDate,
    currency,
    items,
    discount,
    taxRate,
    notes,
    paymentInstructions,
    terms,
    quotationId,
  } = req.body;

  if (!customerId || !issueDate || !dueDate || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer, dates, and at least one item are required.' });
  }

  const customer = db.getCustomerById(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  // Calculate items
  const processedItems: InvoiceItem[] = items.map((it: any, idx: number) => {
    const qty = Number(it.quantity) || 1;
    const unitPrice = Number(it.unitPrice) || 0;
    return {
      id: it.id || `item-${idx + 1}`,
      description: it.description || 'Service',
      quantity: qty,
      unitPrice,
      lineTotal: qty * unitPrice,
    };
  });

  const subtotal = processedItems.reduce((acc, it) => acc + it.lineTotal, 0);
  const discountAmount = Number(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxPct = Number(taxRate) || 0;
  const taxAmount = (taxableAmount * taxPct) / 100;
  const totalAmount = taxableAmount + taxAmount;

  const nextNumber = `INV-${new Date().getFullYear()}-${String(db.getInvoices().length + 1).padStart(3, '0')}`;
  const settings = db.getSettings();

  const invoice = db.createInvoice({
    documentNumber: nextNumber,
    customerId,
    issueDate,
    dueDate,
    currency: currency || settings.system.defaultCurrency,
    items: processedItems,
    subtotal,
    discount: discountAmount,
    taxRate: taxPct,
    taxAmount,
    totalAmount,
    status: 'Unpaid',
    notes: notes || '',
    paymentInstructions: paymentInstructions || settings.company.bankDetails,
    terms: terms || 'Payment due within invoice terms. NexGrid Digital Systems reserves the right to suspend services upon non-payment.',
    quotationId,
  });

  db.logAudit(
    'INVOICE_CREATED',
    'invoice',
    invoice.id,
    `Created invoice ${invoice.documentNumber} for ${customer.businessName} (Total: ${invoice.totalAmount} ${invoice.currency})`,
    req.sessionUser!.username
  );

  res.status(201).json(invoice);
});

app.put('/api/invoices/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const existing = db.getInvoiceById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  const {
    issueDate,
    dueDate,
    currency,
    items,
    discount,
    taxRate,
    status,
    notes,
    paymentInstructions,
    terms,
  } = req.body;

  let subtotal = existing.subtotal;
  let processedItems = existing.items;
  let discountAmount = discount !== undefined ? Number(discount) : existing.discount;
  let taxPct = taxRate !== undefined ? Number(taxRate) : existing.taxRate;
  let totalAmount = existing.totalAmount;
  let taxAmount = existing.taxAmount;

  if (Array.isArray(items)) {
    processedItems = items.map((it: any, idx: number) => {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice) || 0;
      return {
        id: it.id || `item-${idx + 1}`,
        description: it.description || 'Service',
        quantity: qty,
        unitPrice,
        lineTotal: qty * unitPrice,
      };
    });
    subtotal = processedItems.reduce((acc, it) => acc + it.lineTotal, 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    taxAmount = (taxableAmount * taxPct) / 100;
    totalAmount = taxableAmount + taxAmount;
  }

  const updated = db.updateInvoice(req.params.id, {
    issueDate: issueDate ?? existing.issueDate,
    dueDate: dueDate ?? existing.dueDate,
    currency: currency ?? existing.currency,
    items: processedItems,
    subtotal,
    discount: discountAmount,
    taxRate: taxPct,
    taxAmount,
    totalAmount,
    status: status ?? existing.status,
    notes: notes ?? existing.notes,
    paymentInstructions: paymentInstructions ?? existing.paymentInstructions,
    terms: terms ?? existing.terms,
  });

  db.logAudit(
    'INVOICE_UPDATED',
    'invoice',
    req.params.id,
    `Updated invoice ${existing.documentNumber}`,
    req.sessionUser!.username
  );

  res.json(updated);
});

// Send invoice reminder
app.post('/api/invoices/:id/send-reminder', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const invoice = db.getInvoiceById(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  const customer = db.getCustomerById(invoice.customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const settings = db.getSettings();
  const vars = {
    'Customer Name': customer.contactPerson || customer.businessName,
    'Invoice Number': invoice.documentNumber,
    'Amount': invoice.balanceDue.toLocaleString(),
    'Currency': invoice.currency,
    'Due Date': invoice.dueDate,
  };

  const results: any = {};
  if (customer.phone) {
    const text = populateTemplate(settings.templates.invoiceReminderSMS, vars);
    results.sms = await sendSmsNotification(customer.phone, text, 'invoice_reminder', customer.id, customer.businessName);
  }

  db.logAudit(
    'INVOICE_REMINDER_SENT',
    'invoice',
    invoice.id,
    `Dispatched invoice reminder for ${invoice.documentNumber} to ${customer.businessName}`,
    req.sessionUser!.username
  );

  res.json({ message: 'Invoice reminder dispatched.', results });
});

// --------------------------------------------------------------------------
// 6. QUOTATIONS MANAGEMENT ROUTES
// --------------------------------------------------------------------------
app.get('/api/quotations', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { status, search, customerId } = req.query;
  let quotations = db.getQuotations();
  const customers = db.getCustomers();

  if (customerId) {
    quotations = quotations.filter((q) => q.customerId === customerId);
  }

  if (status && status !== 'all') {
    quotations = quotations.filter((q) => q.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    quotations = quotations.filter((qt) => qt.documentNumber.toLowerCase().includes(q) || qt.id.toLowerCase().includes(q));
  }

  const enriched = quotations.map((q) => {
    const cust = customers.find((c) => c.id === q.customerId);
    return {
      ...q,
      customerName: cust ? cust.businessName : 'Unknown',
      customerPhone: cust ? cust.phone : '',
      customerEmail: cust ? cust.email : '',
    };
  });

  enriched.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  res.json(enriched);
});

app.post('/api/quotations', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const {
    customerId,
    issueDate,
    expiryDate,
    currency,
    items,
    discount,
    taxRate,
    notes,
    terms,
  } = req.body;

  if (!customerId || !issueDate || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer, date, and at least one item are required.' });
  }

  const customer = db.getCustomerById(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const processedItems: InvoiceItem[] = items.map((it: any, idx: number) => {
    const qty = Number(it.quantity) || 1;
    const unitPrice = Number(it.unitPrice) || 0;
    return {
      id: it.id || `item-${idx + 1}`,
      description: it.description || 'Service',
      quantity: qty,
      unitPrice,
      lineTotal: qty * unitPrice,
    };
  });

  const subtotal = processedItems.reduce((acc, it) => acc + it.lineTotal, 0);
  const discountAmount = Number(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxPct = Number(taxRate) || 0;
  const taxAmount = (taxableAmount * taxPct) / 100;
  const totalAmount = taxableAmount + taxAmount;

  const nextNumber = `QT-${new Date().getFullYear()}-${String(db.getQuotations().length + 1).padStart(3, '0')}`;
  const settings = db.getSettings();

  const quotation = db.createQuotation({
    documentNumber: nextNumber,
    customerId,
    issueDate,
    expiryDate: expiryDate || new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: currency || settings.system.defaultCurrency,
    items: processedItems,
    subtotal,
    discount: discountAmount,
    taxRate: taxPct,
    taxAmount,
    totalAmount,
    status: 'Draft',
    notes: notes || '',
    terms: terms || 'This quotation is valid for 20 days. Pricing subject to NexGrid standard service terms.',
  });

  db.logAudit(
    'QUOTATION_CREATED',
    'quotation',
    quotation.id,
    `Created quotation ${quotation.documentNumber} for ${customer.businessName}`,
    req.sessionUser!.username
  );

  res.status(201).json(quotation);
});

app.put('/api/quotations/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const existing = db.getQuotationById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Quotation not found.' });
  }

  const {
    issueDate,
    expiryDate,
    currency,
    items,
    discount,
    taxRate,
    status,
    notes,
    terms,
  } = req.body;

  let subtotal = existing.subtotal;
  let processedItems = existing.items;
  let discountAmount = discount !== undefined ? Number(discount) : existing.discount;
  let taxPct = taxRate !== undefined ? Number(taxRate) : existing.taxRate;
  let totalAmount = existing.totalAmount;
  let taxAmount = existing.taxAmount;

  if (Array.isArray(items)) {
    processedItems = items.map((it: any, idx: number) => {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice) || 0;
      return {
        id: it.id || `item-${idx + 1}`,
        description: it.description || 'Service',
        quantity: qty,
        unitPrice,
        lineTotal: qty * unitPrice,
      };
    });
    subtotal = processedItems.reduce((acc, it) => acc + it.lineTotal, 0);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    taxAmount = (taxableAmount * taxPct) / 100;
    totalAmount = taxableAmount + taxAmount;
  }

  const updated = db.updateQuotation(req.params.id, {
    issueDate: issueDate ?? existing.issueDate,
    expiryDate: expiryDate ?? existing.expiryDate,
    currency: currency ?? existing.currency,
    items: processedItems,
    subtotal,
    discount: discountAmount,
    taxRate: taxPct,
    taxAmount,
    totalAmount,
    status: status ?? existing.status,
    notes: notes ?? existing.notes,
    terms: terms ?? existing.terms,
  });

  db.logAudit(
    'QUOTATION_UPDATED',
    'quotation',
    req.params.id,
    `Updated quotation ${existing.documentNumber} status to ${updated?.status}`,
    req.sessionUser!.username
  );

  res.json(updated);
});

// Convert quotation to invoice without re-entering information
app.post('/api/quotations/:id/convert-to-invoice', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const quotation = db.getQuotationById(req.params.id);
  if (!quotation) {
    return res.status(404).json({ error: 'Quotation not found.' });
  }

  if (quotation.convertedInvoiceId) {
    return res.status(400).json({ error: `Quotation was already converted to invoice (${quotation.convertedInvoiceId}).` });
  }

  const settings = db.getSettings();
  const nextInvoiceNumber = `INV-${new Date().getFullYear()}-${String(db.getInvoices().length + 1).padStart(3, '0')}`;
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const invoice = db.createInvoice({
    documentNumber: nextInvoiceNumber,
    customerId: quotation.customerId,
    issueDate: today,
    dueDate,
    currency: quotation.currency,
    items: quotation.items,
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    taxRate: quotation.taxRate,
    taxAmount: quotation.taxAmount,
    totalAmount: quotation.totalAmount,
    status: 'Unpaid',
    notes: `Converted from Quotation ${quotation.documentNumber}. ${quotation.notes || ''}`.trim(),
    paymentInstructions: settings.company.bankDetails,
    terms: quotation.terms,
    quotationId: quotation.id,
  });

  // Update quotation status and link
  db.updateQuotation(quotation.id, {
    status: 'Accepted',
    convertedInvoiceId: invoice.id,
  });

  db.logAudit(
    'QUOTATION_CONVERTED',
    'quotation',
    quotation.id,
    `Converted quotation ${quotation.documentNumber} into invoice ${invoice.documentNumber}`,
    req.sessionUser!.username
  );

  res.json({
    message: 'Quotation successfully converted to invoice.',
    invoice,
  });
});

// --------------------------------------------------------------------------
// 7. PAYMENT & FINANCIAL TRACKING ROUTES
// --------------------------------------------------------------------------
app.get('/api/payments', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { status, customerId, invoiceId } = req.query;
  let payments = db.getPayments();
  const customers = db.getCustomers();
  const invoices = db.getInvoices();

  if (status && status !== 'all') {
    payments = payments.filter((p) => p.status === status);
  }

  if (customerId) {
    payments = payments.filter((p) => p.customerId === customerId);
  }

  if (invoiceId) {
    payments = payments.filter((p) => p.invoiceId === invoiceId);
  }

  const enriched = payments.map((p) => {
    const cust = customers.find((c) => c.id === p.customerId);
    const inv = invoices.find((i) => i.id === p.invoiceId);
    return {
      ...p,
      customerName: cust ? cust.businessName : 'Unknown',
      invoiceNumber: inv ? inv.documentNumber : undefined,
    };
  });

  enriched.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  res.json(enriched);
});

app.post('/api/payments', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const {
    customerId,
    invoiceId,
    amount,
    currency,
    paymentDate,
    paymentMethod,
    referenceNumber,
    notes,
    status, // default to Confirmed or Pending
  } = req.body;

  if (!customerId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Customer and valid positive amount are required.' });
  }

  const customer = db.getCustomerById(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const settings = db.getSettings();
  const paymentNum = `REC-${new Date().getFullYear()}-${String(db.getPayments().length + 1).padStart(3, '0')}`;
  const paymentStatus = status === 'Pending' ? 'Pending' : 'Confirmed';

  const payment = db.createPayment({
    paymentNumber: paymentNum,
    customerId,
    invoiceId: invoiceId || undefined,
    amount: Number(amount),
    currency: currency || settings.system.defaultCurrency,
    paymentDate: paymentDate || new Date().toISOString(),
    paymentMethod: paymentMethod || 'Bank Transfer',
    referenceNumber: referenceNumber || '',
    recordedBy: req.sessionUser!.username,
    notes: notes || '',
    status: paymentStatus,
  });

  db.logAudit(
    'PAYMENT_RECORDED',
    'payment',
    payment.id,
    `Recorded ${payment.status} payment of ${payment.amount} ${payment.currency} for ${customer.businessName} (Ref: ${payment.referenceNumber || 'N/A'})`,
    req.sessionUser!.username
  );

  // If Confirmed and auto-notification enabled, trigger confirmation SMS and Email
  if (payment.status === 'Confirmed') {
    const inv = invoiceId ? db.getInvoiceById(invoiceId) : null;
    const remainingBalance = inv ? inv.balanceDue : 0;

    const templateVars = {
      'Customer Name': customer.contactPerson || customer.businessName,
      'Amount': payment.amount.toLocaleString(),
      'Currency': payment.currency,
      'Payment Date': payment.paymentDate.split('T')[0],
      'Payment Method': payment.paymentMethod,
      'Reference Number': payment.referenceNumber || 'N/A',
      'Service/Invoice Number': inv ? inv.documentNumber : 'Account Balance',
      'Balance': remainingBalance.toLocaleString(),
      'Payment Number': payment.paymentNumber,
    };

    if (settings.system.autoSendPaymentConfirmSMS && customer.phone) {
      const smsText = populateTemplate(settings.templates.paymentConfirmationSMS, templateVars);
      sendSmsNotification(customer.phone, smsText, 'payment_confirmation', customer.id, customer.businessName).catch(console.error);
    }

    if (settings.system.autoSendPaymentConfirmEmail && customer.email) {
      const emailSub = populateTemplate(settings.templates.paymentConfirmationEmailSubject, templateVars);
      const emailBody = populateTemplate(settings.templates.paymentConfirmationEmailBody, templateVars);
      sendEmailNotification(customer.email, emailSub, emailBody, 'payment_confirmation', customer.id, customer.businessName).catch(console.error);
    }
  }

  res.status(201).json(payment);
});

// Confirm pending payment
app.post('/api/payments/:id/confirm', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const payment = db.getPaymentById(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found.' });
  }

  if (payment.status === 'Confirmed') {
    return res.status(400).json({ error: 'Payment is already confirmed.' });
  }

  if (payment.status === 'Reversed') {
    return res.status(400).json({ error: 'Reversed payment cannot be re-confirmed directly.' });
  }

  const updated = db.updatePayment(payment.id, {
    status: 'Confirmed',
  });

  const customer = db.getCustomerById(payment.customerId);
  const settings = db.getSettings();

  db.logAudit(
    'PAYMENT_CONFIRMED',
    'payment',
    payment.id,
    `Admin confirmed payment ${payment.paymentNumber} of ${payment.amount} ${payment.currency}`,
    req.sessionUser!.username
  );

  // Send confirmation if enabled
  if (customer && settings.system.autoSendPaymentConfirmSMS && customer.phone) {
    const inv = payment.invoiceId ? db.getInvoiceById(payment.invoiceId) : null;
    const smsText = populateTemplate(settings.templates.paymentConfirmationSMS, {
      'Customer Name': customer.contactPerson || customer.businessName,
      'Amount': payment.amount.toLocaleString(),
      'Currency': payment.currency,
      'Payment Date': payment.paymentDate.split('T')[0],
      'Service/Invoice Number': inv ? inv.documentNumber : 'Account',
      'Balance': inv ? inv.balanceDue.toLocaleString() : '0',
    });
    sendSmsNotification(customer.phone, smsText, 'payment_confirmation', customer.id, customer.businessName).catch(console.error);
  }

  res.json({ message: 'Payment confirmed successfully.', payment: updated });
});

// Reversal / Correction of a payment
app.post('/api/payments/:id/reverse', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const payment = db.getPaymentById(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found.' });
  }

  if (payment.status === 'Reversed') {
    return res.status(400).json({ error: 'Payment has already been reversed.' });
  }

  const { reason } = req.body;
  if (!reason || reason.trim() === '') {
    return res.status(400).json({ error: 'An auditable reason is required to reverse a payment.' });
  }

  const updated = db.updatePayment(payment.id, {
    status: 'Reversed',
    reversalReason: reason,
    reversedAt: new Date().toISOString(),
    reversedBy: req.sessionUser!.username,
  });

  db.logAudit(
    'PAYMENT_REVERSED',
    'payment',
    payment.id,
    `Reversed payment ${payment.paymentNumber} (${payment.amount} ${payment.currency}). Reason: ${reason}`,
    req.sessionUser!.username
  );

  res.json({
    message: 'Payment reversed and invoice balances updated successfully.',
    payment: updated,
  });
});

// --------------------------------------------------------------------------
// 8. MESSAGING & NOTIFICATION LOGS ROUTES
// --------------------------------------------------------------------------
app.get('/api/messages/logs', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { channel, status, customerId } = req.query;
  let logs = db.getMessageLogs();

  if (channel && channel !== 'all') {
    logs = logs.filter((l) => l.channel === channel);
  }

  if (status && status !== 'all') {
    logs = logs.filter((l) => l.status === status);
  }

  if (customerId) {
    logs = logs.filter((l) => l.customerId === customerId);
  }

  res.json(logs);
});

app.post('/api/messages/retry/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const logs = db.getMessageLogs();
  const log = logs.find((l) => l.id === req.params.id);
  if (!log) {
    return res.status(404).json({ error: 'Message log not found.' });
  }

  if (log.channel === 'sms') {
    const updated = await sendSmsNotification(
      log.destination,
      log.content,
      log.messageType,
      log.customerId,
      log.customerName
    );
    db.logAudit(
      'MESSAGE_RETRY',
      'message',
      log.id,
      `Retried SMS message to ${log.destination}. Outcome: ${updated.status}`,
      req.sessionUser!.username
    );
    return res.json({ message: 'Retry processed.', result: updated });
  } else {
    const updated = await sendEmailNotification(
      log.destination,
      'Retry Notification',
      log.content,
      log.messageType,
      log.customerId,
      log.customerName
    );
    return res.json({ message: 'Retry processed.', result: updated });
  }
});

// Test SMS endpoint
app.post('/api/messages/test-sms', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Recipient phone number and test message are required.' });
  }

  const log = await sendSmsNotification(
    phone,
    message,
    'test',
    undefined,
    'Test Recipient'
  );

  db.logAudit(
    'TEST_SMS_SENT',
    'message',
    log.id,
    `Admin dispatched test SMS to ${phone}. Status: ${log.status}`,
    req.sessionUser!.username
  );

  res.json({
    message: log.status === 'Sent' ? 'Test SMS sent successfully.' : 'SMS dispatch attempted. See log for status.',
    log,
  });
});

// Bulk Broadcast SMS endpoint
app.post(['/api/messages/broadcast-sms', '/api/messages/bulk-sms'], authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { customerIds, message, title } = req.body;

  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one customer to broadcast to.' });
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  const rawTemplate = message.trim();
  const settings = db.getSettings();
  const allCustomers = db.getCustomers();

  const selectedCustomers = allCustomers.filter((c) =>
    customerIds.includes(c.id) && c.status !== 'archived' && c.phone
  );

  if (selectedCustomers.length === 0) {
    return res.status(400).json({
      error: 'None of the selected customers have a valid phone number or active status.',
    });
  }

  const results: Array<{
    customerId: string;
    customerName: string;
    phone: string;
    status: 'Sent' | 'Failed' | 'Queued' | 'Delivered';
    logId: string;
    error?: string;
  }> = [];

  let sentCount = 0;
  let failedCount = 0;

  for (const customer of selectedCustomers) {
    // Populate customer specific placeholders
    const personalizedContent = populateTemplate(rawTemplate, {
      'Customer Name': customer.contactPerson || customer.businessName,
      'Business Name': customer.businessName,
      'Customer ID': customer.id,
      'Business Contact': settings.company.phone,
      'Company Name': settings.company.name,
    });

    const log = await sendSmsNotification(
      customer.phone,
      personalizedContent,
      'broadcast',
      customer.id,
      customer.businessName
    );

    if (log.status === 'Sent' || log.status === 'Delivered') {
      sentCount++;
    } else {
      failedCount++;
    }

    results.push({
      customerId: customer.id,
      customerName: customer.businessName,
      phone: customer.phone,
      status: log.status,
      logId: log.id,
      error: log.errorDetails,
    });
  }

  db.logAudit(
    'BROADCAST_SMS_DISPATCHED',
    'message',
    `BROADCAST-${Date.now()}`,
    `Dispatched bulk SMS broadcast to ${selectedCustomers.length} recipients (${sentCount} sent, ${failedCount} failed). Subject: ${title || 'Broadcast Announcement'}`,
    req.sessionUser!.username
  );

  res.json({
    message: `Broadcast completed: ${sentCount} sent, ${failedCount} failed of ${selectedCustomers.length} total.`,
    summary: {
      totalRequested: customerIds.length,
      totalEligible: selectedCustomers.length,
      sentCount,
      failedCount,
    },
    results,
  });
});

// Test SMS Ethiopia Gateway connection
app.get('/api/messages/check-sms-connection', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const status = await testSmsConnection();
  res.json(status);
});

// --------------------------------------------------------------------------
// 9. SETTINGS & AUDIT LOGS ROUTES
// --------------------------------------------------------------------------
app.get('/api/settings', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const settings = db.getSettings();
  // Mask API key for security
  const safeSettings = {
    ...settings,
    sms: {
      ...settings.sms,
      apiKey: settings.sms.apiKey
        ? `${settings.sms.apiKey.substring(0, 4)}••••••••${settings.sms.apiKey.slice(-4)}`
        : '',
      hasApiKey: Boolean(settings.sms.apiKey && settings.sms.apiKey.length > 0),
    },
  };
  res.json(safeSettings);
});

app.put('/api/settings', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { company, sms, email, system, templates } = req.body;

  // Handle API key preservation if masked
  let finalSms = sms;
  if (sms) {
    const current = db.getSettings().sms;
    if (sms.apiKey && sms.apiKey.includes('••••')) {
      finalSms = { ...sms, apiKey: current.apiKey };
    }
  }

  const updated = db.updateSettings({
    company,
    sms: finalSms,
    email,
    system,
    templates,
  });

  db.logAudit(
    'SETTINGS_UPDATED',
    'settings',
    'SYSTEM',
    'Updated system and notification configuration.',
    req.sessionUser!.username
  );

  res.json({ message: 'Settings saved successfully.' });
});

app.get('/api/audit', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { entityType, search } = req.query;
  let logs = db.getAuditLogs();

  if (entityType && entityType !== 'all') {
    logs = logs.filter((l) => l.entityType === entityType);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.performedBy.toLowerCase().includes(q)
    );
  }

  res.json(logs);
});

// --------------------------------------------------------------------------
// 10. REPORTS & EXPORTS ROUTES
// --------------------------------------------------------------------------
app.get('/api/reports/financial', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  let payments = db.getPayments().filter((p) => p.status === 'Confirmed');
  let invoices = db.getInvoices().filter((i) => i.status !== 'Cancelled');
  const customers = db.getCustomers();

  if (startDate) {
    payments = payments.filter((p) => p.paymentDate >= String(startDate));
    invoices = invoices.filter((i) => i.issueDate >= String(startDate));
  }
  if (endDate) {
    payments = payments.filter((p) => p.paymentDate <= String(endDate));
    invoices = invoices.filter((i) => i.issueDate <= String(endDate));
  }

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const outstandingReceivables = invoices.reduce((sum, i) => sum + i.balanceDue, 0);

  // Group by payment method
  const methodBreakdown: Record<string, number> = {};
  payments.forEach((p) => {
    methodBreakdown[p.paymentMethod] = (methodBreakdown[p.paymentMethod] || 0) + p.amount;
  });

  // Monthly breakdown for current year
  const monthlyRevenue: Record<string, number> = {};
  payments.forEach((p) => {
    const month = p.paymentDate.substring(0, 7); // YYYY-MM
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + p.amount;
  });

  res.json({
    summary: {
      totalRevenue,
      totalInvoiced,
      outstandingReceivables,
      paymentsCount: payments.length,
      invoicesCount: invoices.length,
    },
    methodBreakdown,
    monthlyRevenue,
  });
});

app.get('/api/reports/export/:type', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.params;

  let csv = '';
  const sanitize = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  if (type === 'customers') {
    const list = db.getCustomers();
    csv = ['Customer ID,Business Name,Contact Person,Phone,Email,Status,Created At'].join(',') + '\n';
    csv += list
      .map((c) => [c.id, sanitize(c.businessName), sanitize(c.contactPerson), sanitize(c.phone), sanitize(c.email), c.status, c.createdAt].join(','))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="nexgrid-customers.csv"');
    return res.send(csv);
  }

  if (type === 'domains') {
    const list = db.getDomains();
    const custMap = new Map(db.getCustomers().map((c) => [c.id, c.businessName]));
    csv = ['Domain ID,Domain Name,Customer,Registration Date,Expiration Date,Days Left,Renewal Price,Currency,Status'].join(',') + '\n';
    csv += list
      .map((d) => {
        const days = getDaysUntilExpiration(d.expirationDate);
        return [d.id, sanitize(d.domainName), sanitize(custMap.get(d.customerId) || 'Unknown'), d.registrationDate, d.expirationDate, days, d.renewalPrice, d.currency, d.status].join(',');
      })
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="nexgrid-domains.csv"');
    return res.send(csv);
  }

  if (type === 'payments') {
    const list = db.getPayments();
    const custMap = new Map(db.getCustomers().map((c) => [c.id, c.businessName]));
    csv = ['Payment ID,Receipt Number,Customer,Amount,Currency,Payment Date,Method,Reference,Status,Recorded By'].join(',') + '\n';
    csv += list
      .map((p) => [p.id, p.paymentNumber, sanitize(custMap.get(p.customerId) || 'Unknown'), p.amount, p.currency, p.paymentDate, sanitize(p.paymentMethod), sanitize(p.referenceNumber), p.status, sanitize(p.recordedBy)].join(','))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="nexgrid-payments.csv"');
    return res.send(csv);
  }

  return res.status(400).json({ error: 'Unknown export type.' });
});

// --------------------------------------------------------------------------
// 11. BACKUP & RESTORE ROUTES
// --------------------------------------------------------------------------
app.get('/api/backups', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const backups = db.listBackups();
  res.json(backups);
});

app.post('/api/backups/create', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { label } = req.body;
  const result = db.createBackup(label);
  db.logAudit(
    'BACKUP_CREATED',
    'settings',
    result.filename,
    `Admin generated persistent database snapshot ${result.filename} (${Math.round(result.sizeBytes / 1024)} KB)`,
    req.sessionUser!.username
  );
  res.json(result);
});

app.post('/api/backups/restore', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Backup filename is required.' });
  }

  const success = db.restoreBackup(filename);
  if (!success) {
    return res.status(404).json({ error: 'Backup file not found or could not be restored.' });
  }

  db.logAudit(
    'BACKUP_RESTORED',
    'settings',
    filename,
    `Database restored successfully from ${filename}`,
    req.sessionUser!.username
  );

  res.json({ message: `Database successfully restored from ${filename}.` });
});

app.get('/api/backups/download/:filename', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.resolve(process.cwd(), 'data', 'backups', filename);
  res.download(filePath, filename);
});

app.post('/api/backups/upload-restore', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { rawJson } = req.body;
  if (!rawJson) {
    return res.status(400).json({ error: 'Raw JSON database content is required.' });
  }

  try {
    db.restoreFromRawJson(rawJson);
    db.logAudit(
      'BACKUP_UPLOAD_RESTORED',
      'settings',
      'UPLOAD',
      'Database restored from uploaded snapshot. Automatic pre-restore safety copy preserved.',
      req.sessionUser!.username
    );
    res.json({ message: 'Database successfully restored from uploaded backup file.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid backup data' });
  }
});

// Trigger manual scheduler run
app.post('/api/scheduler/run-now', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const outcome = await runSchedulerCycle();
  res.json({ message: 'Scheduler cycle executed.', outcome });
});

// --------------------------------------------------------------------------
// 12. VITE MIDDLEWARE / STATIC ASSETS
// --------------------------------------------------------------------------
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NexGrid] Admin Portal running on http://0.0.0.0:${PORT}`);
    startScheduler();
  });
}

setupServer().catch(console.error);
