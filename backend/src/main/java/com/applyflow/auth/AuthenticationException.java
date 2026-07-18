package com.applyflow.auth;

public class AuthenticationException extends RuntimeException {
    private final String code;

    AuthenticationException(String message, String code) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}
