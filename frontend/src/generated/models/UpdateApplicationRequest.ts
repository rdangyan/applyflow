/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EmploymentType } from './EmploymentType';
import type { PayPeriod } from './PayPeriod';
import type { SourceCategory } from './SourceCategory';
import type { WorkplaceArrangement } from './WorkplaceArrangement';
export type UpdateApplicationRequest = {
    /**
     * An owned company; changing companies requires an active company
     */
    companyId: string;
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
    salaryCurrency?: string | null;
    salaryPayPeriod?: PayPeriod | null;
    sourceCategory?: SourceCategory | null;
    sourceDetail?: string | null;
    version: number;
};

