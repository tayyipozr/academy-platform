package com.academy.platform.scheduling;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/groups/{groupId}/schedule-rules")
public class ScheduleRuleController {

    private final ScheduleRuleService scheduleRuleService;

    public ScheduleRuleController(
            ScheduleRuleService scheduleRuleService
    ) {
        this.scheduleRuleService = scheduleRuleService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('sessions.read')")
    public List<ScheduleRuleResponse> findRules(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @RequestParam(defaultValue = "false")
            boolean includeArchived
    ) {
        return scheduleRuleService.findRules(
                currentUser.organizationId(),
                groupId,
                includeArchived
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('sessions.manage')")
    public ResponseEntity<ScheduleRuleResponse> createRule(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @Valid
            @RequestBody
            SaveScheduleRuleRequest request
    ) {
        ScheduleRuleResponse rule =
                scheduleRuleService.createRule(
                        currentUser,
                        groupId,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/groups/"
                                        + groupId
                                        + "/schedule-rules/"
                                        + rule.id()
                        )
                )
                .body(rule);
    }

    @PutMapping("/{ruleId}")
    @PreAuthorize("hasAuthority('sessions.manage')")
    public ScheduleRuleResponse updateRule(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @PathVariable
            UUID ruleId,

            @Valid
            @RequestBody
            SaveScheduleRuleRequest request
    ) {
        return scheduleRuleService.updateRule(
                currentUser,
                groupId,
                ruleId,
                request
        );
    }

    @PostMapping("/{ruleId}/status/{status}")
    @PreAuthorize("hasAuthority('sessions.manage')")
    public ResponseEntity<Void> updateStatus(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @PathVariable
            UUID ruleId,

            @PathVariable
            ScheduleRuleStatus status
    ) {
        scheduleRuleService.updateStatus(
                currentUser,
                groupId,
                ruleId,
                status
        );

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{ruleId}/generate")
    @PreAuthorize("hasAuthority('sessions.manage')")
    public SessionGenerationResponse generateSessions(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID groupId,

            @PathVariable
            UUID ruleId,

            @Valid
            @RequestBody
            GenerateSessionsRequest request
    ) {
        return scheduleRuleService.generateSessions(
                currentUser,
                groupId,
                ruleId,
                request
        );
    }
}
