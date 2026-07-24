package com.applyflow.company;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

import static com.applyflow.company.CompanyDtos.CreateCompanyRequest;

@Component
public class CompanyApplicationGateway {
    private final CompanyRepository companies;
    private final CompanyService companyService;

    CompanyApplicationGateway(CompanyRepository companies, CompanyService companyService) {
        this.companies = companies;
        this.companyService = companyService;
    }

    @Transactional(readOnly = true)
    public Optional<CompanyReference> findActiveOwned(UUID ownerId, UUID companyId) {
        return companies.findByIdAndOwnerIdAndArchivedAtIsNull(companyId, ownerId)
                .map(company -> new CompanyReference(company.getId(), company.getName()));
    }

    @Transactional(readOnly = true)
    public Optional<CompanyReference> findOwned(UUID ownerId, UUID companyId) {
        return companies.findByIdAndOwnerId(companyId, ownerId)
                .map(company -> new CompanyReference(company.getId(), company.getName()));
    }

    @Transactional
    public CompanyReference createNameOnly(UUID ownerId, String name) {
        var company = companyService.create(ownerId.toString(),
                new CreateCompanyRequest(name, null, null, null, null));
        return new CompanyReference(company.id(), company.name());
    }

    public record CompanyReference(UUID id, String name) {}
}
