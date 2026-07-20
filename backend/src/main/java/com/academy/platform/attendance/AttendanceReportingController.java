package com.academy.platform.attendance;

import java.time.LocalDate;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AttendanceReportingController {

    private final AttendanceReportingService
            reportingService;

    public AttendanceReportingController(
            AttendanceReportingService reportingService
    ) {
        this.reportingService = reportingService;
    }

    @GetMapping(
            "/students/{studentId}/attendance-history"
    )
    @PreAuthorize(
            "hasAnyAuthority("
                    + "'attendance.read', "
                    + "'guardian.linked-students.read'"
                    + ")"
    )
    public StudentAttendanceSummaryResponse
    findStudentAttendance(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID studentId,

            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate dateFrom,

            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate dateTo,

            @RequestParam(required = false)
            UUID groupId,

            @RequestParam(required = false)
            UUID termId
    ) {
        return reportingService.findStudentAttendance(
                currentUser,
                studentId,
                dateFrom,
                dateTo,
                groupId,
                termId
        );
    }

    @GetMapping(
            "/groups/{groupId}/attendance-summary"
    )
    @PreAuthorize(
            "hasAuthority('attendance.read')"
    )
    public GroupAttendanceSummaryResponse
    findGroupAttendance(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate dateFrom,

            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate dateTo
    ) {
        return reportingService.findGroupAttendance(
                currentUser,
                groupId,
                dateFrom,
                dateTo
        );
    }
}
