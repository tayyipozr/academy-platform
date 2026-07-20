package com.academy.platform.evaluation;

import java.time.LocalDate;
import java.util.List;
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
public class EvaluationReportingController {

    private final EvaluationReportingService
            reportingService;

    public EvaluationReportingController(
            EvaluationReportingService reportingService
    ) {
        this.reportingService = reportingService;
    }

    @GetMapping(
            "/students/{studentId}/published-evaluations"
    )
    @PreAuthorize(
            "hasAnyAuthority("
                    + "'evaluations.read', "
                    + "'guardian.reports.read'"
                    + ")"
    )
    public List<PublishedEvaluationResponse>
    findPublishedEvaluations(
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
        return reportingService.findPublishedEvaluations(
                currentUser,
                studentId,
                groupId,
                dateFrom,
                dateTo
        );
    }

    @GetMapping(
            "/students/{studentId}/development-summary"
    )
    @PreAuthorize(
            "hasAnyAuthority("
                    + "'evaluations.read', "
                    + "'guardian.reports.read'"
                    + ")"
    )
    public StudentDevelopmentSummaryResponse
    findStudentDevelopment(
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
        return reportingService.findStudentDevelopment(
                currentUser,
                studentId,
                groupId,
                dateFrom,
                dateTo
        );
    }

    @GetMapping(
            "/groups/{groupId}/performance-summary"
    )
    @PreAuthorize(
            "hasAuthority('evaluations.read')"
    )
    public GroupPerformanceSummaryResponse
    findGroupPerformance(
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
        return reportingService.findGroupPerformance(
                currentUser,
                groupId,
                dateFrom,
                dateTo
        );
    }
}
