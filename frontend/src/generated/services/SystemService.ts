/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProblemDetail } from '../models/ProblemDetail';
import type { SystemStatus } from '../models/SystemStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SystemService {
    /**
     * Check the API and database path
     * @returns SystemStatus The application and migrated database are available
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static getSystemStatus(): CancelablePromise<SystemStatus | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/system/status',
        });
    }
}
