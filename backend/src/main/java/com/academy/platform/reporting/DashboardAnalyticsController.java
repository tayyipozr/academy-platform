package com.academy.platform.reporting;

import com.academy.platform.authentication.AuthenticatedUser;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardAnalyticsController {

    private final DashboardAnalyticsService
            dashboardService;

    public DashboardAnalyticsController(
            DashboardAnalyticsService dashboardService
    ) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('reports.read')")
    public DashboardSummaryResponse getSummary(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser
    ) {
        return dashboardService.getSummary(
                currentUser
        );
    }
}
