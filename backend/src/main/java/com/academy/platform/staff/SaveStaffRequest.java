package com.academy.platform.staff;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SaveStaffRequest(

        UUID membershipId,

        UUID branchId,

        @NotBlank
        @Size(max = 50)
        String staffNumber,

        @Size(max = 100)
        String title,

        @Size(max = 200)
        String specialization,

        @Size(max = 5000)
        String biography,

        LocalDate hiredAt,

        LocalDate endedAt
) {
}
