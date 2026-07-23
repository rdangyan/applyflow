/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Application } from '../models/Application';
import type { CreateApplicationRequest } from '../models/CreateApplicationRequest';
import type { ProblemDetail } from '../models/ProblemDetail';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ApplicationsService {
    /**
     * Quick-capture a Saved application
     * Creates an owner-scoped Saved application using exactly one active companyId or a companyName that is created atomically as a name-only company.
     *
     * @returns ProblemDetail An RFC 9457 API problem
     * @returns Application Saved application created
     * @throws ApiError
     */
    public static createApplication({
        requestBody,
    }: {
        requestBody: CreateApplicationRequest,
    }): CancelablePromise<ProblemDetail | Application> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/applications',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
