package com.applyflow.auth;

import java.util.Map;

public class ProfileException extends RuntimeException {
    private final String code;
    private final Map<String, String> fieldErrors;

    private ProfileException(String message, String code, Map<String, String> fieldErrors) {
        super(message);
        this.code = code;
        this.fieldErrors = fieldErrors;
    }

    static ProfileException invalidTimeZone() {
        return new ProfileException(
                "One or more fields are invalid",
                "VALIDATION_FAILED",
                Map.of("timeZone", "must be a supported IANA time zone identifier"));
    }

    static ProfileException staleVersion() {
        return new ProfileException(
                "The profile changed since it was last read",
                "PROFILE_VERSION_CONFLICT",
                Map.of());
    }

    public String getCode() { return code; }
    public Map<String, String> getFieldErrors() { return fieldErrors; }
}
