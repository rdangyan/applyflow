package com.applyflow.application;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import static com.applyflow.application.ApplicationDtos.ApplicationResponse;
import static com.applyflow.application.ApplicationDtos.CreateApplicationRequest;

@RestController
@RequestMapping("/api/v1/applications")
class ApplicationController {
    private final ApplicationService applicationService;

    ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApplicationResponse create(@AuthenticationPrincipal Jwt jwt,
                               @Valid @RequestBody CreateApplicationRequest request) {
        return applicationService.create(jwt.getSubject(), request);
    }
}
