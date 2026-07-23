package com.applyflow.application;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

interface ApplicationRepository extends JpaRepository<JobApplication, UUID> {
    Optional<JobApplication> findByIdAndOwnerId(UUID id, UUID ownerId);
}
