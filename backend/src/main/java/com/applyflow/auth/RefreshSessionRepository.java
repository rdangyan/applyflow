package com.applyflow.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;

import java.util.Optional;
import java.util.UUID;

interface RefreshSessionRepository extends JpaRepository<RefreshSession, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RefreshSession> findByTokenHash(String tokenHash);

    @Query("""
            select session from RefreshSession session
            where session.user.id = :userId
              and session.rotatedAt is null
              and session.revokedAt is null
              and session.expiresAt > :now
              and session.absoluteExpiresAt > :now
            order by session.lastUsedAt desc
            """)
    List<RefreshSession> findActiveByUserId(@Param("userId") UUID userId, @Param("now") Instant now);

    @Query("""
            select count(session) > 0 from RefreshSession session
            where session.user.id = :userId
              and session.familyId = :familyId
              and session.rotatedAt is null
              and session.revokedAt is null
              and session.expiresAt > :now
              and session.absoluteExpiresAt > :now
            """)
    boolean existsActiveFamily(
            @Param("userId") UUID userId,
            @Param("familyId") UUID familyId,
            @Param("now") Instant now);

    @Modifying
    @Query("update RefreshSession session set session.revokedAt = :now where session.familyId = :familyId and session.revokedAt is null")
    int revokeFamily(@Param("familyId") UUID familyId, @Param("now") Instant now);

    @Modifying
    @Query("""
            update RefreshSession session set session.revokedAt = :now
            where session.familyId = :familyId and session.user.id = :userId and session.revokedAt is null
            """)
    int revokeOwnedFamily(@Param("familyId") UUID familyId, @Param("userId") UUID userId, @Param("now") Instant now);

    @Modifying
    @Query("update RefreshSession session set session.revokedAt = :now where session.user.id = :userId and session.revokedAt is null")
    int revokeAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
