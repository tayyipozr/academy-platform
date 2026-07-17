package com.academy.platform.authentication;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class MembershipSecurityFilter
        extends OncePerRequestFilter {

    private final JdbcTemplate jdbcTemplate;

    public MembershipSecurityFilter(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        Authentication authentication =
                SecurityContextHolder.getContext()
                        .getAuthentication();

        if (authentication == null
                || !(authentication.getPrincipal()
                instanceof AuthenticatedUser currentUser)) {
            filterChain.doFilter(request, response);
            return;
        }

        Integer validMembershipCount =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)

                        FROM organization_memberships om

                        JOIN users u
                            ON u.id = om.user_id

                        JOIN organizations o
                            ON o.id = om.organization_id

                        WHERE om.id = ?
                          AND om.organization_id = ?
                          AND om.user_id = ?
                          AND om.status = 'ACTIVE'
                          AND om.security_version = ?
                          AND u.status = 'ACTIVE'
                          AND o.status = 'ACTIVE'
                        """,
                        Integer.class,
                        currentUser.membershipId(),
                        currentUser.organizationId(),
                        currentUser.userId(),
                        currentUser.securityVersion()
                );

        if (validMembershipCount == null
                || validMembershipCount == 0) {
            SecurityContextHolder.clearContext();

            if (request.getSession(false) != null) {
                request.getSession(false).invalidate();
            }

            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED
            );
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");

            response.getWriter().write(
                    """
                    {
                      "code": "SESSION_INVALIDATED",
                      "message": "Your session is no longer valid. Please sign in again."
                    }
                    """
            );

            return;
        }

        filterChain.doFilter(request, response);
    }
}
