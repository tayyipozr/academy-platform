package com.academy.platform.configuration;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.authentication.MembershipSecurityFilter;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.access.intercept.AuthorizationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        SecurityContextRepository securityContextRepository,
        MembershipSecurityFilter membershipSecurityFilter
    ) throws Exception {

        CookieCsrfTokenRepository csrfRepository =
                CookieCsrfTokenRepository.withHttpOnlyFalse();

        csrfRepository.setCookieName("XSRF-TOKEN");
        csrfRepository.setHeaderName("X-XSRF-TOKEN");
        csrfRepository.setCookiePath("/");

        return http
                .securityContext(securityContext ->
                        securityContext
                                .securityContextRepository(
                                        securityContextRepository
                                )
                                .requireExplicitSave(true)
                )
                .csrf(csrf ->
                        csrf.csrfTokenRepository(csrfRepository)
                )
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(
                                "/actuator/health",
                                "/api/v1/system/ping"
                        )
                        .permitAll()

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/auth/csrf"
                        )
                        .permitAll()

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/v1/auth/login"
                        )
                        .permitAll()

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/v1/invitations/accept"
                        )
                        .permitAll()

                        .requestMatchers("/api/v1/auth/**")
                        .authenticated()

                        .anyRequest()
                        .authenticated()
                )
                .exceptionHandling(exceptionHandling ->
                        exceptionHandling
                        .authenticationEntryPoint(
                                (request, response, exception) ->
                                        writeUnauthorized(response)
                        )
                        .accessDeniedHandler(
                                (request, response, exception) ->
                                        writeForbidden(response)
                        )
                )
                .formLogin(formLogin -> formLogin.disable())
                .httpBasic(httpBasic -> httpBasic.disable())
                .logout(logout -> logout.disable())
                .addFilterBefore(
                        membershipSecurityFilter,
                        AuthorizationFilter.class
                )
                .build();
    }

    public static UsernamePasswordAuthenticationToken authentication(
            AuthenticatedUser principal
    ) {
        var authorities = principal.permissions()
                .stream()
                .map(SimpleGrantedAuthority::new)
                .toList();

        return UsernamePasswordAuthenticationToken.authenticated(
                principal,
                null,
                authorities
        );
    }

    private static void writeUnauthorized(
            HttpServletResponse response
    ) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding(
                StandardCharsets.UTF_8.name()
        );
        response.setContentType(
                MediaType.APPLICATION_JSON_VALUE
        );

        response.getWriter().write(
                """
                {
                  "code": "AUTHENTICATION_REQUIRED",
                  "message": "Authentication is required."
                }
                """
        );
    }

    private static void writeForbidden(
            HttpServletResponse response
    ) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setCharacterEncoding(
                StandardCharsets.UTF_8.name()
        );
        response.setContentType(
                MediaType.APPLICATION_JSON_VALUE
        );
    
        response.getWriter().write(
                """
                {
                  "code": "ACCESS_DENIED",
                  "message": "You do not have permission to perform this operation."
                }      
                """
        );
    }    
}