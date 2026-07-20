package com.academy.platform.groupassignment;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EndGroupStaffAssignmentRequest(

        @NotNull
        GroupStaffAssignmentStatus status,

        @NotNull
        LocalDate endDate,

        @Size(max = 500)
        String reason
) {
}
