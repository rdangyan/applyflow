package com.applyflow.company;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface CompanyRepository extends JpaRepository<Company, UUID> {
    Optional<Company> findByIdAndOwnerId(UUID id, UUID ownerId);
    List<Company> findAllByOwnerIdAndArchivedAtIsNullOrderByNormalizedNameAsc(UUID ownerId);
    List<Company> findAllByOwnerIdAndArchivedAtIsNotNullOrderByNormalizedNameAsc(UUID ownerId);
    boolean existsByOwnerIdAndNormalizedName(UUID ownerId, String normalizedName);
}
