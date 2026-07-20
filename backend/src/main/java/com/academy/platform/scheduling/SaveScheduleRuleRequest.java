package com.academy.platform.scheduling;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SaveScheduleRuleRequest(

        UUID curriculumUnitId,

        UUID leadStaffId,

        @NotBlank
        @Size(max = 200)
        String title,

        @Size(max = 5000)
        String description,

        @NotNull
        @Min(1)
        @Max(7)
        Integer dayOfWeek,

        @NotNull
        LocalTime startTime,

        @NotNull
        LocalTime endTime,

        @NotNull
        LocalDate effectiveFrom,

        @NotNull
        LocalDate effectiveUntil,

        @NotBlank
        @Size(max = 100)
        String timezone,

        @Size(max = 250)
        String location
) {
}
