package com.applyflow.application;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import static com.applyflow.application.ApplicationDtos.ApplicationResponse;
import static com.applyflow.application.ApplicationDtos.CreateApplicationRequest;
import static com.applyflow.application.ApplicationDtos.StatusHistoryResponse;
import static com.applyflow.application.ApplicationDtos.StatusTransitionRequest;
import static com.applyflow.application.ApplicationDtos.UpdateApplicationRequest;

import java.util.List;
import java.util.UUID;

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

    @GetMapping("/{applicationId}")
    ApplicationResponse get(@AuthenticationPrincipal Jwt jwt,
                            @PathVariable UUID applicationId) {
        return applicationService.get(jwt.getSubject(), applicationId);
    }

    @PutMapping("/{applicationId}")
    ApplicationResponse update(@AuthenticationPrincipal Jwt jwt,
                               @PathVariable UUID applicationId,
                               @Valid @RequestBody UpdateApplicationRequest request) {
        return applicationService.update(jwt.getSubject(), applicationId, request);
    }

    @GetMapping("/{applicationId}/status-transitions")
    List<StatusHistoryResponse> history(@AuthenticationPrincipal Jwt jwt,
                                        @PathVariable UUID applicationId) {
        return applicationService.history(jwt.getSubject(), applicationId);
    }

    @PostMapping("/{applicationId}/status-transitions")
    ApplicationResponse transition(@AuthenticationPrincipal Jwt jwt,
                                   @PathVariable UUID applicationId,
                                   @Valid @RequestBody StatusTransitionRequest request) {
        return applicationService.transition(jwt.getSubject(), applicationId, request);
    }
}
