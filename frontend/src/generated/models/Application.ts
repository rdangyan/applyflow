/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApplicationCompany } from './ApplicationCompany';
import type { ApplicationStatus } from './ApplicationStatus';
import type { EmploymentType } from './EmploymentType';
import type { PayPeriod } from './PayPeriod';
import type { SourceCategory } from './SourceCategory';
import type { WorkplaceArrangement } from './WorkplaceArrangement';
export type Application = {
    id: string;
    company: ApplicationCompany;
    jobTitle: string;
    status: ApplicationStatus;
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
    createdAt: string;
    updatedAt: string;
    version: number;
};

