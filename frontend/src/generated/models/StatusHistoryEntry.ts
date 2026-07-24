/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApplicationStatus } from './ApplicationStatus';
export type StatusHistoryEntry = {
    id: string;
    applicationId: string;
    previousStatus: ApplicationStatus;
    newStatus: ApplicationStatus;
    changedAt: string;
    note?: string | null;
};

