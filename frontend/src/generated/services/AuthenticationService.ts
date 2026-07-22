/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthResponse } from '../models/AuthResponse';
import type { CurrentUser } from '../models/CurrentUser';
import type { DeviceSessionsResponse } from '../models/DeviceSessionsResponse';
import type { LoginRequest } from '../models/LoginRequest';
import type { ProblemDetail } from '../models/ProblemDetail';
import type { RegisterRequest } from '../models/RegisterRequest';
import type { UpdateProfileRequest } from '../models/UpdateProfileRequest';
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
     * @returns AuthResponse Identity restored and the refresh token rotated
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
    /**
     * Update the current user's profile preferences
     * Uses optimistic versioning; a stale version returns 409 Conflict.
     * @returns CurrentUser Updated private user context
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static updateProfile({
        requestBody,
    }: {
        requestBody: UpdateProfileRequest,
    }): CancelablePromise<CurrentUser | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/auth/me',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List the user's active device sessions
     * @returns DeviceSessionsResponse Active sessions, with no refresh-token values
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static listSessions(): CancelablePromise<DeviceSessionsResponse | ProblemDetail> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/auth/sessions',
        });
    }
    /**
     * Revoke one owned device session
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static revokeSession({
        sessionId,
    }: {
        sessionId: string,
    }): CancelablePromise<ProblemDetail> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/auth/sessions/{sessionId}',
            path: {
                'sessionId': sessionId,
            },
        });
    }
    /**
     * Revoke every refresh session owned by the current user
     * @returns ProblemDetail An RFC 9457 API problem
     * @throws ApiError
     */
    public static logoutEverywhere(): CancelablePromise<ProblemDetail> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/logout-all',
        });
    }
}
