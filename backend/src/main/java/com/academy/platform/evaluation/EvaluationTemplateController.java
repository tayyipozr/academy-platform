package com.academy.platform.evaluation;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import jakarta.validation.Valid;

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
@RequestMapping("/api/v1/evaluation-templates")
public class EvaluationTemplateController {

    private final EvaluationTemplateService templateService;
    private final EvaluationCriterionService criterionService;

    public EvaluationTemplateController(
            EvaluationTemplateService templateService,
            EvaluationCriterionService criterionService
    ) {
        this.templateService = templateService;
        this.criterionService = criterionService;
    }

    @GetMapping
    @PreAuthorize(
            "hasAuthority('evaluations.read')"
    )
    public List<EvaluationTemplateResponse> findTemplates(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @RequestParam(defaultValue = "")
            String search,

            @RequestParam(required = false)
            UUID programId,

            @RequestParam(defaultValue = "false")
            boolean includeArchived
    ) {
        return templateService.findTemplates(
                currentUser.organizationId(),
                search,
                programId,
                includeArchived
        );
    }

    @GetMapping("/{templateId}")
    @PreAuthorize(
            "hasAuthority('evaluations.read')"
    )
    public EvaluationTemplateResponse findTemplate(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID templateId
    ) {
        return templateService.findTemplate(
                currentUser.organizationId(),
                templateId
        );
    }

    @PostMapping
    @PreAuthorize(
            "hasAuthority('evaluations.manage')"
    )
    public ResponseEntity<EvaluationTemplateResponse>
    createTemplate(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @Valid
            @RequestBody
            SaveEvaluationTemplateRequest request
    ) {
        EvaluationTemplateResponse template =
                templateService.createTemplate(
                        currentUser,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/evaluation-templates/"
                                        + template.id()
                        )
                )
                .body(template);
    }

    @PutMapping("/{templateId}")
    @PreAuthorize(
            "hasAuthority('evaluations.manage')"
    )
    public EvaluationTemplateResponse updateTemplate(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID templateId,

            @Valid
            @RequestBody
            SaveEvaluationTemplateRequest request
    ) {
        return templateService.updateTemplate(
                currentUser,
                templateId,
                request
        );
    }

    @PostMapping("/{templateId}/status/{status}")
    @PreAuthorize(
            "hasAuthority('evaluations.manage')"
    )
    public ResponseEntity<Void> updateStatus(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID templateId,

            @PathVariable
            EvaluationTemplateStatus status
    ) {
        templateService.updateStatus(
                currentUser,
                templateId,
                status
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{templateId}/criteria")
    @PreAuthorize(
            "hasAuthority('evaluations.read')"
    )
    public List<EvaluationCriterionResponse>
    findCriteria(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID templateId
    ) {
        return criterionService.findCriteria(
                currentUser.organizationId(),
                templateId
        );
    }

    @PostMapping("/{templateId}/criteria")
    @PreAuthorize(
            "hasAuthority('evaluations.manage')"
    )
    public ResponseEntity<EvaluationCriterionResponse>
    createCriterion(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID templateId,

            @Valid
            @RequestBody
            SaveEvaluationCriterionRequest request
    ) {
        EvaluationCriterionResponse criterion =
                criterionService.createCriterion(
                        currentUser,
                        templateId,
                        request
                );

        return ResponseEntity
                .created(
                        URI.create(
                                "/api/v1/evaluation-templates/"
                                        + templateId
                                        + "/criteria/"
                                        + criterion.id()
                        )
                )
                .body(criterion);
    }

    @PutMapping(
            "/{templateId}/criteria/{criterionId}"
    )
    @PreAuthorize(
            "hasAuthority('evaluations.manage')"
    )
    public EvaluationCriterionResponse updateCriterion(
            @AuthenticationPrincipal
            AuthenticatedUser currentUser,

            @PathVariable
            UUID templateId,

            @PathVariable
            UUID criterionId,

            @Valid
            @RequestBody
            SaveEvaluationCriterionRequest request
    ) {
        return criterionService.updateCriterion(
                currentUser,
                templateId,
                criterionId,
                request
        );
    }
}
