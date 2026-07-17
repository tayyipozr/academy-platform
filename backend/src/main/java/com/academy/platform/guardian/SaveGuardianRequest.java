package com.academy.platform.guardian;

import java.util.UUID;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaveGuardianRequest(

        UUID membershipId,

        @Size(max = 50)
        String guardianNumber,

        @Size(max = 50)
        String phone,

        @Size(max = 50)
        String alternatePhone,

        @Size(max = 150)
        String occupation,

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

        @Size(max = 5000)
        String notes
) {
}
