package com.academy.platform.evaluation;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/evaluations")
public class StudentEvaluationController {

    private final StudentEvaluationService evaluationService;

    public StudentEvaluationController(
            StudentEvaluationService evaluationService
    ) {
        this.evaluationService = evaluationService;
    }

    @GetMapping
    @PreAuthorize(
            "hasAuthority('evaluations.read')"
    )
    public List<StudentEvaluationSummaryResponse>
    findEvaluations(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(required = false)
            UUID studentId,

            @RequestParam(required = false)
            UUID groupId,

            @RequestParam(required = false)
            UUID sessionId,

            @RequestParam(required = false)
            StudentEvaluationStatus status,

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
        return evaluationService.findEvaluations(
                currentUser,
                studentId,
                groupId,
                sessionId,
                status,
                dateFrom,
                dateTo
        );
    }

    @GetMapping("/{evaluationId}")
    @PreAuthorize(
            "hasAuthority('evaluations.read')"
    )
    public StudentEvaluationResponse findEvaluation(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID evaluationId
    ) {
        return evaluationService.findEvaluation(
                currentUser,
                evaluationId
        );
    }

    @PostMapping
    @PreAuthorize(
            "hasAuthority('evaluations.manage')"
    )
    public ResponseEntity<StudentEvaluationResponse>
    createEvaluation(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            SaveStudentEvaluationRequest request
    ) {
        StudentEvaluationResponse evaluation =
                evaluationService.createEvaluation(
                        currentUser,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/evaluations/"
                                        + evaluation.id()
                        )
                )
                .body(evaluation);
    }

    @PutMapping("/{evaluationId}")
    @PreAuthorize(
            "hasAuthority('evaluations.manage')"
    )
    public StudentEvaluationResponse updateEvaluation(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID evaluationId,

            @Valid
            @RequestBody
            SaveStudentEvaluationRequest request
    ) {
        return evaluationService.updateEvaluation(
                currentUser,
                evaluationId,
                request
        );
    }

    @PostMapping("/{evaluationId}/submit")
    @PreAuthorize(
            "hasAuthority('evaluations.manage')"
    )
    public StudentEvaluationResponse submitEvaluation(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID evaluationId
    ) {
        return evaluationService.submitEvaluation(
                currentUser,
                evaluationId
        );
    }
}
