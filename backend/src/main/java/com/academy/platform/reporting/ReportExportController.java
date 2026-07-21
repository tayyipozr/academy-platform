package com.academy.platform.reporting;

import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/report-exports")
public class ReportExportController {

    private final ReportExportService reportExportService;

    public ReportExportController(
            ReportExportService reportExportService
    ) {
        this.reportExportService =
                reportExportService;
    }

    @PostMapping("/student-progress")
    @PreAuthorize(
            "hasAuthority('reports.export')"
    )
    public ReportExportResponse requestProgressReport(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            CreateStudentProgressExportRequest request
    ) {
        return reportExportService
                .requestStudentProgress(
                        currentUser,
                        request
                );
    }

    @GetMapping
    @PreAuthorize(
            "hasAuthority('reports.export')"
    )
    public List<ReportExportResponse> findExports(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(required = false)
            UUID studentId,

            @RequestParam(required = false)
            ReportExportStatus status
    ) {
        return reportExportService.findExports(
                currentUser,
                studentId,
                status
        );
    }

    @GetMapping("/{exportId}")
    @PreAuthorize(
            "hasAuthority('reports.export')"
    )
    public ReportExportResponse findExport(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID exportId
    ) {
        return reportExportService.findExport(
                currentUser,
                exportId
        );
    }

    @PostMapping("/{exportId}/regenerate")
    @PreAuthorize(
            "hasAuthority('reports.export')"
    )
    public ReportExportResponse regenerate(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID exportId
    ) {
        return reportExportService.regenerate(
                currentUser,
                exportId
        );
    }

    @GetMapping("/{exportId}/download")
    @PreAuthorize(
            "hasAuthority('reports.export')"
    )
    public ReportDownloadResponse download(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID exportId
    ) {
        return reportExportService.createDownload(
                currentUser,
                exportId
        );
    }
}
