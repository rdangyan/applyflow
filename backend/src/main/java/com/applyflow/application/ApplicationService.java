package com.applyflow.application;

import com.applyflow.company.CompanyApplicationGateway;
import com.applyflow.company.CompanyApplicationGateway.CompanyReference;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.List;
import java.util.UUID;

import static com.applyflow.application.ApplicationDtos.ApplicationResponse;
import static com.applyflow.application.ApplicationDtos.CreateApplicationRequest;
import static com.applyflow.application.ApplicationDtos.StatusHistoryResponse;
import static com.applyflow.application.ApplicationDtos.StatusTransitionRequest;
import static com.applyflow.application.ApplicationDtos.UpdateApplicationRequest;

@Service
class ApplicationService {
    private final ApplicationRepository applications;
    private final ApplicationStatusHistoryRepository statusHistory;
    private final CompanyApplicationGateway companies;
    private final Clock clock;

    ApplicationService(ApplicationRepository applications, ApplicationStatusHistoryRepository statusHistory,
                       CompanyApplicationGateway companies) {
        this.applications = applications;
        this.statusHistory = statusHistory;
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
                UUID.randomUUID(), ownerId, company.id(), values.jobTitle(), request.applicationDate(),
                values.postingUrl(), values.location(),
                values.description(), values.notes(), request.employmentType(), request.workplaceArrangement(),
                request.salaryMin(), request.salaryMax(), values.salaryCurrency(), request.salaryPayPeriod(),
                request.sourceCategory(), values.sourceDetail(), now);
        return ApplicationResponse.from(save(application), company);
    }

    @Transactional(readOnly = true)
    ApplicationResponse get(String subject, UUID id) {
        UUID ownerId = ownerId(subject);
        JobApplication application = owned(id, ownerId);
        return ApplicationResponse.from(application, company(ownerId, application.getCompanyId()));
    }

    @Transactional
    ApplicationResponse update(String subject, UUID id, UpdateApplicationRequest request) {
        UUID ownerId = ownerId(subject);
        JobApplication application = owned(id, ownerId);
        requireVersion(application, request.version());
        Values values = validate(request.companyId(), null, request.jobTitle(), request.salaryMin(),
                request.salaryMax(), request.salaryCurrency(), request.postingUrl(), request.location(),
                request.description(), request.notes(), request.sourceDetail());
        if (application.getStatus() != ApplicationStatus.SAVED && request.applicationDate() == null) {
            throw ApplicationException.validation("applicationDate",
                    "is required once the application is no longer Saved");
        }
        CompanyReference company = request.companyId().equals(application.getCompanyId())
                ? company(ownerId, request.companyId())
                : companies.findActiveOwned(ownerId, request.companyId())
                    .orElseThrow(ApplicationException::companyUnavailable);
        application.update(company.id(), values.jobTitle(), request.applicationDate(), values.postingUrl(),
                values.location(), values.description(), values.notes(), request.employmentType(),
                request.workplaceArrangement(), request.salaryMin(), request.salaryMax(), values.salaryCurrency(),
                request.salaryPayPeriod(), request.sourceCategory(), values.sourceDetail(), clock.instant());
        return ApplicationResponse.from(save(application), company);
    }

    @Transactional(readOnly = true)
    List<StatusHistoryResponse> history(String subject, UUID id) {
        UUID ownerId = ownerId(subject);
        owned(id, ownerId);
        return statusHistory.findAllByApplicationIdAndOwnerIdOrderByChangedAtAscIdAsc(id, ownerId)
                .stream().map(StatusHistoryResponse::from).toList();
    }

    @Transactional
    ApplicationResponse transition(String subject, UUID id, StatusTransitionRequest request) {
        UUID ownerId = ownerId(subject);
        JobApplication application = owned(id, ownerId);
        requireVersion(application, request.version());
        if (application.getStatus() == request.newStatus()) throw ApplicationException.sameStatus();
        if (application.getStatus() == ApplicationStatus.SAVED
                && request.newStatus() != ApplicationStatus.SAVED
                && application.getApplicationDate() == null) {
            throw ApplicationException.validation("applicationDate",
                    "is required before leaving Saved");
        }

        ApplicationStatus previousStatus = application.getStatus();
        Instant changedAt = clock.instant();
        application.transitionTo(request.newStatus(), changedAt);
        JobApplication saved = save(application);
        statusHistory.saveAndFlush(new ApplicationStatusHistory(
                UUID.randomUUID(), id, ownerId, previousStatus, request.newStatus(), changedAt,
                optional(request.note())));
        return ApplicationResponse.from(saved, company(ownerId, application.getCompanyId()));
    }

    private CompanyReference resolveCompany(UUID ownerId, UUID companyId, String companyName) {
        if (companyId != null) {
            return companies.findActiveOwned(ownerId, companyId)
                    .orElseThrow(ApplicationException::companyUnavailable);
        }
        return companies.createNameOnly(ownerId, companyName);
    }

    private static Values validate(CreateApplicationRequest request) {
        return validate(request.companyId(), request.companyName(), request.jobTitle(), request.salaryMin(),
                request.salaryMax(), request.salaryCurrency(), request.postingUrl(), request.location(),
                request.description(), request.notes(), request.sourceDetail());
    }

    private static Values validate(UUID companyId, String requestedCompanyName, String requestedJobTitle,
                                   java.math.BigDecimal salaryMin, java.math.BigDecimal salaryMax,
                                   String requestedSalaryCurrency, String postingUrl, String location,
                                   String description, String notes, String sourceDetail) {
        String companyName = collapseWhitespace(requestedCompanyName);
        boolean hasCompanyId = companyId != null;
        boolean hasCompanyName = !companyName.isEmpty();
        if (hasCompanyId == hasCompanyName) {
            throw ApplicationException.validation("company",
                    "select an active company or enter one new company name");
        }
        String jobTitle = collapseWhitespace(requestedJobTitle);
        if (jobTitle.isEmpty()) throw ApplicationException.validation("jobTitle", "must not be blank");
        if (jobTitle.length() > 300) {
            throw ApplicationException.validation("jobTitle", "size must be between 1 and 300");
        }
        if (salaryMin != null && salaryMax != null && salaryMin.compareTo(salaryMax) > 0) {
            throw ApplicationException.validation("salaryMax", "must be greater than or equal to salary minimum");
        }
        String salaryCurrency = optional(requestedSalaryCurrency);
        if (salaryCurrency != null) salaryCurrency = salaryCurrency.toUpperCase(Locale.ROOT);
        return new Values(companyName, jobTitle, optional(postingUrl), optional(location),
                optional(description), optional(notes), salaryCurrency, optional(sourceDetail));
    }

    private JobApplication owned(UUID id, UUID ownerId) {
        return applications.findByIdAndOwnerId(id, ownerId).orElseThrow(ApplicationException::notFound);
    }

    private CompanyReference company(UUID ownerId, UUID companyId) {
        return companies.findOwned(ownerId, companyId).orElseThrow(ApplicationException::notFound);
    }

    private JobApplication save(JobApplication application) {
        try {
            return applications.saveAndFlush(application);
        } catch (ObjectOptimisticLockingFailureException exception) {
            throw ApplicationException.staleVersion();
        }
    }

    private static void requireVersion(JobApplication application, long version) {
        if (application.getVersion() != version) throw ApplicationException.staleVersion();
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
