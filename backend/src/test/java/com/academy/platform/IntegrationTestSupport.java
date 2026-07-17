package com.academy.platform;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import jakarta.servlet.http.Cookie;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestSupport {

    protected static final PostgreSQLContainer POSTGRES
            = new PostgreSQLContainer(
                    DockerImageName.parse("postgres:16-alpine")
            )
                    .withDatabaseName("academy_test")
                    .withUsername("academy_test")
                    .withPassword("academy_test");

    protected static final GenericContainer<?> REDIS
            = new GenericContainer<>(
                    DockerImageName.parse("redis:7-alpine")
            )
                    .withExposedPorts(6379);

    static {
        POSTGRES.start();
        REDIS.start();
    }

    @DynamicPropertySource
    static void configureProperties(
            DynamicPropertyRegistry registry
    ) {
        registry.add(
                "spring.datasource.url",
                POSTGRES::getJdbcUrl
        );

        registry.add(
                "spring.datasource.username",
                POSTGRES::getUsername
        );

        registry.add(
                "spring.datasource.password",
                POSTGRES::getPassword
        );

        registry.add(
                "spring.data.redis.host",
                REDIS::getHost
        );

        registry.add(
                "spring.data.redis.port",
                () -> REDIS.getMappedPort(6379)
        );

        registry.add(
                "spring.data.redis.database",
                () -> 0
        );

        registry.add(
                "spring.session.store-type",
                () -> "redis"
        );

        registry.add(
                "spring.session.redis.namespace",
                () -> "academy:test:session"
        );
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    protected Cookie loginAsAdministrator()
            throws Exception {

        return login(
                "admin@test.com",
                "TestAdministrator123!",
                "test-academy"
        );
    }

    protected Cookie login(
            String email,
            String password,
            String organizationSlug
    ) throws Exception {

        MvcResult result = mockMvc.perform(
                post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(
                                MediaType.APPLICATION_JSON
                        )
                        .content("""
                                        {
                                          "email": "%s",
                                          "password": "%s",
                                          "organizationSlug": "%s"
                                        }
                                        """.formatted(
                                email,
                                password,
                                organizationSlug
                        ))
        )
                .andExpect(status().isOk())
                .andReturn();

        return extractSessionCookie(result);
    }

    private Cookie extractSessionCookie(
            MvcResult result
    ) {
        List<String> headers = result
                .getResponse()
                .getHeaders(HttpHeaders.SET_COOKIE);

        for (String header : headers) {
            Cookie cookie = parseSessionCookie(header);

            if (cookie != null) {
                return cookie;
            }
        }

        throw new IllegalStateException(
                "Login succeeded but no session cookie was "
                + "returned. Set-Cookie headers: "
                + headers
        );
    }

    private Cookie parseSessionCookie(
            String setCookieHeader
    ) {
        int separatorIndex
                = setCookieHeader.indexOf(';');

        String nameAndValue = separatorIndex >= 0
                ? setCookieHeader.substring(
                        0,
                        separatorIndex
                )
                : setCookieHeader;

        int equalsIndex
                = nameAndValue.indexOf('=');

        if (equalsIndex <= 0) {
            return null;
        }

        String cookieName = nameAndValue
                .substring(0, equalsIndex)
                .trim();

        String cookieValue = nameAndValue
                .substring(equalsIndex + 1)
                .trim();

        if (!cookieName.equals("SESSION")
                && !cookieName.equals(
                        "ACADEMY_SESSION"
                )) {
            return null;
        }

        if (cookieValue.isBlank()) {
            return null;
        }

        Cookie cookie = new Cookie(
                cookieName,
                cookieValue
        );

        cookie.setPath("/");

        return cookie;
    }

    protected UUID findRoleId(String roleName) {
        return jdbcTemplate.queryForObject(
                """
                SELECT r.id
                FROM roles r
                JOIN organizations o
                    ON o.id = r.organization_id
                WHERE o.slug = 'test-academy'
                  AND r.name = ?
                """,
                UUID.class,
                roleName
        );
    }

    protected UUID createForeignMembership() {
        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        UUID organizationId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID membershipId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO organizations
                (
                    id,
                    name,
                    slug,
                    status,
                    default_locale,
                    timezone,
                    settings,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    'Foreign Academy',
                    ?,
                    'ACTIVE',
                    'en-US',
                    'UTC',
                    '{}'::jsonb,
                    ?,
                    ?,
                    0
                )
                """,
                organizationId,
                "foreign-" + organizationId,
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO users
                (
                    id,
                    email,
                    password_hash,
                    first_name,
                    last_name,
                    status,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    'Foreign',
                    'User',
                    'ACTIVE',
                    ?,
                    ?,
                    0
                )
                """,
                userId,
                "foreign-" + userId
                + "@example.com",
                passwordEncoder.encode(
                        "ForeignPassword123!"
                ),
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO organization_memberships
                (
                    id,
                    organization_id,
                    user_id,
                    status,
                    display_first_name,
                    display_last_name,
                    security_version,
                    joined_at,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    'ACTIVE',
                    'Foreign',
                    'User',
                    0,
                    ?,
                    ?,
                    ?,
                    0
                )
                """,
                membershipId,
                organizationId,
                userId,
                now,
                now,
                now
        );

        return membershipId;
    }
}
