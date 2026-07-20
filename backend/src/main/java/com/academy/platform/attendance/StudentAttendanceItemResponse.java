package com.academy.platform.attendance;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record StudentAttendanceItemResponse(
        UUID attendanceRecordId,
        UUID sessionId,
        UUID groupId,
        String groupCode,
        String groupName,
        UUID termId,
        String termCode,
        String termName,
        String sessionTitle,
        LocalDate sessionDate,
        OffsetDateTime scheduledStart,
        OffsetDateTime scheduledEnd,
        AttendanceStatus status,
        LocalTime arrivalTime,
        LocalTime departureTime,
        String note,
        OffsetDateTime recordedAt,
        OffsetDateTime finalizedAt
) {
}
