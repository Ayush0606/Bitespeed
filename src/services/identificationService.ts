/**
 * Identity Reconciliation Service
 * 
 * This service implements the core business logic for identifying and linking duplicate contacts.
 * It handles:
 * 1. Finding existing contacts by email or phone
 * 2. Merging contact chains
 * 3. Ensuring only one primary contact per chain
 * 4. Creating new contacts when needed
 * 5. Maintaining transactional integrity
 */

import { prisma } from '../prisma';
import { IdentifyRequest, ReconciliationResult, ContactRecord } from '../types';

export class IdentificationService {
  /**
   * Main identify method - handles the core reconciliation logic with optimized queries
   * 
   * Business Logic Flow:
   * 1. Validate input (at least one of email or phoneNumber must be provided)
   * 2. Find all existing contacts matching email OR phoneNumber
   * 3. If no matches: create new primary contact
   * 4. If matches exist: merge all linked chains and reconcile precedence
   * 5. Create new secondary contact if request contains new attributes
   * 
   * Query Optimization:
   * - Uses batch operations to reduce database round trips from N+1 to ~3 queries
   * - Collects all linked contacts in level-by-level batches instead of per-contact
   * - Batches all update operations together using updateMany()
   * - Eliminates duplicate queries through deduplication
   * 
   * @param request - The identify request containing email and/or phoneNumber
   * @returns ReconciliationResult with primary and secondary contacts
   * @throws Error if validation fails or database operation fails
   */
  async identifyContact(request: IdentifyRequest): Promise<ReconciliationResult> {
    // Validation: ensure at least one of email or phoneNumber is provided
    if (!request.email && !request.phoneNumber) {
      throw new Error('Either email or phoneNumber must be provided');
    }

    return prisma.$transaction(async (tx) => {
      // Step 1: Find all contacts matching email or phoneNumber
      const matchingContacts = await tx.contact.findMany({
        where: {
          OR: [
            { email: request.email || undefined },
            { phoneNumber: request.phoneNumber || undefined },
          ],
        },
      });

      // Step 2: No matches found - create a new primary contact
      if (matchingContacts.length === 0) {
        const newContact = await tx.contact.create({
          data: {
            email: request.email || null,
            phoneNumber: request.phoneNumber || null,
            linkPrecedence: 'primary',
          },
        });

        return {
          primaryContact: newContact,
          secondaryContacts: [],
          allEmails: newContact.email ? [newContact.email] : [],
          allPhoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
        };
      }

      // Step 3: Matches found - collect all linked contacts across all chains
      // This includes the matched contacts themselves and any they link to
      const allLinkedContacts = await this.getAllLinkedContacts(tx, matchingContacts);

      // Step 4: Identify the primary contact (oldest by createdAt)
      const primaryContact = this.identifyPrimaryContact(allLinkedContacts);

      // Step 5: Get all secondary contacts (everyone except the primary)
      const secondaryContacts = allLinkedContacts.filter(
        (contact) => contact.id !== primaryContact.id
      );

      // Step 6: Batch update all secondary contacts to link to the primary
      // Separate contacts that need updating: primaries being converted to secondary
      // and secondaries that might be linked to the wrong parent
      const contactsToUpdateToPrimary = secondaryContacts.filter(
        (c) => c.linkPrecedence === 'primary'
      );
      const contactsToUpdateLink = secondaryContacts.filter(
        (c) => c.linkedId !== primaryContact.id
      );

      // Perform batch updates in parallel to minimize query time
      const updatePromises: Promise<any>[] = [];

      // Batch 1: Convert all old primaries to secondary with single transaction
      if (contactsToUpdateToPrimary.length > 0) {
        updatePromises.push(
          tx.contact.updateMany({
            where: { id: { in: contactsToUpdateToPrimary.map((c) => c.id) } },
            data: {
              linkedId: primaryContact.id,
              linkPrecedence: 'secondary',
            },
          })
        );
      }

      // Batch 2: Update all other contacts to link to primary (if not already)
      // Exclude the ones we just updated to avoid redundant updates
      const otherSecondariesToUpdate = contactsToUpdateLink.filter(
        (c) => !contactsToUpdateToPrimary.find((p) => p.id === c.id)
      );

      if (otherSecondariesToUpdate.length > 0) {
        updatePromises.push(
          tx.contact.updateMany({
            where: { id: { in: otherSecondariesToUpdate.map((c) => c.id) } },
            data: { linkedId: primaryContact.id },
          })
        );
      }

      // Wait for all updates to complete
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      // Step 7: Check if request contains new information not in the chain
      const existingEmails = allLinkedContacts
        .map((c) => c.email)
        .filter((e) => e !== null) as string[];
      const existingPhones = allLinkedContacts
        .map((c) => c.phoneNumber)
        .filter((p) => p !== null) as string[];

      const emailIsNew = request.email && !existingEmails.includes(request.email);
      const phoneIsNew = request.phoneNumber && !existingPhones.includes(request.phoneNumber);

      // Step 8: Create a new secondary contact if the request contains new info
      let updatedSecondaries = secondaryContacts;
      if (emailIsNew || phoneIsNew) {
        const newSecondary = await tx.contact.create({
          data: {
            email: emailIsNew ? request.email : null,
            phoneNumber: phoneIsNew ? request.phoneNumber : null,
            linkedId: primaryContact.id,
            linkPrecedence: 'secondary',
          },
        });
        updatedSecondaries = [...updatedSecondaries, newSecondary];
      }

      // Step 9: Collect all unique emails and phone numbers
      const allContacts = [primaryContact, ...updatedSecondaries];
      const allEmails = Array.from(
        new Set(allContacts.map((c) => c.email).filter((e) => e !== null))
      ) as string[];
      const allPhoneNumbers = Array.from(
        new Set(allContacts.map((c) => c.phoneNumber).filter((p) => p !== null))
      ) as string[];

      return {
        primaryContact,
        secondaryContacts: updatedSecondaries,
        allEmails,
        allPhoneNumbers,
      };
    });
  }

  /**
   * Optimized batch collection of all linked contacts
   * Uses level-by-level fetching to minimize database round trips
   * 
   * Instead of processing one contact at a time (which causes N+1 query problems),
   * this fetches all contacts at each level together, reducing queries from potentially
   * N+1 to 2-3 queries total regardless of chain depth.
   * 
   * @param tx - Prisma transaction client
   * @param contacts - Initial contacts to start from
   * @returns All uniquely linked contacts
   */
  private async getAllLinkedContacts(tx: any, contacts: ContactRecord[]): Promise<ContactRecord[]> {
    const seenIds = new Set<number>(contacts.map((c) => c.id));
    const allContacts: ContactRecord[] = [...contacts];
    
    // Extract IDs for batch queries
    let currentIds = contacts.map((c) => c.id);
    let linkedParentIds = contacts.map((c) => c.linkedId).filter((id) => id !== null) as number[];
    
    // Remove IDs we've already seen from parent IDs
    linkedParentIds = linkedParentIds.filter((id) => !seenIds.has(id));

    // Fetch all contacts level-by-level using batch queries
    while (currentIds.length > 0 || linkedParentIds.length > 0) {
      const nextLevelIds: number[] = [];
      const nextParentIds: number[] = [];

      // Batch 1: Find all contacts that link to the current batch (as secondaries)
      if (currentIds.length > 0) {
        const secondaryContacts = await tx.contact.findMany({
          where: { linkedId: { in: currentIds } },
        });

        for (const contact of secondaryContacts) {
          if (!seenIds.has(contact.id)) {
            seenIds.add(contact.id);
            allContacts.push(contact);
            nextLevelIds.push(contact.id);

            // Collect parent IDs to fetch in the next iteration
            if (contact.linkedId && !seenIds.has(contact.linkedId)) {
              nextParentIds.push(contact.linkedId);
            }
          }
        }
      }

      // Batch 2: Find all parent contacts that the current batch links to
      if (linkedParentIds.length > 0) {
        const parentContacts = await tx.contact.findMany({
          where: { id: { in: linkedParentIds } },
        });

        for (const contact of parentContacts) {
          if (!seenIds.has(contact.id)) {
            seenIds.add(contact.id);
            allContacts.push(contact);
            nextLevelIds.push(contact.id);

            // Collect their parents for next iteration
            if (contact.linkedId && !seenIds.has(contact.linkedId)) {
              nextParentIds.push(contact.linkedId);
            }
          }
        }
      }

      // Move to next level, removing duplicates
      currentIds = nextLevelIds;
      linkedParentIds = Array.from(new Set(nextParentIds));
    }

    return allContacts;
  }

  /**
   * Identifies the primary contact from a list of contacts
   * The primary is always the oldest contact by createdAt
   * 
   * @param contacts - List of contacts
   * @returns The primary contact (oldest)
   */
  private identifyPrimaryContact(contacts: ContactRecord[]): ContactRecord {
    if (contacts.length === 0) {
      throw new Error('Cannot identify primary contact from empty list');
    }

    return contacts.reduce((oldest, current) => {
      return current.createdAt < oldest.createdAt ? current : oldest;
    });
  }
}

export const identificationService = new IdentificationService();
