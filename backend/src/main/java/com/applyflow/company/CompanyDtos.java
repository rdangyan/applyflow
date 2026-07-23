package com.applyflow.company;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

final class CompanyDtos {
    private CompanyDtos() {}

    record CreateCompanyRequest(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 2048) String website,
            @Size(max = 200) String industry,
            @Size(max = 200) String location,
            @Size(max = 10000) String notes
    ) {}

    record UpdateCompanyRequest(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 2048) String website,
            @Size(max = 200) String industry,
            @Size(max = 200) String location,
            @Size(max = 10000) String notes,
            @PositiveOrZero long version
    ) {}

    record CompanyVersionRequest(@PositiveOrZero long version) {}

    record CompanyResponse(
            UUID id, String name, String website, String industry, String location, String notes,
            boolean archived, Instant archivedAt, Instant createdAt, Instant updatedAt, long version
    ) {
        static CompanyResponse from(Company company) {
            return new CompanyResponse(company.getId(), company.getName(), company.getWebsite(), company.getIndustry(),
                    company.getLocation(), company.getNotes(), company.isArchived(), company.getArchivedAt(),
                    company.getCreatedAt(), company.getUpdatedAt(), company.getVersion());
        }
    }

    record CompanyListResponse(List<CompanyResponse> companies) {}
}
