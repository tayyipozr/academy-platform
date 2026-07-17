package com.academy.platform.branch;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaveBranchRequest(

        @NotBlank
        @Size(max = 50)
        @Pattern(
                regexp = "^[A-Za-z0-9_-]+$",
                message = "Code may contain letters, numbers, "
                        + "underscores, and hyphens only."
        )
        String code,

        @NotBlank
        @Size(max = 200)
        String name,

        @Email
        @Size(max = 320)
        String email,

        @Size(max = 50)
        String phone,

        @Size(max = 250)
        String addressLine1,

        @Size(max = 250)
        String addressLine2,

        @Size(max = 100)
        String city,

        @Size(max = 100)
        String stateProvince,

        @Size(max = 30)
        String postalCode,

        @Pattern(
                regexp = "^$|^[A-Za-z]{2}$",
                message = "Country code must contain two letters."
        )
        String countryCode,

        @NotBlank
        @Size(max = 100)
        String timezone
) {
}
