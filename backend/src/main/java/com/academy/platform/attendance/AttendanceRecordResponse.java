package com.academy.platform.attendance;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AttendanceRecordResponse(
        UUID id,
        UUID sessionId,
        UUID studentId,
        String studentNumber,
        String firstName,
        String lastName,
        AttendanceStatus status,
        LocalTime arrivalTime,
        LocalTime departureTime,
        String note,
        UUID recordedBy,
        OffsetDateTime recordedAt,
        OffsetDateTime updatedAt
) {
}
