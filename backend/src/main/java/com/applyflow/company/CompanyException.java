package com.applyflow.company;

import java.util.Map;

public class CompanyException extends RuntimeException {
    private final String code;
    private final Map<String, String> fieldErrors;

    private CompanyException(String message, String code, Map<String, String> fieldErrors) {
        super(message);
        this.code = code;
        this.fieldErrors = fieldErrors;
    }

    static CompanyException notFound() {
        return new CompanyException("Company not found", "COMPANY_NOT_FOUND", Map.of());
    }

    static CompanyException duplicateName() {
        return new CompanyException("A company with this name already exists", "COMPANY_NAME_CONFLICT",
                Map.of("name", "must be unique in your workspace"));
    }

    static CompanyException staleVersion() {
        return new CompanyException("The company changed since it was last read", "COMPANY_VERSION_CONFLICT", Map.of());
    }

    static CompanyException invalidName(String message) {
        return new CompanyException("One or more fields are invalid", "VALIDATION_FAILED", Map.of("name", message));
    }

    static CompanyException invalidState(String message) {
        return new CompanyException(message, "COMPANY_STATE_CONFLICT", Map.of());
    }

    public String getCode() { return code; }
    public Map<String, String> getFieldErrors() { return fieldErrors; }
}
