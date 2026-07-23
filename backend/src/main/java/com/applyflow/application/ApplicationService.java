package com.applyflow.application;

import com.applyflow.company.CompanyApplicationGateway;
import com.applyflow.company.CompanyApplicationGateway.CompanyReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import static com.applyflow.application.ApplicationDtos.ApplicationResponse;
import static com.applyflow.application.ApplicationDtos.CreateApplicationRequest;

@Service
class ApplicationService {
    private final ApplicationRepository applications;
    private final CompanyApplicationGateway companies;
    private final Clock clock;

    ApplicationService(ApplicationRepository applications, CompanyApplicationGateway companies) {
        this.applications = applications;
        this.companies = companies;
        this.clock = Clock.systemUTC();
    }

    @Transactional
    ApplicationResponse create(String subject, CreateApplicationRequest request) {
        UUID ownerId = ownerId(subject);
        Values values = validate(request);
        CompanyReference company = resolveCompany(ownerId, request.companyId(), values.companyName());
        Instant now = clock.instant();
        JobApplication application = new JobApplication(
                UUID.randomUUID(), ownerId, company.id(), values.jobTitle(), values.postingUrl(), values.location(),
                values.description(), values.notes(), request.employmentType(), request.workplaceArrangement(),
                request.salaryMin(), request.salaryMax(), values.salaryCurrency(), request.salaryPayPeriod(),
                request.sourceCategory(), values.sourceDetail(), now);
        return ApplicationResponse.from(applications.saveAndFlush(application), company);
    }

    private CompanyReference resolveCompany(UUID ownerId, UUID companyId, String companyName) {
        if (companyId != null) {
            return companies.findActiveOwned(ownerId, companyId)
                    .orElseThrow(ApplicationException::companyUnavailable);
        }
        return companies.createNameOnly(ownerId, companyName);
    }

    private static Values validate(CreateApplicationRequest request) {
        String companyName = collapseWhitespace(request.companyName());
        boolean hasCompanyId = request.companyId() != null;
        boolean hasCompanyName = !companyName.isEmpty();
        if (hasCompanyId == hasCompanyName) {
            throw ApplicationException.validation("company",
                    "select an active company or enter one new company name");
        }
        String jobTitle = collapseWhitespace(request.jobTitle());
        if (jobTitle.isEmpty()) throw ApplicationException.validation("jobTitle", "must not be blank");
        if (jobTitle.length() > 300) {
            throw ApplicationException.validation("jobTitle", "size must be between 1 and 300");
        }
        if (request.salaryMin() != null && request.salaryMax() != null
                && request.salaryMin().compareTo(request.salaryMax()) > 0) {
            throw ApplicationException.validation("salaryMax", "must be greater than or equal to salary minimum");
        }
        String salaryCurrency = optional(request.salaryCurrency());
        if (salaryCurrency != null) salaryCurrency = salaryCurrency.toUpperCase(Locale.ROOT);
        return new Values(companyName, jobTitle, optional(request.postingUrl()), optional(request.location()),
                optional(request.description()), optional(request.notes()), salaryCurrency,
                optional(request.sourceDetail()));
    }

    private static UUID ownerId(String subject) {
        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw ApplicationException.companyUnavailable();
        }
    }

    private static String collapseWhitespace(String value) {
        if (value == null) return "";
        return value.strip().replaceAll("\\s+", " ");
    }

    private static String optional(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record Values(String companyName, String jobTitle, String postingUrl, String location,
                          String description, String notes, String salaryCurrency, String sourceDetail) {}
}
