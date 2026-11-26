import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../apps/public/layouts/PublicLayout';
import { EventLandingPage } from '../apps/public/pages/EventLandingPage';
import { StoryPage } from '../apps/public/pages/StoryPage';
import { TicketsPage } from '../apps/public/pages/TicketsPage';
import { RegisterPage } from '../apps/public/pages/RegisterPage';
import {
  CheckoutPage,
  PaymentPage,
  PaymentStatusResultPage,
} from '../apps/public/pages/CheckoutPaymentPages';
import {
  FaqPage,
  IndividualTicketPassPage,
  MyTicketsPage,
  PolicyPage,
  SupportPage,
} from '../apps/public/pages/MyTicketsAndPolicyPages';

import { AdminLoginPage } from '../apps/admin/pages/AdminLoginPage';
import { AdminLayout } from '../apps/admin/layouts/AdminLayout';
import {
  AdminDashboardPage,
  EventDayControlCenterPage,
} from '../apps/admin/pages/AdminDashboardPages';
import {
  AdminAttendeesPage,
  AdminBookingsPage,
  AdminCheckinsPage,
  AdminPaymentsPage,
  AdminRefundsPage,
  AdminTicketsPage,
} from '../apps/admin/pages/AdminOperationsPages';
import {
  AdminAuditLogsPage,
  AdminDevicesPage,
  AdminEmergencyPage,
  AdminEventSettingsPage,
  AdminGatesPage,
  AdminNotificationsPage,
  AdminPromoCodesPage,
  AdminRegistrationFormsPage,
  AdminReportsPage,
  AdminStaffPage,
  AdminSupportPage,
  AdminSystemSettingsPage,
  AdminTicketTypesPage,
} from '../apps/admin/pages/AdminManagementPages';

import { StaffLoginPage } from '../apps/scanner/pages/StaffLoginPage';
import { ScannerLayout } from '../apps/scanner/layouts/ScannerLayout';
import {
  StaffDashboardPage,
  StaffDeviceStatusPage,
  StaffGatesPage,
  StaffManualLookupPage,
  StaffRecentScansPage,
  StaffScannerPage,
} from '../apps/scanner/pages/ScannerPages';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Attendee Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<EventLandingPage />} />
          <Route path="/event" element={<EventLandingPage />} />
          <Route path="/story" element={<StoryPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment/callback" element={<PaymentStatusResultPage mode="callback" />} />
          <Route path="/payment/success" element={<PaymentStatusResultPage mode="success" />} />
          <Route path="/payment/failure" element={<PaymentStatusResultPage mode="failure" />} />
          <Route path="/payment/pending" element={<PaymentStatusResultPage mode="pending" />} />
          <Route path="/confirmation" element={<PaymentStatusResultPage mode="success" />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/ticket/:secureReference" element={<IndividualTicketPassPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/terms" element={<PolicyPage type="terms" />} />
          <Route path="/privacy" element={<PolicyPage type="privacy" />} />
          <Route path="/refund-policy" element={<PolicyPage type="refund" />} />
        </Route>

        {/* Admin Console Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="event-control" element={<EventDayControlCenterPage />} />
          <Route path="event-settings" element={<AdminEventSettingsPage />} />
          <Route path="ticket-types" element={<AdminTicketTypesPage />} />
          <Route path="registration-forms" element={<AdminRegistrationFormsPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="attendees" element={<AdminAttendeesPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="refunds" element={<AdminRefundsPage />} />
          <Route path="tickets" element={<AdminTicketsPage />} />
          <Route path="checkins" element={<AdminCheckinsPage />} />
          <Route path="gates" element={<AdminGatesPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="devices" element={<AdminDevicesPage />} />
          <Route path="promo-codes" element={<AdminPromoCodesPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="analytics" element={<AdminDashboardPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="support" element={<AdminSupportPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="emergency" element={<AdminEmergencyPage />} />
          <Route path="system-settings" element={<AdminSystemSettingsPage />} />
        </Route>

        {/* Staff Scanner PWA Routes */}
        <Route path="/staff/login" element={<StaffLoginPage />} />
        <Route path="/staff" element={<ScannerLayout />}>
          <Route index element={<Navigate to="/staff/scanner" replace />} />
          <Route path="dashboard" element={<StaffDashboardPage />} />
          <Route path="gates" element={<StaffGatesPage />} />
          <Route path="scanner" element={<StaffScannerPage />} />
          <Route path="manual-lookup" element={<StaffManualLookupPage />} />
          <Route path="recent-scans" element={<StaffRecentScansPage />} />
          <Route path="device-status" element={<StaffDeviceStatusPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
