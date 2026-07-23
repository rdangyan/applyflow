/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Company } from '../models/Company';
import type { CompanyListResponse } from '../models/CompanyListResponse';
import type { CompanyVersionRequest } from '../models/CompanyVersionRequest';
import type { CreateCompanyRequest } from '../models/CreateCompanyRequest';
import type { ProblemDetail } from '../models/ProblemDetail';
import type { UpdateCompanyRequest } from '../models/UpdateCompanyRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CompaniesService {
    /**
     * List active or archived companies owned by the current user
     * @returns CompanyListResponse Owner-scoped companies ordered by normalized name
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static listCompanies({
        archived = false,
    }: {
        archived?: boolean,
    }): CancelablePromise<CompanyListResponse | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/companies',
            query: {
                'archived': archived,
            },
        });
    }
    /**
     * Create a private company
     * Names are trimmed, whitespace-normalized, case-folded, and unique within the current user's workspace.
     * @returns ProblemDetail An RFC 9457 API problem
     * @returns Company Company created
     * @throws ApiError
     */
    public static createCompany({
        requestBody,
    }: {
        requestBody: CreateCompanyRequest,
    }): CancelablePromise<ProblemDetail | Company> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/companies',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get an owned active or archived company
     * @returns Company Company details
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static getCompany({
        companyId,
    }: {
        companyId: string,
    }): CancelablePromise<Company | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/companies/{companyId}',
            path: {
                'companyId': companyId,
            },
        });
    }
    /**
     * Update an owned company
     * The last-read version is required; stale writes return 409 Conflict.
     * @returns Company Company updated
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static updateCompany({
        companyId,
        requestBody,
    }: {
        companyId: string,
        requestBody: UpdateCompanyRequest,
    }): CancelablePromise<Company | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/companies/{companyId}',
            path: {
                'companyId': companyId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Archive an owned active company
     * @returns Company Company archived
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static archiveCompany({
        companyId,
        requestBody,
    }: {
        companyId: string,
        requestBody: CompanyVersionRequest,
    }): CancelablePromise<Company | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/companies/{companyId}/archive',
            path: {
                'companyId': companyId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Restore an owned archived company
     * @returns Company Company restored
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static restoreCompany({
        companyId,
        requestBody,
    }: {
        companyId: string,
        requestBody: CompanyVersionRequest,
    }): CancelablePromise<Company | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/companies/{companyId}/restore',
            path: {
                'companyId': companyId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
