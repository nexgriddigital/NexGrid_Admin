import { db } from './db';
import { sendSmsNotification, sendEmailNotification, populateTemplate } from './smsService';

let schedulerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Calculates remaining days until expiration based on Addis Ababa date.
 */
export function getDaysUntilExpiration(expirationDateStr: string): number {
  const [year, month, day] = expirationDateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);

  // Current date in Addis Ababa
  const now = new Date();
  const addisStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [currY, currM, currD] = addisStr.split('-').map(Number);
  const currentDate = new Date(currY, currM - 1, currD);

  const diffTime = targetDate.getTime() - currentDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Runs one check cycle for domains, reminders, and invoice statuses.
 */
export async function runSchedulerCycle(): Promise<{
  domainsChecked: number;
  remindersSent: number;
  invoicesUpdated: number;
}> {
  if (isProcessing) {
    return { domainsChecked: 0, remindersSent: 0, invoicesUpdated: 0 };
  }

  isProcessing = true;
  let remindersSent = 0;
  let invoicesUpdated = 0;

  try {
    const settings = db.getSettings();
    const domains = db.getDomains();
    const intervals = (settings.system.reminderIntervals || [30, 14, 7, 3, 1]).sort(
      (a, b) => b - a
    );

    // 1. Process domains
    for (const domain of domains) {
      if (domain.status === 'Cancelled' || domain.status === 'Renewed') {
        continue;
      }

      const daysLeft = getDaysUntilExpiration(domain.expirationDate);

      // Auto update status based on days left
      if (daysLeft < 0 && domain.status !== 'Expired') {
        db.updateDomain(domain.id, { status: 'Expired' });
        db.logAudit(
          'DOMAIN_EXPIRED',
          'domain',
          domain.id,
          `Domain ${domain.domainName} expired on ${domain.expirationDate} (${Math.abs(daysLeft)} days overdue).`,
          'Scheduler'
        );
      } else if (daysLeft >= 0 && daysLeft <= 30 && domain.status === 'Active') {
        db.updateDomain(domain.id, { status: 'Expiring Soon' });
      }

      // Check if domain is due for an interval reminder
      // For each configured interval (e.g., 30, 14, 7, 3, 1)
      for (const interval of intervals) {
        if (daysLeft <= interval && daysLeft > 0) {
          // Check if this interval was ALREADY sent
          const alreadySent = domain.sentReminders.some(
            (r) => r.intervalDays === interval
          );

          if (!alreadySent) {
            const customer = db.getCustomerById(domain.customerId);
            if (!customer || customer.status === 'archived') {
              continue;
            }

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

            // SMS reminder
            if (customer.phone && settings.sms.enabled) {
              const smsContent = populateTemplate(
                settings.templates.domainReminderSMS,
                templateVars
              );
              await sendSmsNotification(
                customer.phone,
                smsContent,
                'domain_reminder',
                customer.id,
                customer.businessName
              );
            }

            // Email reminder
            if (customer.email && settings.email.enabled) {
              const subject = populateTemplate(
                settings.templates.domainReminderEmailSubject,
                templateVars
              );
              const body = populateTemplate(
                settings.templates.domainReminderEmailBody,
                templateVars
              );
              await sendEmailNotification(
                customer.email,
                subject,
                body,
                'domain_reminder',
                customer.id,
                customer.businessName
              );
            }

            // Record interval in domain record to guarantee NO DUPLICATES
            const updatedSent = [
              ...domain.sentReminders,
              { intervalDays: interval, sentAt: new Date().toISOString() },
            ];
            db.updateDomain(domain.id, { sentReminders: updatedSent });

            db.logAudit(
              'REMINDER_DISPATCHED',
              'domain',
              domain.id,
              `Sent ${interval}-day renewal reminder for ${domain.domainName} to ${customer.businessName}`,
              'Scheduler'
            );

            remindersSent++;
            break; // Send closest matching interval per cycle
          }
        }
      }
    }

    // 2. Process invoices (check overdue)
    const invoices = db.getInvoices();
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    for (const inv of invoices) {
      if ((inv.status === 'Unpaid' || inv.status === 'Partially Paid') && inv.dueDate < todayStr) {
        db.updateInvoice(inv.id, { status: 'Overdue' });
        invoicesUpdated++;
      }
    }

    // 3. Clean up expired sessions
    db.cleanExpiredSessions();

    return {
      domainsChecked: domains.length,
      remindersSent,
      invoicesUpdated,
    };
  } catch (err) {
    console.error('Scheduler cycle error:', err);
    return { domainsChecked: 0, remindersSent, invoicesUpdated };
  } finally {
    isProcessing = false;
  }
}

export function startScheduler() {
  if (schedulerInterval) return;
  console.log('[Scheduler] Starting automated reminder and audit engine...');
  // Run immediately on boot
  runSchedulerCycle().catch(console.error);
  // Then run every 60 seconds
  schedulerInterval = setInterval(() => {
    runSchedulerCycle().catch(console.error);
  }, 60000);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
