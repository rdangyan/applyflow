package com.applyflow.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
    Optional<UserAccount> findByNormalizedEmail(String normalizedEmail);
    boolean existsByNormalizedEmail(String normalizedEmail);
}
