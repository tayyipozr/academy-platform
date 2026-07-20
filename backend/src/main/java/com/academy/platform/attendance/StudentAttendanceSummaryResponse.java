package com.academy.platform.attendance;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record StudentAttendanceSummaryResponse(
        UUID studentId,
        String studentNumber,
        String firstName,
        String lastName,
        LocalDate dateFrom,
        LocalDate dateTo,
        UUID groupId,
        UUID termId,
        int totalFinalizedSessions,
        int presentCount,
        int lateCount,
        int absentCount,
        int excusedCount,
        int attendedCount,
        int percentageDenominator,
        double attendancePercentage,
        List<StudentAttendanceItemResponse> records
) {
    public StudentAttendanceSummaryResponse {
        records = List.copyOf(records);
    }
}
