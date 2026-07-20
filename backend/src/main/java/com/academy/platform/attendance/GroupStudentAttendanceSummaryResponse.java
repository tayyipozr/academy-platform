package com.academy.platform.attendance;

import java.util.UUID;

public record GroupStudentAttendanceSummaryResponse(
        UUID studentId,
        String studentNumber,
        String firstName,
        String lastName,
        int totalFinalizedSessions,
        int presentCount,
        int lateCount,
        int absentCount,
        int excusedCount,
        int attendedCount,
        int percentageDenominator,
        double attendancePercentage
) {
}
