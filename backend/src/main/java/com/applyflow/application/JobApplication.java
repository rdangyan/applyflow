package com.applyflow.application;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "job_application")
class JobApplication {
    @Id
    private UUID id;
    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;
    @Column(name = "company_id", nullable = false)
    private UUID companyId;
    @Column(name = "job_title", nullable = false, length = 300)
    private String jobTitle;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ApplicationStatus status;
    @Column(name = "posting_url", length = 2048)
    private String postingUrl;
    @Column(name = "application_date")
    private LocalDate applicationDate;
    @Column(length = 200)
    private String location;
    @Column(length = 20000)
    private String description;
    @Column(length = 10000)
    private String notes;
    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", length = 30)
    private EmploymentType employmentType;
    @Enumerated(EnumType.STRING)
    @Column(name = "workplace_arrangement", length = 20)
    private WorkplaceArrangement workplaceArrangement;
    @Column(name = "salary_min", precision = 19, scale = 2)
    private BigDecimal salaryMin;
    @Column(name = "salary_max", precision = 19, scale = 2)
    private BigDecimal salaryMax;
    @Column(name = "salary_currency", length = 3)
    private String salaryCurrency;
    @Enumerated(EnumType.STRING)
    @Column(name = "salary_pay_period", length = 20)
    private PayPeriod salaryPayPeriod;
    @Enumerated(EnumType.STRING)
    @Column(name = "source_category", length = 30)
    private SourceCategory sourceCategory;
    @Column(name = "source_detail", length = 500)
    private String sourceDetail;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Version
    @Column(nullable = false)
    private long version;

    protected JobApplication() {}

    JobApplication(UUID id, UUID ownerId, UUID companyId, String jobTitle, LocalDate applicationDate,
                   String postingUrl, String location,
                   String description, String notes, EmploymentType employmentType,
                   WorkplaceArrangement workplaceArrangement, BigDecimal salaryMin, BigDecimal salaryMax,
                   String salaryCurrency, PayPeriod salaryPayPeriod, SourceCategory sourceCategory,
                   String sourceDetail, Instant now) {
        this.id = id;
        this.ownerId = ownerId;
        this.companyId = companyId;
        this.jobTitle = jobTitle;
        this.status = ApplicationStatus.SAVED;
        this.applicationDate = applicationDate;
        this.postingUrl = postingUrl;
        this.location = location;
        this.description = description;
        this.notes = notes;
        this.employmentType = employmentType;
        this.workplaceArrangement = workplaceArrangement;
        this.salaryMin = salaryMin;
        this.salaryMax = salaryMax;
        this.salaryCurrency = salaryCurrency;
        this.salaryPayPeriod = salaryPayPeriod;
        this.sourceCategory = sourceCategory;
        this.sourceDetail = sourceDetail;
        this.createdAt = now;
        this.updatedAt = now;
    }

    UUID getId() { return id; }
    UUID getOwnerId() { return ownerId; }
    UUID getCompanyId() { return companyId; }
    String getJobTitle() { return jobTitle; }
    ApplicationStatus getStatus() { return status; }
    String getPostingUrl() { return postingUrl; }
    LocalDate getApplicationDate() { return applicationDate; }
    String getLocation() { return location; }
    String getDescription() { return description; }
    String getNotes() { return notes; }
    EmploymentType getEmploymentType() { return employmentType; }
    WorkplaceArrangement getWorkplaceArrangement() { return workplaceArrangement; }
    BigDecimal getSalaryMin() { return salaryMin; }
    BigDecimal getSalaryMax() { return salaryMax; }
    String getSalaryCurrency() { return salaryCurrency; }
    PayPeriod getSalaryPayPeriod() { return salaryPayPeriod; }
    SourceCategory getSourceCategory() { return sourceCategory; }
    String getSourceDetail() { return sourceDetail; }
    Instant getCreatedAt() { return createdAt; }
    Instant getUpdatedAt() { return updatedAt; }
    long getVersion() { return version; }

    void transitionTo(ApplicationStatus newStatus, Instant now) {
        this.status = newStatus;
        this.updatedAt = now;
    }

    void update(UUID companyId, String jobTitle, LocalDate applicationDate, String postingUrl, String location,
                String description, String notes, EmploymentType employmentType,
                WorkplaceArrangement workplaceArrangement, BigDecimal salaryMin, BigDecimal salaryMax,
                String salaryCurrency, PayPeriod salaryPayPeriod, SourceCategory sourceCategory,
                String sourceDetail, Instant now) {
        this.companyId = companyId;
        this.jobTitle = jobTitle;
        this.applicationDate = applicationDate;
        this.postingUrl = postingUrl;
        this.location = location;
        this.description = description;
        this.notes = notes;
        this.employmentType = employmentType;
        this.workplaceArrangement = workplaceArrangement;
        this.salaryMin = salaryMin;
        this.salaryMax = salaryMax;
        this.salaryCurrency = salaryCurrency;
        this.salaryPayPeriod = salaryPayPeriod;
        this.sourceCategory = sourceCategory;
        this.sourceDetail = sourceDetail;
        this.updatedAt = now;
    }
}

enum ApplicationStatus { SAVED, APPLIED, SCREENING, INTERVIEWING, OFFER, ACCEPTED, REJECTED, WITHDRAWN }
enum EmploymentType { FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, INTERNSHIP, OTHER }
enum WorkplaceArrangement { REMOTE, HYBRID, ON_SITE }
enum PayPeriod { HOURLY, MONTHLY, YEARLY }
enum SourceCategory {
    COMPANY_WEBSITE, LINKEDIN, INDEED, REFERRAL, RECRUITER, OTHER_JOB_BOARD, CAREER_FAIR, OTHER
}
