package com.applyflow.application;

import com.applyflow.company.CompanyApplicationGateway.CompanyReference;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

final class ApplicationDtos {
    private ApplicationDtos() {}

    record CreateApplicationRequest(
            UUID companyId,
            @Size(max = 200) String companyName,
            @NotBlank @Size(max = 300) String jobTitle,
            LocalDate applicationDate,
            @Size(max = 2048) String postingUrl,
            @Size(max = 200) String location,
            @Size(max = 20000) String description,
            @Size(max = 10000) String notes,
            EmploymentType employmentType,
            WorkplaceArrangement workplaceArrangement,
            @DecimalMin("0") BigDecimal salaryMin,
            @DecimalMin("0") BigDecimal salaryMax,
            @Pattern(regexp = "^[A-Za-z]{3}$", message = "must be a 3-letter ISO currency code") String salaryCurrency,
            PayPeriod salaryPayPeriod,
            SourceCategory sourceCategory,
            @Size(max = 500) String sourceDetail
    ) {}

    record UpdateApplicationRequest(
            @NotNull UUID companyId,
            @NotBlank @Size(max = 300) String jobTitle,
            LocalDate applicationDate,
            @Size(max = 2048) String postingUrl,
            @Size(max = 200) String location,
            @Size(max = 20000) String description,
            @Size(max = 10000) String notes,
            EmploymentType employmentType,
            WorkplaceArrangement workplaceArrangement,
            @DecimalMin("0") BigDecimal salaryMin,
            @DecimalMin("0") BigDecimal salaryMax,
            @Pattern(regexp = "^[A-Za-z]{3}$", message = "must be a 3-letter ISO currency code") String salaryCurrency,
            PayPeriod salaryPayPeriod,
            SourceCategory sourceCategory,
            @Size(max = 500) String sourceDetail,
            @NotNull @PositiveOrZero Long version
    ) {}

    record StatusTransitionRequest(
            @NotNull ApplicationStatus newStatus,
            @Size(max = 2000) String note,
            @NotNull @PositiveOrZero Long version
    ) {}

    record StatusHistoryResponse(
            UUID id,
            UUID applicationId,
            ApplicationStatus previousStatus,
            ApplicationStatus newStatus,
            Instant changedAt,
            String note
    ) {
        static StatusHistoryResponse from(ApplicationStatusHistory history) {
            return new StatusHistoryResponse(history.getId(), history.getApplicationId(),
                    history.getPreviousStatus(), history.getNewStatus(), history.getChangedAt(), history.getNote());
        }
    }

    record ApplicationCompany(UUID id, String name) {
        static ApplicationCompany from(CompanyReference company) {
            return new ApplicationCompany(company.id(), company.name());
        }
    }

    record ApplicationResponse(
            UUID id,
            ApplicationCompany company,
            String jobTitle,
            ApplicationStatus status,
            LocalDate applicationDate,
            String postingUrl,
            String location,
            String description,
            String notes,
            EmploymentType employmentType,
            WorkplaceArrangement workplaceArrangement,
            BigDecimal salaryMin,
            BigDecimal salaryMax,
            String salaryCurrency,
            PayPeriod salaryPayPeriod,
            SourceCategory sourceCategory,
            String sourceDetail,
            Instant createdAt,
            Instant updatedAt,
            long version
    ) {
        static ApplicationResponse from(JobApplication application, CompanyReference company) {
            return new ApplicationResponse(application.getId(), ApplicationCompany.from(company),
                    application.getJobTitle(), application.getStatus(), application.getApplicationDate(),
                    application.getPostingUrl(),
                    application.getLocation(), application.getDescription(), application.getNotes(),
                    application.getEmploymentType(), application.getWorkplaceArrangement(),
                    application.getSalaryMin(), application.getSalaryMax(), application.getSalaryCurrency(),
                    application.getSalaryPayPeriod(), application.getSourceCategory(), application.getSourceDetail(),
                    application.getCreatedAt(), application.getUpdatedAt(), application.getVersion());
        }
    }
}
