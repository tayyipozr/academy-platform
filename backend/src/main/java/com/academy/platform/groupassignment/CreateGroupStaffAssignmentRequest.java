package com.academy.platform.groupassignment;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record CreateGroupStaffAssignmentRequest(

        @NotNull
        UUID staffId,

        @NotNull
        GroupStaffRole assignmentRole,

        @NotNull
        LocalDate startDate
) {
}
