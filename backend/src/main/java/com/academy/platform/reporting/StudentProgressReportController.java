package com.academy.platform.reporting;

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
@RequestMapping("/api/v1/reports")
public class StudentProgressReportController {

    private final StudentProgressReportService
            progressReportService;

    public StudentProgressReportController(
            StudentProgressReportService
                    progressReportService
    ) {
        this.progressReportService =
                progressReportService;
    }

    @GetMapping(
            "/students/{studentId}/progress"
    )
    @PreAuthorize(
            "hasAnyAuthority("
                    + "'reports.read', "
                    + "'guardian.reports.read'"
                    + ")"
    )
    public StudentProgressReportResponse
    getStudentProgress(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID studentId,

            @RequestParam(required = false)
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
        return progressReportService
                .generateStudentProgress(
                        currentUser,
                        studentId,
                        groupId,
                        dateFrom,
                        dateTo
                );
    }
}
