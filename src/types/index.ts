/**
 * Types and Interfaces for Identity Reconciliation Service
 */

/**
 * Request body for the /identify endpoint
 */
export interface IdentifyRequest {
  email?: string;
  phoneNumber?: string;
}

/**
 * Contact data returned from database
 */
export interface ContactRecord {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Response body for the /identify endpoint
 */
export interface IdentifyResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

/**
 * Reconciliation result containing all linked contacts
 */
export interface ReconciliationResult {
  primaryContact: ContactRecord;
  secondaryContacts: ContactRecord[];
  allEmails: string[];
  allPhoneNumbers: string[];
}
