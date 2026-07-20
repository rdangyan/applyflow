/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DeviceSession = {
    /**
     * Stable identifier for this device session
     */
    id: string;
    createdAt: string;
    lastUsedAt: string;
    /**
     * Earlier of inactivity and absolute expiration
     */
    expiresAt: string;
    current: boolean;
};

