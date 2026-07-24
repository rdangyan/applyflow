package com.applyflow.application;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

interface ApplicationStatusHistoryRepository extends JpaRepository<ApplicationStatusHistory, UUID> {
    List<ApplicationStatusHistory> findAllByApplicationIdAndOwnerIdOrderByChangedAtAscIdAsc(
            UUID applicationId, UUID ownerId);
}
