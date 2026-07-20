package com.academy.platform.attendance;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record SessionAttendanceResponse(
        UUID sessionId,
        UUID groupId,
        String groupCode,
        String groupName,
        String sessionTitle,
        OffsetDateTime scheduledStart,
        OffsetDateTime scheduledEnd,
        String sessionStatus,
        boolean finalized,
        OffsetDateTime finalizedAt,
        UUID finalizedBy,
        int totalStudentCount,
        int recordedCount,
        int notRecordedCount,
        int presentCount,
        int absentCount,
        int lateCount,
        int excusedCount,
        List<AttendanceRecordResponse> records
) {
    public SessionAttendanceResponse {
        records = List.copyOf(records);
    }
}
