package com.academy.platform.attendance;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AttendanceChangeResponse(
        UUID id,
        UUID attendanceRecordId,
        UUID studentId,
        String studentNumber,
        String firstName,
        String lastName,
        AttendanceStatus previousStatus,
        AttendanceStatus newStatus,
        LocalTime previousArrivalTime,
        LocalTime newArrivalTime,
        LocalTime previousDepartureTime,
        LocalTime newDepartureTime,
        String previousNote,
        String newNote,
        UUID changedBy,
        String changedByName,
        OffsetDateTime changedAt
) {
}
