package com.academy.platform.attendance;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record GroupAttendanceSummaryResponse(
        UUID groupId,
        String groupCode,
        String groupName,
        UUID programId,
        String programName,
        UUID termId,
        String termCode,
        String termName,
        LocalDate dateFrom,
        LocalDate dateTo,
        int finalizedSessionCount,
        int attendanceRecordCount,
        int presentCount,
        int lateCount,
        int absentCount,
        int excusedCount,
        int attendedCount,
        int percentageDenominator,
        double attendancePercentage,
        List<GroupStudentAttendanceSummaryResponse> students
) {
    public GroupAttendanceSummaryResponse {
        students = List.copyOf(students);
    }
}
