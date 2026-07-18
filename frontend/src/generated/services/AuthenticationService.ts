/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthResponse } from '../models/AuthResponse';
import type { CurrentUser } from '../models/CurrentUser';
import type { LoginRequest } from '../models/LoginRequest';
import type { ProblemDetail } from '../models/ProblemDetail';
import type { RegisterRequest } from '../models/RegisterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Create a private user account
     * @returns AuthResponse Account created; an HttpOnly refresh cookie is also established
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static register({
        requestBody,
    }: {
        requestBody: RegisterRequest,
    }): CancelablePromise<AuthResponse | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/register',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Sign in with an email address and password
     * @returns AuthResponse Authenticated; an HttpOnly refresh cookie is also established
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static login({
        requestBody,
    }: {
        requestBody: LoginRequest,
    }): CancelablePromise<AuthResponse | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/login',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Restore an access token from the refresh cookie
     * @returns AuthResponse Identity restored
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static refresh(): CancelablePromise<AuthResponse | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/refresh',
        });
    }
    /**
     * Revoke the current refresh session and clear its cookie
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static logout(): CancelablePromise<ProblemDetail> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/logout',
        });
    }
    /**
     * Retrieve the user represented by the access token
     * @returns CurrentUser Current private user context
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static getCurrentUser(): CancelablePromise<CurrentUser | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/auth/me',
        });
    }
}
