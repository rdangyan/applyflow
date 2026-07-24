package com.applyflow.platform.web;

import com.applyflow.auth.AuthenticationException;
import com.applyflow.auth.ProfileException;
import com.applyflow.application.ApplicationException;
import com.applyflow.company.CompanyException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.net.URI;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(AuthenticationException.class)
    ProblemDetail handleAuthentication(AuthenticationException exception, HttpServletRequest request) {
        HttpStatus status = switch (exception.getCode()) {
            case "EMAIL_ALREADY_REGISTERED" -> HttpStatus.CONFLICT;
            case "INVALID_ORIGIN" -> HttpStatus.FORBIDDEN;
            default -> HttpStatus.UNAUTHORIZED;
        };
        return problem(status, exception.getMessage(), exception.getCode(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "One or more fields are invalid", "VALIDATION_FAILED", request);
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
                fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        problem.setProperty("fieldErrors", fieldErrors);
        return problem;
    }

    @ExceptionHandler(ProfileException.class)
    ProblemDetail handleProfile(ProfileException exception, HttpServletRequest request) {
        HttpStatus status = "PROFILE_VERSION_CONFLICT".equals(exception.getCode())
                ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
        ProblemDetail problem = problem(status, exception.getMessage(), exception.getCode(), request);
        if (!exception.getFieldErrors().isEmpty()) problem.setProperty("fieldErrors", exception.getFieldErrors());
        return problem;
    }

    @ExceptionHandler(CompanyException.class)
    ProblemDetail handleCompany(CompanyException exception, HttpServletRequest request) {
        HttpStatus status = switch (exception.getCode()) {
            case "COMPANY_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "COMPANY_NAME_CONFLICT", "COMPANY_VERSION_CONFLICT", "COMPANY_STATE_CONFLICT" -> HttpStatus.CONFLICT;
            default -> HttpStatus.BAD_REQUEST;
        };
        ProblemDetail problem = problem(status, exception.getMessage(), exception.getCode(), request);
        if (!exception.getFieldErrors().isEmpty()) problem.setProperty("fieldErrors", exception.getFieldErrors());
        return problem;
    }

    @ExceptionHandler(ApplicationException.class)
    ProblemDetail handleApplication(ApplicationException exception, HttpServletRequest request) {
        HttpStatus status = switch (exception.getCode()) {
            case "APPLICATION_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "APPLICATION_VERSION_CONFLICT" -> HttpStatus.CONFLICT;
            default -> HttpStatus.BAD_REQUEST;
        };
        ProblemDetail problem = problem(status, exception.getMessage(), exception.getCode(), request);
        if (!exception.getFieldErrors().isEmpty()) problem.setProperty("fieldErrors", exception.getFieldErrors());
        return problem;
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ProblemDetail handleNotFound(NoResourceFoundException exception, HttpServletRequest request) {
        return problem(HttpStatus.NOT_FOUND, "Resource not found", "RESOURCE_NOT_FOUND", request);
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleUnexpected(Exception exception, HttpServletRequest request) {
        log.error("Unhandled request failure", exception);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred", "INTERNAL_ERROR", request);
    }

    private ProblemDetail problem(HttpStatus status, String detail, String code, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(status.getReasonPhrase());
        problem.setType(URI.create("https://applyflow.example/problems/" + code.toLowerCase().replace('_', '-')));
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code);
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("traceId", MDC.get(TraceIdFilter.MDC_KEY));
        return problem;
    }
}
