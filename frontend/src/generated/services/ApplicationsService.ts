/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Application } from '../models/Application';
import type { CreateApplicationRequest } from '../models/CreateApplicationRequest';
import type { ProblemDetail } from '../models/ProblemDetail';
import type { StatusHistoryEntry } from '../models/StatusHistoryEntry';
import type { StatusTransitionRequest } from '../models/StatusTransitionRequest';
import type { UpdateApplicationRequest } from '../models/UpdateApplicationRequest';
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
    /**
     * Get an owned application's complete details
     * Other users' application identifiers behave as unavailable resources.
     * @returns Application Complete application details and company context
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static getApplication({
        applicationId,
    }: {
        applicationId: string,
    }): CancelablePromise<Application | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/applications/{applicationId}',
            path: {
                'applicationId': applicationId,
            },
        });
    }
    /**
     * Update an owned application
     * Replaces editable details using the last-read version. Stale versions return 409 Conflict. Application dates are local calendar dates and may be backdated.
     *
     * @returns Application Updated application
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static updateApplication({
        applicationId,
        requestBody,
    }: {
        applicationId: string,
        requestBody: UpdateApplicationRequest,
    }): CancelablePromise<Application | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/applications/{applicationId}',
            path: {
                'applicationId': applicationId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List an owned application's immutable status history
     * Entries are returned chronologically. Other users' identifiers behave as unavailable resources.
     * @returns StatusHistoryEntry Chronological status history
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static listApplicationStatusHistory({
        applicationId,
    }: {
        applicationId: string,
    }): CancelablePromise<Array<StatusHistoryEntry> | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/applications/{applicationId}/status-transitions',
            path: {
                'applicationId': applicationId,
            },
        });
    }
    /**
     * Explicitly transition an owned application to a different status
     * Atomically updates the application and appends an immutable history entry. The last-read version is required; stale versions return 409 Conflict. Leaving Saved requires an application date.
     *
     * @returns Application Application after the recorded transition
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static transitionApplicationStatus({
        applicationId,
        requestBody,
    }: {
        applicationId: string,
        requestBody: StatusTransitionRequest,
    }): CancelablePromise<Application | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/applications/{applicationId}/status-transitions',
            path: {
                'applicationId': applicationId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
