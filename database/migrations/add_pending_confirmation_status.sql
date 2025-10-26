-- Migration: Add PENDING_CONFIRMATION to payment_status enum
-- Date: 2025-10-26
-- Description: Add new payment status for when customer confirms bank transfer

-- Add new value to payment_status enum
ALTER TYPE agri.payment_status ADD VALUE IF NOT EXISTS 'PENDING_CONFIRMATION' AFTER 'UNPAID';

-- Update existing orders that are BANK_TRANSFER and UNPAID
-- (Optional: can be used to mark old orders)
COMMENT ON TYPE agri.payment_status IS 'Payment status: UNPAID, PENDING_CONFIRMATION (customer confirmed), PAID, REFUNDED, PARTIALLY_REFUNDED';
