package com.applyflow.company;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import static com.applyflow.company.CompanyDtos.*;

@RestController
@RequestMapping("/api/v1/companies")
class CompanyController {
    private final CompanyService companyService;

    CompanyController(CompanyService companyService) { this.companyService = companyService; }

    @GetMapping
    CompanyListResponse list(@AuthenticationPrincipal Jwt jwt,
                             @RequestParam(defaultValue = "false") boolean archived) {
        return companyService.list(jwt.getSubject(), archived);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    CompanyResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateCompanyRequest request) {
        return companyService.create(jwt.getSubject(), request);
    }

    @GetMapping("/{id}")
    CompanyResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return companyService.get(jwt.getSubject(), id);
    }

    @PutMapping("/{id}")
    CompanyResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                           @Valid @RequestBody UpdateCompanyRequest request) {
        return companyService.update(jwt.getSubject(), id, request);
    }

    @PostMapping("/{id}/archive")
    CompanyResponse archive(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                            @Valid @RequestBody CompanyVersionRequest request) {
        return companyService.archive(jwt.getSubject(), id, request);
    }

    @PostMapping("/{id}/restore")
    CompanyResponse restore(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                            @Valid @RequestBody CompanyVersionRequest request) {
        return companyService.restore(jwt.getSubject(), id, request);
    }
}
