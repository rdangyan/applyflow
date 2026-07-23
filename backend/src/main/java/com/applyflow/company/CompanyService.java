package com.applyflow.company;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import static com.applyflow.company.CompanyDtos.*;

@Service
class CompanyService {
    private final CompanyRepository companies;
    private final Clock clock;

    CompanyService(CompanyRepository companies) {
        this.companies = companies;
        this.clock = Clock.systemUTC();
    }

    @Transactional(readOnly = true)
    CompanyListResponse list(String subject, boolean archived) {
        UUID ownerId = ownerId(subject);
        var results = archived
                ? companies.findAllByOwnerIdAndArchivedAtIsNotNullOrderByNormalizedNameAsc(ownerId)
                : companies.findAllByOwnerIdAndArchivedAtIsNullOrderByNormalizedNameAsc(ownerId);
        return new CompanyListResponse(results.stream().map(CompanyResponse::from).toList());
    }

    @Transactional(readOnly = true)
    CompanyResponse get(String subject, UUID id) {
        return CompanyResponse.from(owned(id, ownerId(subject)));
    }

    @Transactional
    CompanyResponse create(String subject, CreateCompanyRequest request) {
        UUID ownerId = ownerId(subject);
        Values values = values(request.name(), request.website(), request.industry(), request.location(), request.notes());
        if (companies.existsByOwnerIdAndNormalizedName(ownerId, values.normalizedName())) throw CompanyException.duplicateName();
        Instant now = clock.instant();
        Company company = new Company(UUID.randomUUID(), ownerId, values.name(), values.normalizedName(),
                values.website(), values.industry(), values.location(), values.notes(), now);
        return save(company);
    }

    @Transactional
    CompanyResponse update(String subject, UUID id, UpdateCompanyRequest request) {
        Company company = owned(id, ownerId(subject));
        requireVersion(company, request.version());
        Values values = values(request.name(), request.website(), request.industry(), request.location(), request.notes());
        company.update(values.name(), values.normalizedName(), values.website(), values.industry(), values.location(),
                values.notes(), clock.instant());
        return save(company);
    }

    @Transactional
    CompanyResponse archive(String subject, UUID id, CompanyVersionRequest request) {
        Company company = owned(id, ownerId(subject));
        requireVersion(company, request.version());
        if (company.isArchived()) throw CompanyException.invalidState("Company is already archived");
        company.archive(clock.instant());
        return save(company);
    }

    @Transactional
    CompanyResponse restore(String subject, UUID id, CompanyVersionRequest request) {
        Company company = owned(id, ownerId(subject));
        requireVersion(company, request.version());
        if (!company.isArchived()) throw CompanyException.invalidState("Company is not archived");
        company.restore(clock.instant());
        return save(company);
    }

    private CompanyResponse save(Company company) {
        try {
            return CompanyResponse.from(companies.saveAndFlush(company));
        } catch (DataIntegrityViolationException exception) {
            throw CompanyException.duplicateName();
        } catch (ObjectOptimisticLockingFailureException exception) {
            throw CompanyException.staleVersion();
        }
    }

    private Company owned(UUID id, UUID ownerId) {
        return companies.findByIdAndOwnerId(id, ownerId).orElseThrow(CompanyException::notFound);
    }

    private static void requireVersion(Company company, long version) {
        if (company.getVersion() != version) throw CompanyException.staleVersion();
    }

    private static UUID ownerId(String subject) {
        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw CompanyException.notFound();
        }
    }

    private static Values values(String name, String website, String industry, String location, String notes) {
        String displayName = collapseWhitespace(name);
        if (displayName.isEmpty()) throw CompanyException.invalidName("must not be blank");
        if (displayName.length() > 200) throw CompanyException.invalidName("size must be between 1 and 200");
        String caseFoldedName = displayName.toUpperCase(Locale.ROOT).toLowerCase(Locale.ROOT);
        return new Values(displayName, caseFoldedName, optional(website), optional(industry),
                optional(location), optional(notes));
    }

    static String collapseWhitespace(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKC);
        StringBuilder result = new StringBuilder();
        boolean betweenWords = false;
        for (int codePoint : normalized.codePoints().toArray()) {
            if (Character.isWhitespace(codePoint) || Character.isSpaceChar(codePoint)) {
                betweenWords = result.length() > 0;
            } else {
                if (betweenWords) result.append(' ');
                result.appendCodePoint(codePoint);
                betweenWords = false;
            }
        }
        return result.toString();
    }

    private static String optional(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record Values(String name, String normalizedName, String website, String industry, String location, String notes) {}
}
