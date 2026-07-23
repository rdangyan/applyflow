package com.applyflow.company;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "company")
class Company {
    @Id
    private UUID id;
    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;
    @Column(nullable = false, length = 200)
    private String name;
    @Column(name = "normalized_name", nullable = false, length = 200)
    private String normalizedName;
    @Column(length = 2048)
    private String website;
    @Column(length = 200)
    private String industry;
    @Column(length = 200)
    private String location;
    @Column(length = 10000)
    private String notes;
    @Column(name = "archived_at")
    private Instant archivedAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Version
    @Column(nullable = false)
    private long version;

    protected Company() {}

    Company(UUID id, UUID ownerId, String name, String normalizedName, String website, String industry,
            String location, String notes, Instant now) {
        this.id = id;
        this.ownerId = ownerId;
        this.name = name;
        this.normalizedName = normalizedName;
        this.website = website;
        this.industry = industry;
        this.location = location;
        this.notes = notes;
        this.createdAt = now;
        this.updatedAt = now;
    }

    void update(String name, String normalizedName, String website, String industry, String location,
                String notes, Instant now) {
        this.name = name;
        this.normalizedName = normalizedName;
        this.website = website;
        this.industry = industry;
        this.location = location;
        this.notes = notes;
        this.updatedAt = now;
    }

    void archive(Instant now) { this.archivedAt = now; this.updatedAt = now; }
    void restore(Instant now) { this.archivedAt = null; this.updatedAt = now; }

    UUID getId() { return id; }
    UUID getOwnerId() { return ownerId; }
    String getName() { return name; }
    String getNormalizedName() { return normalizedName; }
    String getWebsite() { return website; }
    String getIndustry() { return industry; }
    String getLocation() { return location; }
    String getNotes() { return notes; }
    Instant getArchivedAt() { return archivedAt; }
    Instant getCreatedAt() { return createdAt; }
    Instant getUpdatedAt() { return updatedAt; }
    long getVersion() { return version; }
    boolean isArchived() { return archivedAt != null; }
}
