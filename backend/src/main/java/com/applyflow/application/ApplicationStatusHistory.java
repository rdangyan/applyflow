package com.applyflow.application;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "application_status_history")
class ApplicationStatusHistory {
    @Id
    private UUID id;
    @Column(name = "application_id", nullable = false)
    private UUID applicationId;
    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;
    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", nullable = false, length = 30)
    private ApplicationStatus previousStatus;
    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 30)
    private ApplicationStatus newStatus;
    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;
    @Column(length = 2000)
    private String note;

    protected ApplicationStatusHistory() {}

    ApplicationStatusHistory(UUID id, UUID applicationId, UUID ownerId, ApplicationStatus previousStatus,
                             ApplicationStatus newStatus, Instant changedAt, String note) {
        this.id = id;
        this.applicationId = applicationId;
        this.ownerId = ownerId;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.changedAt = changedAt;
        this.note = note;
    }

    UUID getId() { return id; }
    UUID getApplicationId() { return applicationId; }
    ApplicationStatus getPreviousStatus() { return previousStatus; }
    ApplicationStatus getNewStatus() { return newStatus; }
    Instant getChangedAt() { return changedAt; }
    String getNote() { return note; }
}
