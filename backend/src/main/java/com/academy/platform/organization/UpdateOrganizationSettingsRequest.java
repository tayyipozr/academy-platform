package com.academy.platform.organization;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateOrganizationSettingsRequest(

        @NotBlank
        @Size(max = 200)
        String name,

        @NotBlank
        @Size(max = 20)
        String defaultLocale,

        @NotBlank
        @Size(max = 100)
        String timezone,

        @Valid
        TerminologyRequest terminology
) {

    public record TerminologyRequest(

            @NotBlank
            @Size(max = 50)
            String studentLabel,

            @NotBlank
            @Size(max = 50)
            String staffLabel,

            @NotBlank
            @Size(max = 50)
            String groupLabel,

            @NotBlank
            @Size(max = 50)
            String sessionLabel,

            @NotBlank
            @Size(max = 50)
            String programLabel
    ) {
    }
}
