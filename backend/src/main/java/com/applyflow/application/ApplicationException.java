package com.applyflow.application;

import java.util.Map;

public class ApplicationException extends RuntimeException {
    private final String code;
    private final Map<String, String> fieldErrors;

    private ApplicationException(String message, String code, Map<String, String> fieldErrors) {
        super(message);
        this.code = code;
        this.fieldErrors = fieldErrors;
    }

    static ApplicationException validation(String field, String message) {
        return new ApplicationException("One or more fields are invalid", "VALIDATION_FAILED",
                Map.of(field, message));
    }

    static ApplicationException companyUnavailable() {
        return new ApplicationException("The selected company is not available",
                "APPLICATION_COMPANY_UNAVAILABLE", Map.of("companyId", "must identify one of your active companies"));
    }

    static ApplicationException notFound() {
        return new ApplicationException("Application not found", "APPLICATION_NOT_FOUND", Map.of());
    }

    static ApplicationException staleVersion() {
        return new ApplicationException("The application changed since it was last read",
                "APPLICATION_VERSION_CONFLICT", Map.of());
    }

    static ApplicationException sameStatus() {
        return new ApplicationException("The application is already in that status",
                "APPLICATION_STATUS_UNCHANGED", Map.of("newStatus", "must differ from the current status"));
    }

    public String getCode() { return code; }
    public Map<String, String> getFieldErrors() { return fieldErrors; }
}
