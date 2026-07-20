package com.academy.platform.attendance;

import java.time.LocalTime;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AttendanceRecordRequest(

        @NotNull
        UUID studentId,

        @NotNull
        AttendanceStatus status,

        LocalTime arrivalTime,

        LocalTime departureTime,

        @Size(max = 1000)
        String note
) {
}
