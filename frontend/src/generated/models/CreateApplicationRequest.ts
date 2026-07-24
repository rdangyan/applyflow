/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EmploymentType } from './EmploymentType';
import type { PayPeriod } from './PayPeriod';
import type { SourceCategory } from './SourceCategory';
import type { WorkplaceArrangement } from './WorkplaceArrangement';
/**
 * Exactly one of companyId or companyName must be provided.
 */
export type CreateApplicationRequest = {
    /**
     * An active company owned by the authenticated user
     */
    companyId?: string | null;
    /**
     * A unique name-only company to create in the same transaction
     */
    companyName?: string | null;
    jobTitle: string;
    /**
     * The user's local calendar date; required after Saved
     */
    applicationDate?: string | null;
    postingUrl?: string | null;
    location?: string | null;
    description?: string | null;
    notes?: string | null;
    employmentType?: EmploymentType | null;
    workplaceArrangement?: WorkplaceArrangement | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    /**
     * ISO 4217 alphabetic currency code
     */
    salaryCurrency?: string | null;
    salaryPayPeriod?: PayPeriod | null;
    sourceCategory?: SourceCategory | null;
    sourceDetail?: string | null;
};

