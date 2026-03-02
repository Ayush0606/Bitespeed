/**
 * Identify Controller
 * 
 * Handles HTTP requests for the /identify endpoint
 * Responsible for:
 * - Validating request format
 * - Calling the identification service
 * - Formatting the response
 * - Error handling
 */

import { Request, Response } from 'express';
import { IdentifyRequest, IdentifyResponse } from '../types';
import { identificationService } from '../services/identificationService';

export class IdentifyController {
  /**
   * POST /identify endpoint
   * 
   * Accepts JSON payload with optional email and phoneNumber
   * Returns consolidated contact information with primary and secondary IDs
   * 
   * @param req - Express request with email and/or phoneNumber in body
   * @param res - Express response
   */
  async identify(req: Request, res: Response): Promise<void> {
    try {
      // Extract and validate request body
      const request: IdentifyRequest = req.body;

      // Validate that at least one field is provided
      if (!request.email && !request.phoneNumber) {
        res.status(400).json({
          error: 'Either email or phoneNumber must be provided',
        });
        return;
      }

      // Call the service to perform reconciliation
      const result = await identificationService.identifyContact(request);

      // Format the response
      const response: IdentifyResponse = {
        contact: {
          primaryContactId: result.primaryContact.id,
          emails: result.allEmails,
          phoneNumbers: result.allPhoneNumbers,
          secondaryContactIds: result.secondaryContacts.map((c) => c.id),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      // Error handling is done at middleware level
      // Re-throw to let error middleware handle it
      throw error;
    }
  }
}

export const identifyController = new IdentifyController();
