/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CurrentUser } from './CurrentUser';
export type AuthResponse = {
    /**
     * A 15-minute JWT held by the SPA in memory
     */
    accessToken: string;
    expiresIn: number;
    user: CurrentUser;
};

