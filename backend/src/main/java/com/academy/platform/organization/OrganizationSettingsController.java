package com.academy.platform.organization;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/organization/settings")
public class OrganizationSettingsController {

    private final OrganizationSettingsService settingsService;

    public OrganizationSettingsController(
            OrganizationSettingsService settingsService
    ) {
        this.settingsService = settingsService;
    }

    @GetMapping
    @PreAuthorize(
            "hasAuthority('organization.settings.read')"
    )
    public OrganizationSettingsResponse getSettings(
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        return settingsService.getSettings(
                currentUser.organizationId()
        );
    }

    @PutMapping
    @PreAuthorize(
            "hasAuthority('organization.settings.update')"
    )
    public OrganizationSettingsResponse updateSettings(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid
            @RequestBody UpdateOrganizationSettingsRequest request
    ) {
        return settingsService.updateSettings(
                currentUser,
                request
        );
    }

    @GetMapping("/localization")
    public OrganizationLocalizationResponse
            getLocalization(
                    @AuthenticationPrincipal AuthenticatedUser currentUser
            ) {
        OrganizationSettingsResponse settings
                = settingsService.getSettings(
                        currentUser.organizationId()
                );

        return new OrganizationLocalizationResponse(
                settings.defaultLocale(),
                settings.terminology()
        );
    }
}
