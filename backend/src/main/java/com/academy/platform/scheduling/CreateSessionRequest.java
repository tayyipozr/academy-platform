package com.academy.platform.scheduling;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateSessionRequest(

        @NotNull
        UUID groupId,

        UUID curriculumUnitId,

        UUID leadStaffId,

        @NotBlank
        @Size(max = 200)
        String title,

        @Size(max = 5000)
        String description,

        @NotNull
        OffsetDateTime scheduledStart,

        @NotNull
        OffsetDateTime scheduledEnd,

        @Size(max = 250)
        String location
) {
}
